// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function init(packageAddress: string) {
	function encoded_blob_length(options: {
		arguments: [
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = ['u64', 'u8', 'u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'encoding',
				function: 'encoded_blob_length',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { encoded_blob_length };
}
