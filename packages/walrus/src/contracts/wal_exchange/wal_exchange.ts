// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Module: wal_exchange */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as balance from './deps/sui/balance.js';
export function Exchange() {
	return bcs.struct('Exchange', {
		id: object.UID(),
		wal: balance.Balance(),
		sui: balance.Balance(),
		rate: ExchangeRate(),
		admin: bcs.Address,
	});
}
export function AdminCap() {
	return bcs.struct('AdminCap', {
		id: object.UID(),
	});
}
export function ExchangeRate() {
	return bcs.struct('ExchangeRate', {
		wal: bcs.u64(),
		sui: bcs.u64(),
	});
}
export function init(packageAddress: string) {
	/** Creates a new exchange rate, making sure it is valid. */
	function new_exchange_rate(options: {
		arguments: [
			wal: RawTransactionArgument<number | bigint>,
			sui: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = ['u64', 'u64'] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'new_exchange_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Creates a new shared exchange with a 1:1 exchange rate and returns the
	 * associated `AdminCap`.
	 */
	function _new(options: { arguments: [] }) {
		const argumentsTypes = [] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Creates a new shared exchange with a 1:1 exchange rate, funds it with WAL, and
	 * returns the associated `AdminCap`.
	 */
	function new_funded(options: {
		arguments: [
			wal: RawTransactionArgument<string>,
			amount: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'new_funded',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Adds WAL to the balance stored in the exchange. */
	function add_wal(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			wal: RawTransactionArgument<string>,
			amount: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'add_wal',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Adds SUI to the balance stored in the exchange. */
	function add_sui(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			sui: RawTransactionArgument<string>,
			amount: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'add_sui',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Adds WAL to the balance stored in the exchange. */
	function add_all_wal(options: {
		arguments: [self: RawTransactionArgument<string>, wal: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'add_all_wal',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Adds SUI to the balance stored in the exchange. */
	function add_all_sui(options: {
		arguments: [self: RawTransactionArgument<string>, sui: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'add_all_sui',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Withdraws WAL from the balance stored in the exchange. */
	function withdraw_wal(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			amount: RawTransactionArgument<number | bigint>,
			admin_cap: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			'u64',
			`${packageAddress}::wal_exchange::AdminCap`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'withdraw_wal',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Withdraws SUI from the balance stored in the exchange. */
	function withdraw_sui(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			amount: RawTransactionArgument<number | bigint>,
			admin_cap: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			'u64',
			`${packageAddress}::wal_exchange::AdminCap`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'withdraw_sui',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the exchange rate of the exchange to `wal` WAL = `sui` SUI. */
	function set_exchange_rate(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			wal: RawTransactionArgument<number | bigint>,
			sui: RawTransactionArgument<number | bigint>,
			admin_cap: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			'u64',
			'u64',
			`${packageAddress}::wal_exchange::AdminCap`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'set_exchange_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Exchanges the provided SUI coin for WAL at the exchange's rate. */
	function exchange_all_for_wal(options: {
		arguments: [self: RawTransactionArgument<string>, sui: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'exchange_all_for_wal',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Exchanges `amount_sui` out of the provided SUI coin for WAL at the exchange's
	 * rate.
	 */
	function exchange_for_wal(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			sui: RawTransactionArgument<string>,
			amount_sui: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'exchange_for_wal',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Exchanges the provided WAL coin for SUI at the exchange's rate. */
	function exchange_all_for_sui(options: {
		arguments: [self: RawTransactionArgument<string>, wal: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'exchange_all_for_sui',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Exchanges `amount_wal` out of the provided WAL coin for SUI at the exchange's
	 * rate.
	 */
	function exchange_for_sui(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			wal: RawTransactionArgument<string>,
			amount_wal: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal_exchange::Exchange`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal_exchange',
				function: 'exchange_for_sui',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		new_exchange_rate,
		_new,
		new_funded,
		add_wal,
		add_sui,
		add_all_wal,
		add_all_sui,
		withdraw_wal,
		withdraw_sui,
		set_exchange_rate,
		exchange_all_for_wal,
		exchange_for_wal,
		exchange_all_for_sui,
		exchange_for_sui,
	};
}
