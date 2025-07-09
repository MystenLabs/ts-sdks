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
import {
	MoveStruct,
	MoveEnum,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/walrus::staked_wal';
export const StakedWal = new MoveStruct(`${$moduleName}::StakedWal`, {
	id: object.UID,
	/** Whether the staked WAL is active or withdrawing. */
	state: StakedWalState,
	/** ID of the staking pool. */
	node_id: bcs.Address,
	/** The staked amount. */
	principal: balance.Balance(),
	/** The Walrus epoch when the staked WAL was activated. */
	activation_epoch: bcs.u32(),
});
/**
 * The state of the staked WAL. It can be either `Staked` or `Withdrawing`. The
 * `Withdrawing` state contains the epoch when the staked WAL can be withdrawn.
 */
export const StakedWalState = new MoveEnum(`${$moduleName}::StakedWalState`, {
	Staked: null,
	Withdrawing: new MoveStruct(`StakedWalState.Withdrawing`, {
		withdraw_epoch: bcs.u32(),
	}),
});
export interface NodeIdArguments {
	sw: RawTransactionArgument<string>;
}
export interface NodeIdOptions {
	package?: string;
	arguments: NodeIdArguments | [sw: RawTransactionArgument<string>];
}
/** Returns the `node_id` of the staked WAL. */
export function nodeId(options: NodeIdOptions) {
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
export interface ValueArguments {
	sw: RawTransactionArgument<string>;
}
export interface ValueOptions {
	package?: string;
	arguments: ValueArguments | [sw: RawTransactionArgument<string>];
}
/**
 * Returns the `principal` of the staked WAL. Called `value` to be consistent with
 * `Coin`.
 */
export function value(options: ValueOptions) {
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
export interface ActivationEpochArguments {
	sw: RawTransactionArgument<string>;
}
export interface ActivationEpochOptions {
	package?: string;
	arguments: ActivationEpochArguments | [sw: RawTransactionArgument<string>];
}
/** Returns the `activation_epoch` of the staked WAL. */
export function activationEpoch(options: ActivationEpochOptions) {
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
export interface IsStakedArguments {
	sw: RawTransactionArgument<string>;
}
export interface IsStakedOptions {
	package?: string;
	arguments: IsStakedArguments | [sw: RawTransactionArgument<string>];
}
/** Returns true if the staked WAL is in the `Staked` state. */
export function isStaked(options: IsStakedOptions) {
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
export interface IsWithdrawingArguments {
	sw: RawTransactionArgument<string>;
}
export interface IsWithdrawingOptions {
	package?: string;
	arguments: IsWithdrawingArguments | [sw: RawTransactionArgument<string>];
}
/** Checks whether the staked WAL is in the `Withdrawing` state. */
export function isWithdrawing(options: IsWithdrawingOptions) {
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
export interface WithdrawEpochArguments {
	sw: RawTransactionArgument<string>;
}
export interface WithdrawEpochOptions {
	package?: string;
	arguments: WithdrawEpochArguments | [sw: RawTransactionArgument<string>];
}
/**
 * Returns the `withdraw_epoch` of the staked WAL if it is in the `Withdrawing`.
 * Aborts otherwise.
 */
export function withdrawEpoch(options: WithdrawEpochOptions) {
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
export interface JoinArguments {
	sw: RawTransactionArgument<string>;
	other: RawTransactionArgument<string>;
}
export interface JoinOptions {
	package?: string;
	arguments:
		| JoinArguments
		| [sw: RawTransactionArgument<string>, other: RawTransactionArgument<string>];
}
/**
 * Joins the staked WAL with another staked WAL, adding the `principal` of the
 * `other` staked WAL to the current staked WAL.
 *
 * Aborts if the `node_id` or `activation_epoch` of the staked WALs do not match.
 */
export function join(options: JoinOptions) {
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
export interface SplitArguments {
	sw: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface SplitOptions {
	package?: string;
	arguments:
		| SplitArguments
		| [sw: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>];
}
/**
 * Splits the staked WAL into two parts, one with the `amount` and the other with
 * the remaining `principal`. The `node_id`, `activation_epoch` are the same for
 * both the staked WALs.
 *
 * Aborts if the `amount` is greater than the `principal` of the staked WAL. Aborts
 * if the `amount` is zero.
 */
export function split(options: SplitOptions) {
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
