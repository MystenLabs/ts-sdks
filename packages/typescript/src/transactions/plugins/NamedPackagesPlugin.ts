// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line import/no-cycle
import { SuiClient } from '../../client/client.js';
import { parseStructTag } from '../../utils/sui-types.js';
import type { BuildTransactionOptions } from '../resolve.js';
import type { TransactionDataBuilder } from '../TransactionData.js';
import type { NamedPackagesPluginCache } from './utils.js';
import { findNamesInTransaction, replaceNames } from './utils.js';

export type NamedPackagesPluginOptions = {
	/**
	 * The URL of the MVR API to use for resolving names.
	 */
	url?: string;
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
	pageSize,
	overrides = { packages: {}, types: {} },
}: NamedPackagesPluginOptions = {}) => {
	// validate that types are first-level only.
	Object.keys(overrides.types).forEach((type) => {
		if (parseStructTag(type).typeParams.length > 0)
			throw new Error(
				'Type overrides must be first-level only. If you want to supply generic types, just pass each type individually.',
			);
	});

	return async (
		transactionData: TransactionDataBuilder,
		buildOptions: BuildTransactionOptions,
		next: () => Promise<void>,
	) => {
		const names = findNamesInTransaction(transactionData);

		if (names.types.length === 0 && names.packages.length === 0) {
			return next();
		}

		const client = getClient(buildOptions, { url, pageSize });

		const resolved = await client.core.resolveMvrNames({
			types: names.types,
			packages: names.packages,
			url,
			overrides,
		});

		// when replacing names, we also need to replace the "composed" types collected above.
		replaceNames(transactionData, resolved);

		await next();
	};
};

function getClient(options: BuildTransactionOptions, pluginOptions: NamedPackagesPluginOptions) {
	if (!options.client) {
		if (pluginOptions.url) {
			// Return a client that can only be used for resolving mvr names
			// This is a fallback hack for users manually using the mvr plugin rather than configuring mvr through their client
			return new SuiClient({
				url: '',
				mvr: {
					apiUrl: pluginOptions.url,
					pageSize: pluginOptions.pageSize,
				},
			});
		}
		throw new Error(
			`No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`,
		);
	}

	return options.client;
}
