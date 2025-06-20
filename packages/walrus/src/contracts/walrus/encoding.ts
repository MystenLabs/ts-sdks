// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
export function init(packageAddress: string) {
	/**
	 * Computes the encoded length of a blob given its unencoded length, encoding type
	 * and number of shards `n_shards`.
	 */
	function encoded_blob_length(options: {
		arguments: [
			unencoded_length: RawTransactionArgument<number | bigint>,
			encoding_type: RawTransactionArgument<number>,
			n_shards: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = ['u64', 'u8', 'u16'] satisfies string[];
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
