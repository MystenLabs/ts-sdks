/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** A module for accumulating funds, i.e. Balance-like types. */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::funds_accumulator';
export const Withdrawal = new MoveStruct({
	name: `${$moduleName}::Withdrawal<phantom T>`,
	fields: {
		/** The owner of the funds, either an object or a transaction sender */
		owner: bcs.Address,
		/**
		 * At signing we check the limit <= balance when taking this as a call arg. If this
		 * was generated from an object, we cannot check this until redemption.
		 */
		limit: bcs.u256(),
	},
});
export interface WithdrawalOwnerArguments {
	withdrawal: RawTransactionArgument<string>;
}
export interface WithdrawalOwnerOptions {
	package: string;
	arguments: WithdrawalOwnerArguments | [withdrawal: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the owner, either a sender's address or an object, of the withdrawal. */
export function withdrawalOwner(options: WithdrawalOwnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['withdrawal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'funds_accumulator',
			function: 'withdrawal_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawalLimitArguments {
	withdrawal: RawTransactionArgument<string>;
}
export interface WithdrawalLimitOptions {
	package: string;
	arguments: WithdrawalLimitArguments | [withdrawal: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the remaining limit of the withdrawal. */
export function withdrawalLimit(options: WithdrawalLimitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['withdrawal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'funds_accumulator',
			function: 'withdrawal_limit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawalSplitArguments {
	withdrawal: RawTransactionArgument<string>;
	subLimit: RawTransactionArgument<number | bigint>;
}
export interface WithdrawalSplitOptions {
	package: string;
	arguments:
		| WithdrawalSplitArguments
		| [
				withdrawal: RawTransactionArgument<string>,
				subLimit: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Split a `Withdrawal` and take a sub-withdrawal from it with the specified
 * sub-limit.
 */
export function withdrawalSplit(options: WithdrawalSplitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['withdrawal', 'subLimit'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'funds_accumulator',
			function: 'withdrawal_split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawalJoinArguments {
	withdrawal: RawTransactionArgument<string>;
	other: RawTransactionArgument<string>;
}
export interface WithdrawalJoinOptions {
	package: string;
	arguments:
		| WithdrawalJoinArguments
		| [withdrawal: RawTransactionArgument<string>, other: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Join two withdrawals together, increasing the limit of `self` by the limit of
 * `other`. Aborts with `EOwnerMismatch` if the owners are not equal. Aborts with
 * `EOverflow` if the resulting limit would overflow `u256`.
 */
export function withdrawalJoin(options: WithdrawalJoinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['withdrawal', 'other'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'funds_accumulator',
			function: 'withdrawal_join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
