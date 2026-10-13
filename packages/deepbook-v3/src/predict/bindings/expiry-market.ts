// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `expiryMarketMoveCalls`: the generated `expiry_market` bindings, with the argument
// keys the retired immediate trades shipped with (see `rename.ts`).

import type { TransactionArgument } from '@mysten/sui/transactions';
import * as generated from '../../contracts/deepbook_predict/expiry_market.js';
import type { RawTransactionArgument } from '../../contracts/utils/index.js';
import { renameArguments } from './rename.js';

export * from '../../contracts/deepbook_predict/expiry_market.js';

const TRADE_KEYS = {
	market: 'Market',
	wrapper: 'Wrapper',
	auth: 'Auth',
	config: 'Config',
	pricer: 'Pricer',
	lowerTick: 'LowerTick',
	higherTick: 'HigherTick',
	quantity: 'Quantity',
	maxCost: 'MaxCost',
	maxProbability: 'MaxProbability',
	maxPremium: 'MaxPremium',
	minQuantity: 'MinQuantity',
	orderId: 'OrderId',
	closeQuantity: 'CloseQuantity',
	minProbability: 'MinProbability',
	minProceeds: 'MinProceeds',
} as const;

interface TradeTarget {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	pricer: TransactionArgument;
}

export interface MintExactQuantityArguments extends TradeTarget {
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	maxProbability: RawTransactionArgument<number | bigint>;
}
export interface MintExactQuantityOptions extends Omit<
	generated.MintExactQuantityOptions,
	'arguments'
> {
	arguments: MintExactQuantityArguments;
}
/**
 * @deprecated Retired by delayed execution: Predict v4 always aborts it
 * (`EDelayedExecutionRequired`). Queue mints through the order-flow package.
 */
export function mintExactQuantity(options: MintExactQuantityOptions) {
	return generated.mintExactQuantity({
		...options,
		arguments: renameArguments(options.arguments, TRADE_KEYS),
	});
}

export interface MintExactAmountArguments extends TradeTarget {
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxPremium: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
}
export interface MintExactAmountOptions extends Omit<
	generated.MintExactAmountOptions,
	'arguments'
> {
	arguments: MintExactAmountArguments;
}
/**
 * @deprecated Retired by delayed execution: Predict v4 always aborts it
 * (`EDelayedExecutionRequired`). Queue mints through the order-flow package.
 */
export function mintExactAmount(options: MintExactAmountOptions) {
	return generated.mintExactAmount({
		...options,
		arguments: renameArguments(options.arguments, TRADE_KEYS),
	});
}

export interface MintExactCostArguments extends TradeTarget {
	lowerTick: RawTransactionArgument<number | bigint>;
	higherTick: RawTransactionArgument<number | bigint>;
	maxCost: RawTransactionArgument<number | bigint>;
	minQuantity: RawTransactionArgument<number | bigint>;
}
export interface MintExactCostOptions extends Omit<generated.MintExactCostOptions, 'arguments'> {
	arguments: MintExactCostArguments;
}
/**
 * @deprecated Retired by delayed execution: Predict v4 always aborts it
 * (`EDelayedExecutionRequired`). Queue mints through the order-flow package.
 */
export function mintExactCost(options: MintExactCostOptions) {
	return generated.mintExactCost({
		...options,
		arguments: renameArguments(options.arguments, TRADE_KEYS),
	});
}

export interface RedeemLiveArguments extends TradeTarget {
	orderId: RawTransactionArgument<number | bigint>;
	closeQuantity: RawTransactionArgument<number | bigint>;
	minProbability: RawTransactionArgument<number | bigint>;
	minProceeds: RawTransactionArgument<number | bigint>;
}
export interface RedeemLiveOptions extends Omit<generated.RedeemLiveOptions, 'arguments'> {
	arguments: RedeemLiveArguments;
}
/**
 * @deprecated Retired by delayed execution: Predict v4 always aborts it
 * (`EDelayedExecutionRequired`). Sell an Open record through the order-flow package.
 */
export function redeemLive(options: RedeemLiveOptions) {
	return generated.redeemLive({
		...options,
		arguments: renameArguments(options.arguments, TRADE_KEYS),
	});
}
