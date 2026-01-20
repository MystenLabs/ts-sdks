/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * DEEP price module. This module maintains the conversion rate between DEEP and
 * the base and quote assets.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@deepbook/core::deep_price';
export const Price = new MoveStruct({
	name: `${$moduleName}::Price`,
	fields: {
		conversion_rate: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const PriceAdded = new MoveStruct({
	name: `${$moduleName}::PriceAdded`,
	fields: {
		conversion_rate: bcs.u64(),
		timestamp: bcs.u64(),
		is_base_conversion: bcs.bool(),
		reference_pool: bcs.Address,
		target_pool: bcs.Address,
	},
});
export const DeepPrice = new MoveStruct({
	name: `${$moduleName}::DeepPrice`,
	fields: {
		base_prices: bcs.vector(Price),
		cumulative_base: bcs.u64(),
		quote_prices: bcs.vector(Price),
		cumulative_quote: bcs.u64(),
	},
});
export const OrderDeepPrice = new MoveStruct({
	name: `${$moduleName}::OrderDeepPrice`,
	fields: {
		asset_is_base: bcs.bool(),
		deep_per_asset: bcs.u64(),
	},
});
export interface AssetIsBaseArguments {
	self: RawTransactionArgument<string>;
}
export interface AssetIsBaseOptions {
	package?: string;
	arguments: AssetIsBaseArguments | [self: RawTransactionArgument<string>];
}
export function assetIsBase(options: AssetIsBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deep_price',
			function: 'asset_is_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeepPerAssetArguments {
	self: RawTransactionArgument<string>;
}
export interface DeepPerAssetOptions {
	package?: string;
	arguments: DeepPerAssetArguments | [self: RawTransactionArgument<string>];
}
export function deepPerAsset(options: DeepPerAssetOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'deep_price',
			function: 'deep_per_asset',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
