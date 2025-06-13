// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ClientCache } from '../../experimental/cache.js';
import { MvrClient } from '../../experimental/mvr.js';
import type { BuildTransactionOptions } from '../resolve.js';
import type { TransactionDataBuilder } from '../TransactionData.js';
import { findNamesInTransaction, replaceNames } from '../../experimental/mvr.js';
import type { NamedPackagesOverrides } from '../../experimental/mvr.js';

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
	overrides?: NamedPackagesOverrides;
};

// The original versions of the mvr plugin cached lookups by mutating overrides.
// We don't want to mutate the options, but we can link our cache to the provided overrides object
// This preserves the caching across transactions while removing the mutation side effects
const cacheMap = new WeakMap<object, ClientCache>();

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
export const namedPackagesPlugin = (options?: NamedPackagesPluginOptions) => {
	let mvrClient: MvrClient | undefined;

	if (options) {
		const overrides = options.overrides ?? {
			packages: {},
			types: {},
		};

		if (!cacheMap.has(overrides)) {
			cacheMap.set(overrides, new ClientCache());
		}

		mvrClient = new MvrClient({
			cache: cacheMap.get(overrides)!,
			url: options.url,
			pageSize: options.pageSize,
			overrides: overrides,
		});
	}

	return async (
		transactionData: TransactionDataBuilder,
		buildOptions: BuildTransactionOptions,
		next: () => Promise<void>,
	) => {
		const names = findNamesInTransaction(transactionData);

		if (names.types.length === 0 && names.packages.length === 0) {
			return next();
		}

		const resolved = await (mvrClient || getClient(buildOptions).core.mvr).resolve({
			types: names.types,
			packages: names.packages,
		});

		replaceNames(transactionData, resolved);

		await next();
	};
};

export function getClient(options: BuildTransactionOptions) {
	if (!options.client) {
		throw new Error(
			`No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`,
		);
	}

	return options.client;
}
