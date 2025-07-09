/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: wal_exchange */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/wal_exchange::wal_exchange';
export const Exchange = new MoveStruct(`${$moduleName}::Exchange`, {
	id: object.UID,
	wal: balance.Balance(),
	sui: balance.Balance(),
	rate: ExchangeRate,
	admin: bcs.Address,
});
export const AdminCap = new MoveStruct(`${$moduleName}::AdminCap`, {
	id: object.UID,
});
export const ExchangeRate = new MoveStruct(`${$moduleName}::ExchangeRate`, {
	wal: bcs.u64(),
	sui: bcs.u64(),
});
export interface NewExchangeRateArguments {
	wal: RawTransactionArgument<number | bigint>;
	sui: RawTransactionArgument<number | bigint>;
}
export interface NewExchangeRateOptions {
	package?: string;
	arguments:
		| NewExchangeRateArguments
		| [wal: RawTransactionArgument<number | bigint>, sui: RawTransactionArgument<number | bigint>];
}
/** Creates a new exchange rate, making sure it is valid. */
export function newExchangeRate(options: NewExchangeRateOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = ['u64', 'u64'] satisfies string[];
	const parameterNames = ['wal', 'sui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'new_exchange_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewOptions {
	package?: string;
	arguments?: [];
}
/**
 * Creates a new shared exchange with a 1:1 exchange rate and returns the
 * associated `AdminCap`.
 */
export function _new(options: NewOptions = {}) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'new',
		});
}
export interface NewFundedArguments {
	wal: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface NewFundedOptions {
	package?: string;
	arguments:
		| NewFundedArguments
		| [wal: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>];
}
/**
 * Creates a new shared exchange with a 1:1 exchange rate, funds it with WAL, and
 * returns the associated `AdminCap`.
 */
export function newFunded(options: NewFundedOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['wal', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'new_funded',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddWalArguments {
	self: RawTransactionArgument<string>;
	wal: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface AddWalOptions {
	package?: string;
	arguments:
		| AddWalArguments
		| [
				self: RawTransactionArgument<string>,
				wal: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ];
}
/** Adds WAL to the balance stored in the exchange. */
export function addWal(options: AddWalOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'wal', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'add_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddSuiArguments {
	self: RawTransactionArgument<string>;
	sui: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface AddSuiOptions {
	package?: string;
	arguments:
		| AddSuiArguments
		| [
				self: RawTransactionArgument<string>,
				sui: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ];
}
/** Adds SUI to the balance stored in the exchange. */
export function addSui(options: AddSuiOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'sui', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'add_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddAllWalArguments {
	self: RawTransactionArgument<string>;
	wal: RawTransactionArgument<string>;
}
export interface AddAllWalOptions {
	package?: string;
	arguments:
		| AddAllWalArguments
		| [self: RawTransactionArgument<string>, wal: RawTransactionArgument<string>];
}
/** Adds WAL to the balance stored in the exchange. */
export function addAllWal(options: AddAllWalOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'wal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'add_all_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddAllSuiArguments {
	self: RawTransactionArgument<string>;
	sui: RawTransactionArgument<string>;
}
export interface AddAllSuiOptions {
	package?: string;
	arguments:
		| AddAllSuiArguments
		| [self: RawTransactionArgument<string>, sui: RawTransactionArgument<string>];
}
/** Adds SUI to the balance stored in the exchange. */
export function addAllSui(options: AddAllSuiOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
	] satisfies string[];
	const parameterNames = ['self', 'sui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'add_all_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WithdrawWalArguments {
	self: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	adminCap: RawTransactionArgument<string>;
}
export interface WithdrawWalOptions {
	package?: string;
	arguments:
		| WithdrawWalArguments
		| [
				self: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				adminCap: RawTransactionArgument<string>,
		  ];
}
/** Withdraws WAL from the balance stored in the exchange. */
export function withdrawWal(options: WithdrawWalOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'u64',
		`${packageAddress}::wal_exchange::AdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'amount', 'adminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'withdraw_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WithdrawSuiArguments {
	self: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	adminCap: RawTransactionArgument<string>;
}
export interface WithdrawSuiOptions {
	package?: string;
	arguments:
		| WithdrawSuiArguments
		| [
				self: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				adminCap: RawTransactionArgument<string>,
		  ];
}
/** Withdraws SUI from the balance stored in the exchange. */
export function withdrawSui(options: WithdrawSuiOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'u64',
		`${packageAddress}::wal_exchange::AdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'amount', 'adminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'withdraw_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetExchangeRateArguments {
	self: RawTransactionArgument<string>;
	wal: RawTransactionArgument<number | bigint>;
	sui: RawTransactionArgument<number | bigint>;
	adminCap: RawTransactionArgument<string>;
}
export interface SetExchangeRateOptions {
	package?: string;
	arguments:
		| SetExchangeRateArguments
		| [
				self: RawTransactionArgument<string>,
				wal: RawTransactionArgument<number | bigint>,
				sui: RawTransactionArgument<number | bigint>,
				adminCap: RawTransactionArgument<string>,
		  ];
}
/** Sets the exchange rate of the exchange to `wal` WAL = `sui` SUI. */
export function setExchangeRate(options: SetExchangeRateOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'u64',
		'u64',
		`${packageAddress}::wal_exchange::AdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'wal', 'sui', 'adminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'set_exchange_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExchangeAllForWalArguments {
	self: RawTransactionArgument<string>;
	sui: RawTransactionArgument<string>;
}
export interface ExchangeAllForWalOptions {
	package?: string;
	arguments:
		| ExchangeAllForWalArguments
		| [self: RawTransactionArgument<string>, sui: RawTransactionArgument<string>];
}
/** Exchanges the provided SUI coin for WAL at the exchange's rate. */
export function exchangeAllForWal(options: ExchangeAllForWalOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
	] satisfies string[];
	const parameterNames = ['self', 'sui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'exchange_all_for_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExchangeForWalArguments {
	self: RawTransactionArgument<string>;
	sui: RawTransactionArgument<string>;
	amountSui: RawTransactionArgument<number | bigint>;
}
export interface ExchangeForWalOptions {
	package?: string;
	arguments:
		| ExchangeForWalArguments
		| [
				self: RawTransactionArgument<string>,
				sui: RawTransactionArgument<string>,
				amountSui: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Exchanges `amount_sui` out of the provided SUI coin for WAL at the exchange's
 * rate.
 */
export function exchangeForWal(options: ExchangeForWalOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>',
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'sui', 'amountSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'exchange_for_wal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExchangeAllForSuiArguments {
	self: RawTransactionArgument<string>;
	wal: RawTransactionArgument<string>;
}
export interface ExchangeAllForSuiOptions {
	package?: string;
	arguments:
		| ExchangeAllForSuiArguments
		| [self: RawTransactionArgument<string>, wal: RawTransactionArgument<string>];
}
/** Exchanges the provided WAL coin for SUI at the exchange's rate. */
export function exchangeAllForSui(options: ExchangeAllForSuiOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'wal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'exchange_all_for_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExchangeForSuiArguments {
	self: RawTransactionArgument<string>;
	wal: RawTransactionArgument<string>;
	amountWal: RawTransactionArgument<number | bigint>;
}
export interface ExchangeForSuiOptions {
	package?: string;
	arguments:
		| ExchangeForSuiArguments
		| [
				self: RawTransactionArgument<string>,
				wal: RawTransactionArgument<string>,
				amountWal: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Exchanges `amount_wal` out of the provided WAL coin for SUI at the exchange's
 * rate.
 */
export function exchangeForSui(options: ExchangeForSuiOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal_exchange';
	const argumentsTypes = [
		`${packageAddress}::wal_exchange::Exchange`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'wal', 'amountWal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal_exchange',
			function: 'exchange_for_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
