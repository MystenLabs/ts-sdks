// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `expiryMarketMoveCalls`: the generated `expiry_market` bindings, with the argument
// keys the retired immediate trades shipped with (see `rename.ts`).

import type { TransactionArgument } from '@mysten/sui/transactions';
import * as generated from '../../contracts/deepbook_predict/expiry_market.js';
import type { RawTransactionArgument } from '../../contracts/utils/index.js';
import { renameArguments, withShippedKeys } from './rename.js';

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

// Predict v6 retires every view that read Propbook's objects or priced at a live `Pricer`: they keep
// their signatures, abort `EUseV2`, and their parameters are underscore-prefixed, so codegen
// capitalizes their keys. Their shipped keys are kept here. Price, quote and value off chain
// instead (`pricerAt`, `quotes.*`, the client's reads with a `PricingInputsProvider`).

/**
 * The close a sell fill prices, without the trader's floors. From Predict v5 it quotes a sell that
 * names no builder, whatever `builderCodeId` names; `quoteCloseWithBuilderFee` quotes one that
 * does. Changes nothing.
 * @deprecated Retired by Predict version 6: aborts `EUseV2`. Quote a sell with `quotes.localSellQuote`.
 */
export const quoteClose = withShippedKeys(generated.quoteClose, [
	'market',
	'pricer',
	'receipt',
	'closeQuantity',
	'builderCodeId',
]);
export type QuoteCloseOptions = Parameters<typeof quoteClose>[0];
export type QuoteCloseArguments = Exclude<QuoteCloseOptions['arguments'], readonly unknown[]>;

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Quote a sell with `quotes.localSellQuote`. */
export const quoteCloseWithBuilderFee = withShippedKeys(generated.quoteCloseWithBuilderFee, [
	'market',
	'config',
	'pricer',
	'receipt',
	'closeQuantity',
	'builderFeePerContract',
]);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Quote a mint with `quotes.localMintQuote`. */
export const quoteMint = withShippedKeys(generated.quoteMint, [
	'market',
	'config',
	'pricer',
	'lowerTick',
	'higherTick',
	'maxPremium',
	'minQuantity',
	'exactQuantity',
]);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Quote a mint with `quotes.localMintQuote`. */
export const quoteMintForAccount = withShippedKeys(generated.quoteMintForAccount, [
	'market',
	'wrapper',
	'config',
	'pricer',
	'lowerTick',
	'higherTick',
	'maxPremium',
	'minQuantity',
	'exactQuantity',
]);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Quote a mint with `quotes.localMintQuote`. */
export const quoteMintWithBuilderFee = withShippedKeys(generated.quoteMintWithBuilderFee, [
	'market',
	'wrapper',
	'config',
	'pricer',
	'lowerTick',
	'higherTick',
	'maxPremium',
	'minQuantity',
	'exactQuantity',
	'builderFeePerContract',
]);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Quote a mint with `quotes.localMintQuote`. */
export const quoteMintExactCostForAccount = withShippedKeys(
	generated.quoteMintExactCostForAccount,
	['market', 'wrapper', 'config', 'pricer', 'lowerTick', 'higherTick', 'maxCost', 'minQuantity'],
);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Quote a mint with `quotes.localMintQuote`. */
export const quoteMintExactCostWithBuilderFee = withShippedKeys(
	generated.quoteMintExactCostWithBuilderFee,
	[
		'market',
		'wrapper',
		'config',
		'pricer',
		'lowerTick',
		'higherTick',
		'maxCost',
		'minQuantity',
		'builderFeePerContract',
	],
);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Build a pricer off chain with `pricerAt`. */
export const loadLivePricer = withShippedKeys(generated.loadLivePricer, [
	'market',
	'config',
	'propbookRegistry',
	'pyth',
	'bsValues',
	'bsSvi',
]);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Value a market with `quotes.localNav`. */
export const currentNav = withShippedKeys(generated.currentNav, ['market', 'pricer']);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. */
export const liveOrderValue = withShippedKeys(generated.liveOrderValue, [
	'market',
	'pricer',
	'orderId',
]);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Use `setReferenceTickV2`. */
export const setReferenceTick = withShippedKeys(generated.setReferenceTick, [
	'market',
	'config',
	'propbookRegistry',
	'pyth',
]);

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. Use `trySettleV2`. */
export const trySettle = withShippedKeys(generated.trySettle, [
	'market',
	'config',
	'propbookRegistry',
	'pyth',
	'bsValues',
]);

// The order-flow admission and commit Predict version 6 retires. They take the companion's witness,
// so only the order-flow package calls them. Their shipped keys are kept like the rest.
const ADMISSION_KEYS = [
	'market',
	'config',
	'account',
	'propbookRegistry',
	'pyth',
	'bsValues',
	'bsSvi',
	'kind',
	'lowerTick',
	'higherTick',
	'quantity',
	'maxPremium',
	'minQuantity',
	'maxProbability',
	'budget',
	'orderFee',
	'sviMaxAgeMs',
	'channel',
	'tauMs',
	'deadlineMs',
	'builder',
	'receipt',
	'closeQuantity',
	'minProbability',
	'minProceeds',
] as const;

/** @deprecated Retired by Predict version 6: aborts `EUseV2`. The companion calls `admitMintV2`. */
export const admitMint = withShippedKeys(generated.admitMint, ADMISSION_KEYS);
/** @deprecated Retired by Predict version 6: aborts `EUseV2`. The companion calls `admitMintV2`. */
export const admitMintWithBuilder = withShippedKeys(generated.admitMintWithBuilder, ADMISSION_KEYS);
/** @deprecated Retired by Predict version 6: aborts `EUseV2`. The companion calls `admitSellV2`. */
export const admitSell = withShippedKeys(generated.admitSell, ADMISSION_KEYS);
/** @deprecated Retired by Predict version 6: aborts `EUseV2`. The companion calls `admitSellV2`. */
export const admitSellWithBuilder = withShippedKeys(generated.admitSellWithBuilder, ADMISSION_KEYS);
/** @deprecated Retired by Predict version 6: aborts `EUseV2`. The companion calls `commitV2`. */
export const commit = withShippedKeys(generated.commit, ['market', 'config', 'receipt', 'price']);

// The options and argument types of the wrappers above, with the shipped keys. They replace the
// generated types of the same names, which carry the capitalized keys.
export type QuoteCloseWithBuilderFeeOptions = Parameters<typeof quoteCloseWithBuilderFee>[0];
export type QuoteCloseWithBuilderFeeArguments = Exclude<
	QuoteCloseWithBuilderFeeOptions['arguments'],
	readonly unknown[]
>;
export type QuoteMintOptions = Parameters<typeof quoteMint>[0];
export type QuoteMintArguments = Exclude<QuoteMintOptions['arguments'], readonly unknown[]>;
export type QuoteMintForAccountOptions = Parameters<typeof quoteMintForAccount>[0];
export type QuoteMintForAccountArguments = Exclude<
	QuoteMintForAccountOptions['arguments'],
	readonly unknown[]
>;
export type QuoteMintWithBuilderFeeOptions = Parameters<typeof quoteMintWithBuilderFee>[0];
export type QuoteMintWithBuilderFeeArguments = Exclude<
	QuoteMintWithBuilderFeeOptions['arguments'],
	readonly unknown[]
>;
export type QuoteMintExactCostForAccountOptions = Parameters<
	typeof quoteMintExactCostForAccount
>[0];
export type QuoteMintExactCostForAccountArguments = Exclude<
	QuoteMintExactCostForAccountOptions['arguments'],
	readonly unknown[]
>;
export type QuoteMintExactCostWithBuilderFeeOptions = Parameters<
	typeof quoteMintExactCostWithBuilderFee
>[0];
export type QuoteMintExactCostWithBuilderFeeArguments = Exclude<
	QuoteMintExactCostWithBuilderFeeOptions['arguments'],
	readonly unknown[]
>;
export type LoadLivePricerOptions = Parameters<typeof loadLivePricer>[0];
export type LoadLivePricerArguments = Exclude<
	LoadLivePricerOptions['arguments'],
	readonly unknown[]
>;
export type CurrentNavOptions = Parameters<typeof currentNav>[0];
export type CurrentNavArguments = Exclude<CurrentNavOptions['arguments'], readonly unknown[]>;
export type LiveOrderValueOptions = Parameters<typeof liveOrderValue>[0];
export type LiveOrderValueArguments = Exclude<
	LiveOrderValueOptions['arguments'],
	readonly unknown[]
>;
export type SetReferenceTickOptions = Parameters<typeof setReferenceTick>[0];
export type SetReferenceTickArguments = Exclude<
	SetReferenceTickOptions['arguments'],
	readonly unknown[]
>;
export type TrySettleOptions = Parameters<typeof trySettle>[0];
export type TrySettleArguments = Exclude<TrySettleOptions['arguments'], readonly unknown[]>;
export type AdmitMintOptions = Parameters<typeof admitMint>[0];
export type AdmitMintArguments = Exclude<AdmitMintOptions['arguments'], readonly unknown[]>;
export type AdmitMintWithBuilderOptions = Parameters<typeof admitMintWithBuilder>[0];
export type AdmitMintWithBuilderArguments = Exclude<
	AdmitMintWithBuilderOptions['arguments'],
	readonly unknown[]
>;
export type AdmitSellOptions = Parameters<typeof admitSell>[0];
export type AdmitSellArguments = Exclude<AdmitSellOptions['arguments'], readonly unknown[]>;
export type AdmitSellWithBuilderOptions = Parameters<typeof admitSellWithBuilder>[0];
export type AdmitSellWithBuilderArguments = Exclude<
	AdmitSellWithBuilderOptions['arguments'],
	readonly unknown[]
>;
export type CommitOptions = Parameters<typeof commit>[0];
export type CommitArguments = Exclude<CommitOptions['arguments'], readonly unknown[]>;
