/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A storable handler for Balances in general. Is used in the `Coin` module to
 * allow balance operations and can be used to implement custom coins with `Supply`
 * and `Balance`s.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::balance';
export const Supply = new MoveStruct({
	name: `${$moduleName}::Supply<phantom T>`,
	fields: {
		value: bcs.u64(),
	},
});
export const Balance = new MoveStruct({
	name: `${$moduleName}::Balance<phantom T>`,
	fields: {
		value: bcs.u64(),
	},
});
export interface ValueArguments {
	self: RawTransactionArgument<string>;
}
export interface ValueOptions {
	package: string;
	arguments: ValueArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the amount stored in a `Balance`. */
export function value(options: ValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SupplyValueArguments {
	supply: RawTransactionArgument<string>;
}
export interface SupplyValueOptions {
	package: string;
	arguments: SupplyValueArguments | [supply: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the `Supply` value. */
export function supplyValue(options: SupplyValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['supply'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'supply_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateSupplyArguments<T extends BcsType<any>> {
	_: RawTransactionArgument<T>;
}
export interface CreateSupplyOptions<T extends BcsType<any>> {
	package: string;
	arguments: CreateSupplyArguments<T> | [_: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Create a new supply for type T. */
export function createSupply<T extends BcsType<any>>(options: CreateSupplyOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'create_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IncreaseSupplyArguments {
	self: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface IncreaseSupplyOptions {
	package: string;
	arguments:
		| IncreaseSupplyArguments
		| [self: RawTransactionArgument<string>, value: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/** Increase supply by `value` and create a new `Balance<T>` with this value. */
export function increaseSupply(options: IncreaseSupplyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'increase_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DecreaseSupplyArguments {
	self: RawTransactionArgument<string>;
	balance: RawTransactionArgument<string>;
}
export interface DecreaseSupplyOptions {
	package: string;
	arguments:
		| DecreaseSupplyArguments
		| [self: RawTransactionArgument<string>, balance: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Burn a Balance<T> and decrease Supply<T>. */
export function decreaseSupply(options: DecreaseSupplyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'balance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'decrease_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ZeroOptions {
	package: string;
	arguments?: [];
	typeArguments: [string];
}
/** Create a zero `Balance` for type `T`. */
export function zero(options: ZeroOptions) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'zero',
			typeArguments: options.typeArguments,
		});
}
export interface JoinArguments {
	self: RawTransactionArgument<string>;
	balance: RawTransactionArgument<string>;
}
export interface JoinOptions {
	package: string;
	arguments:
		| JoinArguments
		| [self: RawTransactionArgument<string>, balance: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Join two balances together. */
export function join(options: JoinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'balance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'join',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SplitArguments {
	self: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SplitOptions {
	package: string;
	arguments:
		| SplitArguments
		| [self: RawTransactionArgument<string>, value: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/** Split a `Balance` and take a sub balance from it. */
export function split(options: SplitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'split',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawAllArguments {
	self: RawTransactionArgument<string>;
}
export interface WithdrawAllOptions {
	package: string;
	arguments: WithdrawAllArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Withdraw all balance. After this the remaining balance must be 0. */
export function withdrawAll(options: WithdrawAllOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'withdraw_all',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyZeroArguments {
	balance: RawTransactionArgument<string>;
}
export interface DestroyZeroOptions {
	package: string;
	arguments: DestroyZeroArguments | [balance: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Destroy a zero `Balance`. */
export function destroyZero(options: DestroyZeroOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['balance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'destroy_zero',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SendFundsArguments {
	balance: RawTransactionArgument<string>;
	recipient: RawTransactionArgument<string>;
}
export interface SendFundsOptions {
	package: string;
	arguments:
		| SendFundsArguments
		| [balance: RawTransactionArgument<string>, recipient: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Send a `Balance` to an address's funds accumulator. */
export function sendFunds(options: SendFundsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['balance', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'send_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RedeemFundsArguments {
	withdrawal: RawTransactionArgument<string>;
}
export interface RedeemFundsOptions {
	package: string;
	arguments: RedeemFundsArguments | [withdrawal: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Redeem a `Withdrawal<Balance<T>>` to get the underlying `Balance<T>` from an
 * address's funds accumulator.
 */
export function redeemFunds(options: RedeemFundsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['withdrawal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance',
			function: 'redeem_funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
