// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parseStructTag } from '../../utils/sui-types.js';
import type { BuildTransactionOptions } from '../resolve.js';
import type { TransactionDataBuilder } from '../TransactionData.js';
import type { NamedPackagesPluginCache } from './utils.js';
import {
	batch,
	findNamesInTransaction,
	getFirstLevelNamedTypes,
	populateNamedTypesFromCache,
	replaceNames,
} from './utils.js';

export type NamedPackagesPluginOptions = {
	/**
	 * The URL of the MVR API to use for resolving names.
	 */
	url: string;
	/**
	 * The number of names to resolve in each batch request.
	 * Needs to be calculated based on the GraphQL query limits.
	 */
	pageSize?: number;
	/**
	 * Local overrides for the resolution plugin. Pass this to pre-populate
	 * the cache with known packages / types (especially useful for local or CI testing).
	 *
	 * The type cache expects ONLY first-level types to ensure the cache is more composable.
	 *
	 * 	Expected format example:
	 *  {
	 * 		packages: {
	 * 			'@framework/std': '0x1234',
	 * 		},
	 * 		types: {
	 * 			'@framework/std::string::String': '0x1234::string::String',
	 * 		},
	 * 	}
	 *
	 */
	overrides?: NamedPackagesPluginCache;
};

/**
 * @experimental This plugin is in experimental phase and there might be breaking changes in the future
 *
 * Adds named resolution so that you can use .move names in your transactions.
 * e.g. `@org/app::type::Type` will be resolved to `0x1234::type::Type`.
 * This plugin will resolve all names & types in the transaction block.
 *
 * To install this plugin globally in your app, use:
 * ```
 * Transaction.registerGlobalSerializationPlugin("namedPackagesPlugin", namedPackagesPlugin({ suiGraphQLClient }));
 * ```
 *
 * You can also define `overrides` to pre-populate name resolutions locally (removes the GraphQL request).
 */
export const namedPackagesPlugin = ({
	url,
	pageSize = 50,
	overrides = { packages: {}, types: {} },
}: NamedPackagesPluginOptions) => {
	// validate that types are first-level only.
	Object.keys(overrides.types).forEach((type) => {
		if (parseStructTag(type).typeParams.length > 0)
			throw new Error(
				'Type overrides must be first-level only. If you want to supply generic types, just pass each type individually.',
			);
	});

	const cache = overrides;

	return async (
		transactionData: TransactionDataBuilder,
		_buildOptions: BuildTransactionOptions,
		next: () => Promise<void>,
	) => {
		const names = findNamesInTransaction(transactionData);

		const [packages, types] = await Promise.all([
			resolvePackages(
				names.packages.filter((x) => !cache.packages[x]),
				url,
				pageSize,
			),
			resolveTypes(
				[...getFirstLevelNamedTypes(names.types)].filter((x) => !cache.types[x]),
				url,
				pageSize,
			),
		]);

		// save first-level mappings to cache.
		Object.assign(cache.packages, packages);
		Object.assign(cache.types, types);

		const composedTypes = populateNamedTypesFromCache(names.types, cache.types);

		// when replacing names, we also need to replace the "composed" types collected above.
		replaceNames(transactionData, {
			packages: { ...cache.packages },
			// we include the "composed" type cache too.
			types: composedTypes,
		});

		await next();
	};

	async function resolvePackages(packages: string[], apiUrl: string, pageSize: number) {
		if (packages.length === 0) return {};

		const batches = batch(packages, pageSize);
		const results: Record<string, string> = {};

		await Promise.all(
			batches.map(async (batch) => {
				const response = await fetch(`${apiUrl}/v1/resolution/bulk`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						names: batch,
					}),
				});

				if (!response.ok) {
					const errorBody = await response.json().catch(() => ({}));
					throw new Error(`Failed to resolve packages: ${errorBody?.message}`);
				}

				const data = await response.json();

				if (!data?.resolution) return;

				for (const pkg of Object.keys(data?.resolution)) {
					const pkgData = data.resolution[pkg]?.package_id;

					if (!pkgData) continue;

					results[pkg] = pkgData;
				}
			}),
		);

		return results;
	}

	async function resolveTypes(types: string[], apiUrl: string, pageSize: number) {
		if (types.length === 0) return {};

		const batches = batch(types, pageSize);
		const results: Record<string, string> = {};

		await Promise.all(
			batches.map(async (batch) => {
				const response = await fetch(`${apiUrl}/v1/struct-definition/bulk`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						types: batch,
					}),
				});

				if (!response.ok) {
					const errorBody = await response.json().catch(() => ({}));
					throw new Error(`Failed to resolve types: ${errorBody?.message}`);
				}

				const data = await response.json();

				if (!data?.resolution) return;

				for (const type of Object.keys(data?.resolution)) {
					const typeData = data.resolution[type]?.type_tag;
					if (!typeData) continue;

					results[type] = typeData;
				}
			}),
		);

		return results;
	}
};
