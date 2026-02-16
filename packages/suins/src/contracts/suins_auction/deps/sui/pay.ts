/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** This module provides handy functionality for wallets and `sui::Coin` management. */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface KeepArguments {
	c: RawTransactionArgument<string>;
}
export interface KeepOptions {
	package: string;
	arguments: KeepArguments | [c: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Transfer `c` to the sender of the current transaction */
export function keep(options: KeepOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['c'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pay',
			function: 'keep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SplitArguments {
	coin: RawTransactionArgument<string>;
	splitAmount: RawTransactionArgument<number | bigint>;
}
export interface SplitOptions {
	package: string;
	arguments:
		| SplitArguments
		| [coin: RawTransactionArgument<string>, splitAmount: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Split `coin` to two coins, one with balance `split_amount`, and the remaining
 * balance is left in `coin`.
 */
export function split(options: SplitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['coin', 'splitAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pay',
			function: 'split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SplitVecArguments {
	self: RawTransactionArgument<string>;
	splitAmounts: RawTransactionArgument<number | bigint[]>;
}
export interface SplitVecOptions {
	package: string;
	arguments:
		| SplitVecArguments
		| [
				self: RawTransactionArgument<string>,
				splitAmounts: RawTransactionArgument<number | bigint[]>,
		  ];
	typeArguments: [string];
}
/**
 * Split coin `self` into multiple coins, each with balance specified in
 * `split_amounts`. Remaining balance is left in `self`.
 */
export function splitVec(options: SplitVecOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'vector<u64>'] satisfies (string | null)[];
	const parameterNames = ['self', 'splitAmounts'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pay',
			function: 'split_vec',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SplitAndTransferArguments {
	c: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	recipient: RawTransactionArgument<string>;
}
export interface SplitAndTransferOptions {
	package: string;
	arguments:
		| SplitAndTransferArguments
		| [
				c: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				recipient: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Send `amount` units of `c` to `recipient` Aborts with `sui::balance::ENotEnough`
 * if `amount` is greater than the balance in `c`
 */
export function splitAndTransfer(options: SplitAndTransferOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64', 'address'] satisfies (string | null)[];
	const parameterNames = ['c', 'amount', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pay',
			function: 'split_and_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DivideAndKeepArguments {
	self: RawTransactionArgument<string>;
	n: RawTransactionArgument<number | bigint>;
}
export interface DivideAndKeepOptions {
	package: string;
	arguments:
		| DivideAndKeepArguments
		| [self: RawTransactionArgument<string>, n: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Divide coin `self` into `n - 1` coins with equal balances. If the balance is not
 * evenly divisible by `n`, the remainder is left in `self`.
 */
export function divideAndKeep(options: DivideAndKeepOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'n'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pay',
			function: 'divide_and_keep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface JoinArguments {
	self: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface JoinOptions {
	package: string;
	arguments:
		| JoinArguments
		| [self: RawTransactionArgument<string>, coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Join `coin` into `self`. Re-exports `coin::join` function. Deprecated: you
 * should call `coin.join(other)` directly.
 */
export function join(options: JoinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pay',
			function: 'join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface JoinVecArguments {
	self: RawTransactionArgument<string>;
	coins: RawTransactionArgument<string[]>;
}
export interface JoinVecOptions {
	package: string;
	arguments:
		| JoinVecArguments
		| [self: RawTransactionArgument<string>, coins: RawTransactionArgument<string[]>];
	typeArguments: [string];
}
/** Join everything in `coins` with `self` */
export function joinVec(options: JoinVecOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['self', 'coins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pay',
			function: 'join_vec',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface JoinVecAndTransferArguments {
	coins: RawTransactionArgument<string[]>;
	receiver: RawTransactionArgument<string>;
}
export interface JoinVecAndTransferOptions {
	package: string;
	arguments:
		| JoinVecAndTransferArguments
		| [coins: RawTransactionArgument<string[]>, receiver: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Join a vector of `Coin` into a single object and transfer it to `receiver`. */
export function joinVecAndTransfer(options: JoinVecAndTransferOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<null>', 'address'] satisfies (string | null)[];
	const parameterNames = ['coins', 'receiver'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pay',
			function: 'join_vec_and_transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
