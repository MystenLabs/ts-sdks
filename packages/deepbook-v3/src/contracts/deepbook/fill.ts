/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** `Fill` struct represents the results of a match between two orders. */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as deep_price from './deep_price.js';
const $moduleName = '@deepbook/core::fill';
export const Fill = new MoveStruct({
	name: `${$moduleName}::Fill`,
	fields: {
		maker_order_id: bcs.u128(),
		maker_client_order_id: bcs.u64(),
		execution_price: bcs.u64(),
		balance_manager_id: bcs.Address,
		expired: bcs.bool(),
		completed: bcs.bool(),
		original_maker_quantity: bcs.u64(),
		base_quantity: bcs.u64(),
		quote_quantity: bcs.u64(),
		taker_is_bid: bcs.bool(),
		maker_epoch: bcs.u64(),
		maker_deep_price: deep_price.OrderDeepPrice,
		taker_fee: bcs.u64(),
		taker_fee_is_deep: bcs.bool(),
		maker_fee: bcs.u64(),
		maker_fee_is_deep: bcs.bool(),
	},
});
export interface MakerOrderIdArguments {
	self: RawTransactionArgument<string>;
}
export interface MakerOrderIdOptions {
	package?: string;
	arguments: MakerOrderIdArguments | [self: RawTransactionArgument<string>];
}
export function makerOrderId(options: MakerOrderIdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'maker_order_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakerClientOrderIdArguments {
	self: RawTransactionArgument<string>;
}
export interface MakerClientOrderIdOptions {
	package?: string;
	arguments: MakerClientOrderIdArguments | [self: RawTransactionArgument<string>];
}
export function makerClientOrderId(options: MakerClientOrderIdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'maker_client_order_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExecutionPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface ExecutionPriceOptions {
	package?: string;
	arguments: ExecutionPriceArguments | [self: RawTransactionArgument<string>];
}
export function executionPrice(options: ExecutionPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'execution_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BalanceManagerIdArguments {
	self: RawTransactionArgument<string>;
}
export interface BalanceManagerIdOptions {
	package?: string;
	arguments: BalanceManagerIdArguments | [self: RawTransactionArgument<string>];
}
export function balanceManagerId(options: BalanceManagerIdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'balance_manager_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpiredArguments {
	self: RawTransactionArgument<string>;
}
export interface ExpiredOptions {
	package?: string;
	arguments: ExpiredArguments | [self: RawTransactionArgument<string>];
}
export function expired(options: ExpiredOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CompletedArguments {
	self: RawTransactionArgument<string>;
}
export interface CompletedOptions {
	package?: string;
	arguments: CompletedArguments | [self: RawTransactionArgument<string>];
}
export function completed(options: CompletedOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'completed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OriginalMakerQuantityArguments {
	self: RawTransactionArgument<string>;
}
export interface OriginalMakerQuantityOptions {
	package?: string;
	arguments: OriginalMakerQuantityArguments | [self: RawTransactionArgument<string>];
}
export function originalMakerQuantity(options: OriginalMakerQuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'original_maker_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BaseQuantityArguments {
	self: RawTransactionArgument<string>;
}
export interface BaseQuantityOptions {
	package?: string;
	arguments: BaseQuantityArguments | [self: RawTransactionArgument<string>];
}
export function baseQuantity(options: BaseQuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'base_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TakerIsBidArguments {
	self: RawTransactionArgument<string>;
}
export interface TakerIsBidOptions {
	package?: string;
	arguments: TakerIsBidArguments | [self: RawTransactionArgument<string>];
}
export function takerIsBid(options: TakerIsBidOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'taker_is_bid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QuoteQuantityArguments {
	self: RawTransactionArgument<string>;
}
export interface QuoteQuantityOptions {
	package?: string;
	arguments: QuoteQuantityArguments | [self: RawTransactionArgument<string>];
}
export function quoteQuantity(options: QuoteQuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'quote_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakerEpochArguments {
	self: RawTransactionArgument<string>;
}
export interface MakerEpochOptions {
	package?: string;
	arguments: MakerEpochArguments | [self: RawTransactionArgument<string>];
}
export function makerEpoch(options: MakerEpochOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'maker_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakerDeepPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface MakerDeepPriceOptions {
	package?: string;
	arguments: MakerDeepPriceArguments | [self: RawTransactionArgument<string>];
}
export function makerDeepPrice(options: MakerDeepPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'maker_deep_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TakerFeeArguments {
	self: RawTransactionArgument<string>;
}
export interface TakerFeeOptions {
	package?: string;
	arguments: TakerFeeArguments | [self: RawTransactionArgument<string>];
}
export function takerFee(options: TakerFeeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'taker_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TakerFeeIsDeepArguments {
	self: RawTransactionArgument<string>;
}
export interface TakerFeeIsDeepOptions {
	package?: string;
	arguments: TakerFeeIsDeepArguments | [self: RawTransactionArgument<string>];
}
export function takerFeeIsDeep(options: TakerFeeIsDeepOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'taker_fee_is_deep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakerFeeArguments {
	self: RawTransactionArgument<string>;
}
export interface MakerFeeOptions {
	package?: string;
	arguments: MakerFeeArguments | [self: RawTransactionArgument<string>];
}
export function makerFee(options: MakerFeeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'maker_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakerFeeIsDeepArguments {
	self: RawTransactionArgument<string>;
}
export interface MakerFeeIsDeepOptions {
	package?: string;
	arguments: MakerFeeIsDeepArguments | [self: RawTransactionArgument<string>];
}
export function makerFeeIsDeep(options: MakerFeeIsDeepOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fill',
			function: 'maker_fee_is_deep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
