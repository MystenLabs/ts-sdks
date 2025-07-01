// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
export interface EncodedBlobLengthArguments {
	unencodedLength: RawTransactionArgument<number | bigint>;
	encodingType: RawTransactionArgument<number>;
	nShards: RawTransactionArgument<number>;
}
export interface EncodedBlobLengthOptions {
	package?: string;
	arguments:
		| EncodedBlobLengthArguments
		| [
				unencodedLength: RawTransactionArgument<number | bigint>,
				encodingType: RawTransactionArgument<number>,
				nShards: RawTransactionArgument<number>,
		  ];
}
/**
 * Computes the encoded length of a blob given its unencoded length, encoding type
 * and number of shards `n_shards`.
 */
export function encodedBlobLength(options: EncodedBlobLengthOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = ['u64', 'u8', 'u16'] satisfies string[];
	const parameterNames = ['unencodedLength', 'encodingType', 'nShards'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'encoding',
			function: 'encoded_blob_length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
