// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function init(packageAddress: string) {
	function encoded_blob_length(options: {
		arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = ['u64', 'u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'redstuff',
				function: 'encoded_blob_length',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function source_symbols_primary(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'redstuff',
				function: 'source_symbols_primary',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function source_symbols_secondary(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'redstuff',
				function: 'source_symbols_secondary',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function n_source_symbols(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'redstuff',
				function: 'n_source_symbols',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function symbol_size(options: {
		arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = ['u64', 'u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'redstuff',
				function: 'symbol_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function metadata_size(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'redstuff',
				function: 'metadata_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function decoding_safety_limit(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'redstuff',
				function: 'decoding_safety_limit',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function max_byzantine(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'redstuff',
				function: 'max_byzantine',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		encoded_blob_length,
		source_symbols_primary,
		source_symbols_secondary,
		n_source_symbols,
		symbol_size,
		metadata_size,
		decoding_safety_limit,
		max_byzantine,
	};
}
