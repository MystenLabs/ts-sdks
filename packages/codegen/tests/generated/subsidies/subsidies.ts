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
/** Creates a new `Subsidies` object and an `AdminCap`. */
export function _new(options: {
	package?: string;
	arguments:
		| [packageId: RawTransactionArgument<string>]
		| {
				packageId: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
	] satisfies string[];
	const parameterNames = ['packageId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Creates a new `Subsidies` object with initial rates and funds and an `AdminCap`. */
export function new_with_initial_rates_and_funds(options: {
	package?: string;
	arguments:
		| [
				packageId: RawTransactionArgument<string>,
				initialBuyerSubsidyRate: RawTransactionArgument<number>,
				initialSystemSubsidyRate: RawTransactionArgument<number>,
				initialFunds: RawTransactionArgument<string>,
		  ]
		| {
				packageId: RawTransactionArgument<string>;
				initialBuyerSubsidyRate: RawTransactionArgument<number>;
				initialSystemSubsidyRate: RawTransactionArgument<number>;
				initialFunds: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		'u16',
		'u16',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = [
		'packageId',
		'initialBuyerSubsidyRate',
		'initialSystemSubsidyRate',
		'initialFunds',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'new_with_initial_rates_and_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Add additional funds to the subsidy pool.
 *
 * These funds will be used to provide discounts for buyers and rewards to storage
 * nodes.
 */
export function add_funds(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, funds: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				funds: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [
		`${packageAddress}::subsidies::Subsidies`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'funds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'add_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Set the subsidy rate for buyers, in basis points.
 *
 * Aborts if new_rate is greater than the max value.
 */
export function set_buyer_subsidy_rate(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				newRate: RawTransactionArgument<number>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				newRate: RawTransactionArgument<number>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [
		`${packageAddress}::subsidies::Subsidies`,
		`${packageAddress}::subsidies::AdminCap`,
		'u16',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'newRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'set_buyer_subsidy_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Set the subsidy rate for storage nodes, in basis points.
 *
 * Aborts if new_rate is greater than the max value.
 */
export function set_system_subsidy_rate(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				newRate: RawTransactionArgument<number>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				newRate: RawTransactionArgument<number>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [
		`${packageAddress}::subsidies::Subsidies`,
		`${packageAddress}::subsidies::AdminCap`,
		'u16',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'newRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'set_system_subsidy_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Extends a blob's lifetime and applies the buyer and storage node subsidies.
 *
 * It first extends the blob lifetime using system `extend_blob` method. Then it
 * applies the subsidies and deducts the funds from the subsidy pool.
 */
export function extend_blob(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				system: RawTransactionArgument<string>,
				blob: RawTransactionArgument<string>,
				epochsAhead: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				system: RawTransactionArgument<string>;
				blob: RawTransactionArgument<string>;
				epochsAhead: RawTransactionArgument<number>;
				payment: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [
		`${packageAddress}::subsidies::Subsidies`,
		`${packageAddress}::system::System`,
		`${packageAddress}::blob::Blob`,
		'u32',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'system', 'blob', 'epochsAhead', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'extend_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Reserves storage space and applies the buyer and storage node subsidies.
 *
 * It first reserves the space using system `reserve_space` method. Then it applies
 * the subsidies and deducts the funds from the subsidy pool.
 */
export function reserve_space(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				system: RawTransactionArgument<string>,
				storageAmount: RawTransactionArgument<number | bigint>,
				epochsAhead: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				system: RawTransactionArgument<string>;
				storageAmount: RawTransactionArgument<number | bigint>;
				epochsAhead: RawTransactionArgument<number>;
				payment: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [
		`${packageAddress}::subsidies::Subsidies`,
		`${packageAddress}::system::System`,
		'u64',
		'u32',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'system', 'storageAmount', 'epochsAhead', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'reserve_space',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function admin_cap_subsidies_id(options: {
	package?: string;
	arguments:
		| [adminCap: RawTransactionArgument<string>]
		| {
				adminCap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [`${packageAddress}::subsidies::AdminCap`] satisfies string[];
	const parameterNames = ['adminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'admin_cap_subsidies_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the current value of the subsidy pool. */
export function subsidy_pool_value(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'subsidy_pool_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the current rate for buyer subsidies. */
export function buyer_subsidy_rate(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'buyer_subsidy_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the current rate for storage node subsidies. */
export function system_subsidy_rate(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus_subsidies';
	const argumentsTypes = [`${packageAddress}::subsidies::Subsidies`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'subsidies',
			function: 'system_subsidy_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
