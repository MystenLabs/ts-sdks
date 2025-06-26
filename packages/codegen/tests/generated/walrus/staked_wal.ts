/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module: `staked_wal`
 *
 * Implements the `StakedWal` functionality - a staked WAL is an object that
 * represents a staked amount of WALs in a staking pool. It is created in the
 * `staking_pool` on staking and can be split, joined, and burned. The burning is
 * performed via the `withdraw_stake` method in the `staking_pool`.
 */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as balance from './deps/sui/balance.js';
export function StakedWal() {
	return bcs.struct('StakedWal', {
		id: object.UID(),
		/** Whether the staked WAL is active or withdrawing. */
		state: StakedWalState(),
		/** ID of the staking pool. */
		node_id: bcs.Address,
		/** The staked amount. */
		principal: balance.Balance(),
		/** The Walrus epoch when the staked WAL was activated. */
		activation_epoch: bcs.u32(),
	});
}
/**
 * The state of the staked WAL. It can be either `Staked` or `Withdrawing`. The
 * `Withdrawing` state contains the epoch when the staked WAL can be withdrawn.
 */
export function StakedWalState() {
	return bcs.enum('StakedWalState', {
		Staked: null,
		Withdrawing: bcs.struct('StakedWalState.Withdrawing', {
			withdraw_epoch: bcs.u32(),
		}),
	});
}
/** Returns the `node_id` of the staked WAL. */
export function node_id(options: {
	package?: string;
	arguments:
		| [sw: RawTransactionArgument<string>]
		| {
				sw: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
	const parameterNames = ['sw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staked_wal',
			function: 'node_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Returns the `principal` of the staked WAL. Called `value` to be consistent with
 * `Coin`.
 */
export function value(options: {
	package?: string;
	arguments:
		| [sw: RawTransactionArgument<string>]
		| {
				sw: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
	const parameterNames = ['sw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staked_wal',
			function: 'value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the `activation_epoch` of the staked WAL. */
export function activation_epoch(options: {
	package?: string;
	arguments:
		| [sw: RawTransactionArgument<string>]
		| {
				sw: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
	const parameterNames = ['sw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staked_wal',
			function: 'activation_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns true if the staked WAL is in the `Staked` state. */
export function is_staked(options: {
	package?: string;
	arguments:
		| [sw: RawTransactionArgument<string>]
		| {
				sw: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
	const parameterNames = ['sw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staked_wal',
			function: 'is_staked',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Checks whether the staked WAL is in the `Withdrawing` state. */
export function is_withdrawing(options: {
	package?: string;
	arguments:
		| [sw: RawTransactionArgument<string>]
		| {
				sw: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
	const parameterNames = ['sw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staked_wal',
			function: 'is_withdrawing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Returns the `withdraw_epoch` of the staked WAL if it is in the `Withdrawing`.
 * Aborts otherwise.
 */
export function withdraw_epoch(options: {
	package?: string;
	arguments:
		| [sw: RawTransactionArgument<string>]
		| {
				sw: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
	const parameterNames = ['sw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staked_wal',
			function: 'withdraw_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Joins the staked WAL with another staked WAL, adding the `principal` of the
 * `other` staked WAL to the current staked WAL.
 *
 * Aborts if the `node_id` or `activation_epoch` of the staked WALs do not match.
 */
export function join(options: {
	package?: string;
	arguments:
		| [sw: RawTransactionArgument<string>, other: RawTransactionArgument<string>]
		| {
				sw: RawTransactionArgument<string>;
				other: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staked_wal::StakedWal`,
		`${packageAddress}::staked_wal::StakedWal`,
	] satisfies string[];
	const parameterNames = ['sw', 'other'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staked_wal',
			function: 'join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Splits the staked WAL into two parts, one with the `amount` and the other with
 * the remaining `principal`. The `node_id`, `activation_epoch` are the same for
 * both the staked WALs.
 *
 * Aborts if the `amount` is greater than the `principal` of the staked WAL. Aborts
 * if the `amount` is zero.
 */
export function split(options: {
	package?: string;
	arguments:
		| [sw: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>]
		| {
				sw: RawTransactionArgument<string>;
				amount: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`, 'u64'] satisfies string[];
	const parameterNames = ['sw', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staked_wal',
			function: 'split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
