/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module: `subsidies`
 *
 * Module to manage a shared subsidy pool, allowing for discounted storage costs
 * for buyers and contributing to a subsidy for storage nodes. It provides
 * functionality to:
 *
 * - Add funds to the shared subsidy pool.
 * - Set subsidy rates for buyers and storage nodes.
 * - Apply subsidies when reserving storage or extending blob lifetimes.
 */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as balance from './deps/sui/balance.js';
export function AdminCap() {
	return bcs.struct('AdminCap', {
		id: object.UID(),
		subsidies_id: bcs.Address,
	});
}
export function Subsidies() {
	return bcs.struct('Subsidies', {
		id: object.UID(),
		/**
		 * The subsidy rate applied to the buyer at the moment of storage purchase in basis
		 * points.
		 */
		buyer_subsidy_rate: bcs.u16(),
		/**
		 * The subsidy rate applied to the storage node when buying storage in basis
		 * points.
		 */
		system_subsidy_rate: bcs.u16(),
		/** The balance of funds available in the subsidy pool. */
		subsidy_pool: balance.Balance(),
		/** Package ID of the subsidies contract. */
		package_id: bcs.Address,
		/** The version of the subsidies contract. */
		version: bcs.u64(),
	});
}
export function init(packageAddress: string) {
	/** Creates a new `Subsidies` object and an `AdminCap`. */
	function _new(options: { arguments: [package_id: RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Creates a new `Subsidies` object with initial rates and funds and an `AdminCap`. */
	function new_with_initial_rates_and_funds(options: {
		arguments: [
			package_id: RawTransactionArgument<string>,
			initial_buyer_subsidy_rate: RawTransactionArgument<number>,
			initial_system_subsidy_rate: RawTransactionArgument<number>,
			initial_funds: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'u16',
			'u16',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'new_with_initial_rates_and_funds',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Add additional funds to the subsidy pool.
	 *
	 * These funds will be used to provide discounts for buyers and rewards to storage
	 * nodes.
	 */
	function add_funds(options: {
		arguments: [self: RawTransactionArgument<string>, funds: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'add_funds',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Set the subsidy rate for buyers, in basis points.
	 *
	 * Aborts if new_rate is greater than the max value.
	 */
	function set_buyer_subsidy_rate(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			new_rate: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::subsidies::AdminCap`,
			'u16',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'set_buyer_subsidy_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Set the subsidy rate for storage nodes, in basis points.
	 *
	 * Aborts if new_rate is greater than the max value.
	 */
	function set_system_subsidy_rate(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			new_rate: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::subsidies::AdminCap`,
			'u16',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'set_system_subsidy_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Extends a blob's lifetime and applies the buyer and storage node subsidies.
	 *
	 * It first extends the blob lifetime using system `extend_blob` method. Then it
	 * applies the subsidies and deducts the funds from the subsidy pool.
	 */
	function extend_blob(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			system: RawTransactionArgument<string>,
			blob: RawTransactionArgument<string>,
			epochs_ahead: RawTransactionArgument<number>,
			payment: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'extend_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Reserves storage space and applies the buyer and storage node subsidies.
	 *
	 * It first reserves the space using system `reserve_space` method. Then it applies
	 * the subsidies and deducts the funds from the subsidy pool.
	 */
	function reserve_space(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			system: RawTransactionArgument<string>,
			storage_amount: RawTransactionArgument<number | bigint>,
			epochs_ahead: RawTransactionArgument<number>,
			payment: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::subsidies::Subsidies`,
			`${packageAddress}::system::System`,
			'u64',
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'reserve_space',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function admin_cap_subsidies_id(options: {
		arguments: [admin_cap: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::subsidies::AdminCap`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'admin_cap_subsidies_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the current value of the subsidy pool. */
	function subsidy_pool_value(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'subsidy_pool_value',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the current rate for buyer subsidies. */
	function buyer_subsidy_rate(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'buyer_subsidy_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the current rate for storage node subsidies. */
	function system_subsidy_rate(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'subsidies',
				function: 'system_subsidy_rate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		_new,
		new_with_initial_rates_and_funds,
		add_funds,
		set_buyer_subsidy_rate,
		set_system_subsidy_rate,
		extend_blob,
		reserve_space,
		admin_cap_subsidies_id,
		subsidy_pool_value,
		buyer_subsidy_rate,
		system_subsidy_rate,
	};
}
