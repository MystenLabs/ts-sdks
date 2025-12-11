// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { findNamesInTransaction, replaceNames } from '../../client/mvr.js';
import type { BuildTransactionOptions } from '../resolve.js';
import type { TransactionDataBuilder } from '../TransactionData.js';

/**
 * Internal plugin that automatically resolves MVR names in transactions.
 * This plugin is automatically added to all transactions and uses the client's
 * MVR resolver to convert .move names to on-chain addresses.
 */
export function namedPackagesPlugin() {
	return async (
		transactionData: TransactionDataBuilder,
		buildOptions: BuildTransactionOptions,
		next: () => Promise<void>,
	) => {
		const names = findNamesInTransaction(transactionData);

		if (names.types.length === 0 && names.packages.length === 0) {
			return next();
		}

		if (!buildOptions.client) {
			throw new Error(
				`Transaction contains MVR names but no client was provided to resolve them. Please pass a client to Transaction#build()`,
			);
		}

		const resolved = await buildOptions.client.core.mvr.resolve({
			types: names.types,
			packages: names.packages,
		});

		replaceNames(transactionData, resolved);

		await next();
	};
}
