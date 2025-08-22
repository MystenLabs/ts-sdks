// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The BalanceManager is a shared object that holds all of the balances for
 * different assets. A combination of `BalanceManager` and `TradeProof` are passed
 * into a pool to perform trades. A `TradeProof` can be generated in two ways: by
 * the owner directly, or by any `TradeCap` owner. The owner can generate a
 * `TradeProof` without the risk of equivocation. The `TradeCap` owner, due to it
 * being an owned object, risks equivocation when generating a `TradeProof`.
 * Generally, a high frequency trading engine will trade as the default owner.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
import * as bag from './deps/sui/bag.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@deepbook/core::balance_manager';
export const BalanceManager = new MoveStruct({
	name: `${$moduleName}::BalanceManager`,
	fields: {
		id: object.UID,
		owner: bcs.Address,
		balances: bag.Bag,
		allow_listed: vec_set.VecSet(bcs.Address),
	},
});
export const BalanceManagerEvent = new MoveStruct({
	name: `${$moduleName}::BalanceManagerEvent`,
	fields: {
		balance_manager_id: bcs.Address,
		owner: bcs.Address,
	},
});
export const BalanceEvent = new MoveStruct({
	name: `${$moduleName}::BalanceEvent`,
	fields: {
		balance_manager_id: bcs.Address,
		asset: type_name.TypeName,
		amount: bcs.u64(),
		deposit: bcs.bool(),
	},
});
export const BalanceKey = new MoveStruct({
	name: `${$moduleName}::BalanceKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const TradeCap = new MoveStruct({
	name: `${$moduleName}::TradeCap`,
	fields: {
		id: object.UID,
		balance_manager_id: bcs.Address,
	},
});
export const DepositCap = new MoveStruct({
	name: `${$moduleName}::DepositCap`,
	fields: {
		id: object.UID,
		balance_manager_id: bcs.Address,
	},
});
export const WithdrawCap = new MoveStruct({
	name: `${$moduleName}::WithdrawCap`,
	fields: {
		id: object.UID,
		balance_manager_id: bcs.Address,
	},
});
export const TradeProof = new MoveStruct({
	name: `${$moduleName}::TradeProof`,
	fields: {
		balance_manager_id: bcs.Address,
		trader: bcs.Address,
	},
});
export interface NewOptions {
	package?: string;
	arguments?: [];
}
export function _new(options: NewOptions = {}) {
	const packageAddress = options.package ?? '@deepbook/core';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'new',
		});
}
export interface NewWithOwnerArguments {
	Owner: RawTransactionArgument<string>;
}
export interface NewWithOwnerOptions {
	package?: string;
	arguments: NewWithOwnerArguments | [Owner: RawTransactionArgument<string>];
}
export function newWithOwner(options: NewWithOwnerOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['address'] satisfies string[];
	const parameterNames = ['Owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'new_with_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewWithCustomOwnerArguments {
	owner: RawTransactionArgument<string>;
}
export interface NewWithCustomOwnerOptions {
	package?: string;
	arguments: NewWithCustomOwnerArguments | [owner: RawTransactionArgument<string>];
}
/** Create a new balance manager with an owner. */
export function newWithCustomOwner(options: NewWithCustomOwnerOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['address'] satisfies string[];
	const parameterNames = ['owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'new_with_custom_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewWithCustomOwnerAndCapsArguments {
	owner: RawTransactionArgument<string>;
}
export interface NewWithCustomOwnerAndCapsOptions {
	package?: string;
	arguments: NewWithCustomOwnerAndCapsArguments | [owner: RawTransactionArgument<string>];
}
export function newWithCustomOwnerAndCaps(options: NewWithCustomOwnerAndCapsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['address'] satisfies string[];
	const parameterNames = ['owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'new_with_custom_owner_and_caps',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BalanceArguments {
	balanceManager: RawTransactionArgument<string>;
}
export interface BalanceOptions {
	package?: string;
	arguments: BalanceArguments | [balanceManager: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Returns the balance of a Coin in a balance manager. */
export function balance(options: BalanceOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::balance_manager::BalanceManager`] satisfies string[];
	const parameterNames = ['balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MintTradeCapArguments {
	balanceManager: RawTransactionArgument<string>;
}
export interface MintTradeCapOptions {
	package?: string;
	arguments: MintTradeCapArguments | [balanceManager: RawTransactionArgument<string>];
}
/** Mint a `TradeCap`, only owner can mint a `TradeCap`. */
export function mintTradeCap(options: MintTradeCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::balance_manager::BalanceManager`] satisfies string[];
	const parameterNames = ['balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'mint_trade_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintDepositCapArguments {
	balanceManager: RawTransactionArgument<string>;
}
export interface MintDepositCapOptions {
	package?: string;
	arguments: MintDepositCapArguments | [balanceManager: RawTransactionArgument<string>];
}
/** Mint a `DepositCap`, only owner can mint. */
export function mintDepositCap(options: MintDepositCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::balance_manager::BalanceManager`] satisfies string[];
	const parameterNames = ['balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'mint_deposit_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintWithdrawCapArguments {
	balanceManager: RawTransactionArgument<string>;
}
export interface MintWithdrawCapOptions {
	package?: string;
	arguments: MintWithdrawCapArguments | [balanceManager: RawTransactionArgument<string>];
}
/** Mint a `WithdrawCap`, only owner can mint. */
export function mintWithdrawCap(options: MintWithdrawCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::balance_manager::BalanceManager`] satisfies string[];
	const parameterNames = ['balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'mint_withdraw_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RevokeTradeCapArguments {
	balanceManager: RawTransactionArgument<string>;
	tradeCapId: RawTransactionArgument<string>;
}
export interface RevokeTradeCapOptions {
	package?: string;
	arguments:
		| RevokeTradeCapArguments
		| [balanceManager: RawTransactionArgument<string>, tradeCapId: RawTransactionArgument<string>];
}
/**
 * Revoke a `TradeCap`. Only the owner can revoke a `TradeCap`. Can also be used to
 * revoke `DepositCap` and `WithdrawCap`.
 */
export function revokeTradeCap(options: RevokeTradeCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::balance_manager::BalanceManager`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
	] satisfies string[];
	const parameterNames = ['balanceManager', 'tradeCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'revoke_trade_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateProofAsOwnerArguments {
	balanceManager: RawTransactionArgument<string>;
}
export interface GenerateProofAsOwnerOptions {
	package?: string;
	arguments: GenerateProofAsOwnerArguments | [balanceManager: RawTransactionArgument<string>];
}
/**
 * Generate a `TradeProof` by the owner. The owner does not require a capability
 * and can generate TradeProofs without the risk of equivocation.
 */
export function generateProofAsOwner(options: GenerateProofAsOwnerOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::balance_manager::BalanceManager`] satisfies string[];
	const parameterNames = ['balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'generate_proof_as_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateProofAsTraderArguments {
	balanceManager: RawTransactionArgument<string>;
	tradeCap: RawTransactionArgument<string>;
}
export interface GenerateProofAsTraderOptions {
	package?: string;
	arguments:
		| GenerateProofAsTraderArguments
		| [balanceManager: RawTransactionArgument<string>, tradeCap: RawTransactionArgument<string>];
}
/**
 * Generate a `TradeProof` with a `TradeCap`. Risk of equivocation since `TradeCap`
 * is an owned object.
 */
export function generateProofAsTrader(options: GenerateProofAsTraderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeCap`,
	] satisfies string[];
	const parameterNames = ['balanceManager', 'tradeCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'generate_proof_as_trader',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DepositArguments {
	balanceManager: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface DepositOptions {
	package?: string;
	arguments:
		| DepositArguments
		| [balanceManager: RawTransactionArgument<string>, coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Deposit funds to a balance manager. Only owner can call this directly. */
export function deposit(options: DepositOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::balance_manager::BalanceManager`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['balanceManager', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'deposit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DepositWithCapArguments {
	balanceManager: RawTransactionArgument<string>;
	depositCap: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface DepositWithCapOptions {
	package?: string;
	arguments:
		| DepositWithCapArguments
		| [
				balanceManager: RawTransactionArgument<string>,
				depositCap: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Deposit funds into a balance manager by a `DepositCap` owner. */
export function depositWithCap(options: DepositWithCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::DepositCap`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['balanceManager', 'depositCap', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'deposit_with_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawWithCapArguments {
	balanceManager: RawTransactionArgument<string>;
	withdrawCap: RawTransactionArgument<string>;
	withdrawAmount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawWithCapOptions {
	package?: string;
	arguments:
		| WithdrawWithCapArguments
		| [
				balanceManager: RawTransactionArgument<string>,
				withdrawCap: RawTransactionArgument<string>,
				withdrawAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/** Withdraw funds from a balance manager by a `WithdrawCap` owner. */
export function withdrawWithCap(options: WithdrawWithCapOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::WithdrawCap`,
		'u64',
	] satisfies string[];
	const parameterNames = ['balanceManager', 'withdrawCap', 'withdrawAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'withdraw_with_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawArguments {
	balanceManager: RawTransactionArgument<string>;
	withdrawAmount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawOptions {
	package?: string;
	arguments:
		| WithdrawArguments
		| [
				balanceManager: RawTransactionArgument<string>,
				withdrawAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Withdraw funds from a balance_manager. Only owner can call this directly. If
 * withdraw_all is true, amount is ignored and full balance withdrawn. If
 * withdraw_all is false, withdraw_amount will be withdrawn.
 */
export function withdraw(options: WithdrawOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::balance_manager::BalanceManager`,
		'u64',
	] satisfies string[];
	const parameterNames = ['balanceManager', 'withdrawAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawAllArguments {
	balanceManager: RawTransactionArgument<string>;
}
export interface WithdrawAllOptions {
	package?: string;
	arguments: WithdrawAllArguments | [balanceManager: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function withdrawAll(options: WithdrawAllOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::balance_manager::BalanceManager`] satisfies string[];
	const parameterNames = ['balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'withdraw_all',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ValidateProofArguments {
	balanceManager: RawTransactionArgument<string>;
	proof: RawTransactionArgument<string>;
}
export interface ValidateProofOptions {
	package?: string;
	arguments:
		| ValidateProofArguments
		| [balanceManager: RawTransactionArgument<string>, proof: RawTransactionArgument<string>];
}
export function validateProof(options: ValidateProofOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
	] satisfies string[];
	const parameterNames = ['balanceManager', 'proof'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'validate_proof',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OwnerArguments {
	balanceManager: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [balanceManager: RawTransactionArgument<string>];
}
/** Returns the owner of the balance_manager. */
export function owner(options: OwnerOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::balance_manager::BalanceManager`] satisfies string[];
	const parameterNames = ['balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdArguments {
	balanceManager: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [balanceManager: RawTransactionArgument<string>];
}
/** Returns the owner of the balance_manager. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::balance_manager::BalanceManager`] satisfies string[];
	const parameterNames = ['balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'balance_manager',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
