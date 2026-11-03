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

// Predict v5 underscore-prefixed the parameters of three more functions: `redeem_settled` and
// `redeem_settled_permissionless` retired, and `quote_close` ignores its builder code since
// builder fees moved to each trade (`quote_close_with_builder_fee` quotes one). Their shipped keys
// are kept here like the immediate trades'.
const SETTLED_KEYS = {
	market: 'Market',
	wrapper: 'Wrapper',
	auth: 'Auth',
	config: 'Config',
	accountRegistry: 'AccountRegistry',
	orderId: 'OrderId',
} as const;

type Positional<Options extends { arguments: unknown }> = Extract<
	Options['arguments'],
	readonly unknown[]
>;

export interface RedeemSettledArguments {
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface RedeemSettledOptions extends Omit<generated.RedeemSettledOptions, 'arguments'> {
	arguments: RedeemSettledArguments | Positional<generated.RedeemSettledOptions>;
}
/**
 * @deprecated Retired by delayed execution in Predict v5: it always aborts
 * `EDelayedExecutionRequired`. A queued fill never enters the account; the order-flow package pays
 * its Open record at settlement. A network whose Predict call target is still v4 runs it as before.
 */
export function redeemSettled(options: RedeemSettledOptions) {
	return generated.redeemSettled({
		...options,
		arguments: renameArguments(options.arguments, SETTLED_KEYS),
	});
}

export interface RedeemSettledPermissionlessArguments {
	market: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface RedeemSettledPermissionlessOptions extends Omit<
	generated.RedeemSettledPermissionlessOptions,
	'arguments'
> {
	arguments:
		RedeemSettledPermissionlessArguments | Positional<generated.RedeemSettledPermissionlessOptions>;
}
/**
 * @deprecated Retired with `redeem_settled` in Predict v5: it always aborts
 * `EDelayedExecutionRequired`. A network whose Predict call target is still v4 runs it as before.
 */
export function redeemSettledPermissionless(options: RedeemSettledPermissionlessOptions) {
	return generated.redeemSettledPermissionless({
		...options,
		arguments: renameArguments(options.arguments, SETTLED_KEYS),
	});
}

export interface QuoteCloseArguments {
	market: RawTransactionArgument<string>;
	pricer: TransactionArgument;
	receipt: TransactionArgument;
	closeQuantity: RawTransactionArgument<number | bigint>;
	builderCodeId: RawTransactionArgument<string | null>;
}
export interface QuoteCloseOptions extends Omit<generated.QuoteCloseOptions, 'arguments'> {
	arguments: QuoteCloseArguments | Positional<generated.QuoteCloseOptions>;
}
/**
 * The close a sell fill prices, without the trader's floors. From Predict v5 it quotes a sell that
 * names no builder, whatever `builderCodeId` names; `quoteCloseWithBuilderFee` quotes one that
 * does. Changes nothing.
 */
export function quoteClose(options: QuoteCloseOptions) {
	return generated.quoteClose({
		...options,
		arguments: renameArguments(options.arguments, { builderCodeId: 'BuilderCodeId' }),
	});
}
