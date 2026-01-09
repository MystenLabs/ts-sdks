/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@suins/core::pricing_config';
export const Range = new MoveTuple({
	name: `${$moduleName}::Range`,
	fields: [bcs.u64(), bcs.u64()],
});
export const PricingConfig = new MoveStruct({
	name: `${$moduleName}::PricingConfig`,
	fields: {
		pricing: vec_map.VecMap(Range, bcs.u64()),
	},
});
export const RenewalConfig = new MoveStruct({
	name: `${$moduleName}::RenewalConfig`,
	fields: {
		config: PricingConfig,
	},
});
export interface CalculateBasePriceArguments {
	config: RawTransactionArgument<string>;
	length: RawTransactionArgument<number | bigint>;
}
export interface CalculateBasePriceOptions {
	package?: string;
	arguments:
		| CalculateBasePriceArguments
		| [config: RawTransactionArgument<string>, length: RawTransactionArgument<number | bigint>];
}
/**
 * Calculates the base price for a given length.
 *
 * - Base price type is abstracted away. We can switch to a different base. Our
 *   core base will become USDC.
 * - The price is calculated based on the length of the domain name and the
 *   available ranges.
 */
export function calculateBasePrice(options: CalculateBasePriceOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`${packageAddress}::pricing_config::PricingConfig`,
		'u64',
	] satisfies string[];
	const parameterNames = ['config', 'length'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing_config',
			function: 'calculate_base_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewArguments {
	ranges: RawTransactionArgument<string[]>;
	prices: RawTransactionArgument<number | bigint[]>;
}
export interface NewOptions {
	package?: string;
	arguments:
		| NewArguments
		| [ranges: RawTransactionArgument<string[]>, prices: RawTransactionArgument<number | bigint[]>];
}
/**
 * Creates a new PricingConfig with the given ranges and prices.
 *
 * - The ranges should be sorted in `ascending order` and should not overlap.
 * - The length of the ranges and prices should be the same.
 *
 * All the ranges are inclusive (e.g. [3,5]: includes 3, 4, and 5).
 */
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		`vector<${packageAddress}::pricing_config::Range>`,
		'vector<u64>',
	] satisfies string[];
	const parameterNames = ['ranges', 'prices'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing_config',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsBetweenInclusiveArguments {
	range: RawTransactionArgument<string>;
	length: RawTransactionArgument<number | bigint>;
}
export interface IsBetweenInclusiveOptions {
	package?: string;
	arguments:
		| IsBetweenInclusiveArguments
		| [range: RawTransactionArgument<string>, length: RawTransactionArgument<number | bigint>];
}
/** Checks if the value is between the range (inclusive). */
export function isBetweenInclusive(options: IsBetweenInclusiveOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::pricing_config::Range`, 'u64'] satisfies string[];
	const parameterNames = ['range', 'length'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing_config',
			function: 'is_between_inclusive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PricingArguments {
	config: RawTransactionArgument<string>;
}
export interface PricingOptions {
	package?: string;
	arguments: PricingArguments | [config: RawTransactionArgument<string>];
}
/** Returns the pricing config for usage in external apps. */
export function pricing(options: PricingOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::pricing_config::PricingConfig`] satisfies string[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing_config',
			function: 'pricing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewRenewalConfigArguments {
	config: RawTransactionArgument<string>;
}
export interface NewRenewalConfigOptions {
	package?: string;
	arguments: NewRenewalConfigArguments | [config: RawTransactionArgument<string>];
}
/** Constructor for Renewal<T> that initializes it with a PricingConfig. */
export function newRenewalConfig(options: NewRenewalConfigOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::pricing_config::PricingConfig`] satisfies string[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing_config',
			function: 'new_renewal_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewRangeArguments {
	range: RawTransactionArgument<number | bigint[]>;
}
export interface NewRangeOptions {
	package?: string;
	arguments: NewRangeArguments | [range: RawTransactionArgument<number | bigint[]>];
}
export function newRange(options: NewRangeOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = ['vector<u64>'] satisfies string[];
	const parameterNames = ['range'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing_config',
			function: 'new_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ConfigArguments {
	renewal: RawTransactionArgument<string>;
}
export interface ConfigOptions {
	package?: string;
	arguments: ConfigArguments | [renewal: RawTransactionArgument<string>];
}
export function config(options: ConfigOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::pricing_config::RenewalConfig`] satisfies string[];
	const parameterNames = ['renewal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing_config',
			function: 'config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
