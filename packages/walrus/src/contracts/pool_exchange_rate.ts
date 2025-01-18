// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function PoolExchangeRate() {
	return bcs.enum('PoolExchangeRate', {
		Flat: null,
		Variable: bcs.tuple([bcs.u128(), bcs.u128()]),
	});
}
export function init(packageAddress: string) {
	function flat(options: { arguments: [] }) {
		const argumentsTypes: string[] = [];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'pool_exchange_rate',
				function: 'flat',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function _new(options: {
		arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = ['u64', 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'pool_exchange_rate',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function convert_to_wal_amount(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::pool_exchange_rate::PoolExchangeRate`, 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'pool_exchange_rate',
				function: 'convert_to_wal_amount',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function convert_to_share_amount(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::pool_exchange_rate::PoolExchangeRate`, 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'pool_exchange_rate',
				function: 'convert_to_share_amount',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { flat, _new, convert_to_wal_amount, convert_to_share_amount };
}
