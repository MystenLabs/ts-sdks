// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Module: `staked_wal`
 *
 * Implements the `StakedWal` functionality - a staked WAL is an object that
 * represents a staked amount of WALs in a staking pool. It is created in the
 * `staking_pool` on staking and can be split, joined, and burned. The burning is
 * performed via the `withdraw_stake` method in the `staking_pool`.
 */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
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
export function init(packageAddress: string) {
	/** Returns the `node_id` of the staked WAL. */
	function node_id(options: { arguments: [sw: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'node_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Returns the `principal` of the staked WAL. Called `value` to be consistent with
	 * `Coin`.
	 */
	function value(options: { arguments: [sw: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'value',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the `activation_epoch` of the staked WAL. */
	function activation_epoch(options: { arguments: [sw: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'activation_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns true if the staked WAL is in the `Staked` state. */
	function is_staked(options: { arguments: [sw: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'is_staked',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Checks whether the staked WAL is in the `Withdrawing` state. */
	function is_withdrawing(options: { arguments: [sw: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'is_withdrawing',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Returns the `withdraw_epoch` of the staked WAL if it is in the `Withdrawing`.
	 * Aborts otherwise.
	 */
	function withdraw_epoch(options: { arguments: [sw: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'withdraw_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Joins the staked WAL with another staked WAL, adding the `principal` of the
	 * `other` staked WAL to the current staked WAL.
	 *
	 * Aborts if the `node_id` or `activation_epoch` of the staked WALs do not match.
	 */
	function join(options: {
		arguments: [sw: RawTransactionArgument<string>, other: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staked_wal::StakedWal`,
			`${packageAddress}::staked_wal::StakedWal`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'join',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
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
	function split(options: {
		arguments: [
			sw: RawTransactionArgument<string>,
			amount: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [`${packageAddress}::staked_wal::StakedWal`, 'u64'] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staked_wal',
				function: 'split',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		node_id,
		value,
		activation_epoch,
		is_staked,
		is_withdrawing,
		withdraw_epoch,
		join,
		split,
	};
}
