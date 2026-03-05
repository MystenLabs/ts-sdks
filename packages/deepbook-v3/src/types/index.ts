// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionArgument, TransactionObjectArgument } from '@mysten/sui/transactions';

// SPDX-License-Identifier: Apache-2.0
export interface BalanceManager {
	address: string;
	tradeCap?: string;
	depositCap?: string;
	withdrawCap?: string;
}

export interface MarginManager {
	address: string;
	poolKey: string;
}

export interface Coin {
	address: string;
	type: string;
	scalar: number;
	feed?: string;
	currencyId?: string;
	priceInfoObjectId?: string;
}

export interface Pool {
	address: string;
	baseCoin: string;
	quoteCoin: string;
}

export interface MarginPool {
	address: string;
	type: string;
}

// Trading constants
export enum OrderType {
	NO_RESTRICTION,
	IMMEDIATE_OR_CANCEL,
	FILL_OR_KILL,
	POST_ONLY,
}

// Self matching options
export enum SelfMatchingOptions {
	SELF_MATCHING_ALLOWED,
	CANCEL_TAKER,
	CANCEL_MAKER,
}

export interface PlaceLimitOrderParams {
	poolKey: string;
	balanceManagerKey: string;
	clientOrderId: string;
	price: number | bigint;
	quantity: number | bigint;
	isBid: boolean;
	expiration?: number | bigint;
	orderType?: OrderType;
	selfMatchingOption?: SelfMatchingOptions;
	payWithDeep?: boolean;
}

export interface PlaceMarketOrderParams {
	poolKey: string;
	balanceManagerKey: string;
	clientOrderId: string;
	quantity: number | bigint;
	isBid: boolean;
	selfMatchingOption?: SelfMatchingOptions;
	payWithDeep?: boolean;
}

export interface CanPlaceLimitOrderParams {
	poolKey: string;
	balanceManagerKey: string;
	price: number | bigint;
	quantity: number | bigint;
	isBid: boolean;
	payWithDeep: boolean;
	expireTimestamp: number;
}

export interface CanPlaceMarketOrderParams {
	poolKey: string;
	balanceManagerKey: string;
	quantity: number | bigint;
	isBid: boolean;
	payWithDeep: boolean;
}

export interface PlaceMarginLimitOrderParams {
	poolKey: string;
	marginManagerKey: string;
	clientOrderId: string;
	price: number | bigint;
	quantity: number | bigint;
	isBid: boolean;
	expiration?: number | bigint;
	orderType?: OrderType;
	selfMatchingOption?: SelfMatchingOptions;
	payWithDeep?: boolean;
}

export interface PlaceMarginMarketOrderParams {
	poolKey: string;
	marginManagerKey: string;
	clientOrderId: string;
	quantity: number | bigint;
	isBid: boolean;
	selfMatchingOption?: SelfMatchingOptions;
	payWithDeep?: boolean;
}

export interface PendingLimitOrderParams {
	clientOrderId: string;
	orderType?: OrderType;
	selfMatchingOption?: SelfMatchingOptions;
	price: number | bigint;
	quantity: number | bigint;
	isBid: boolean;
	payWithDeep?: boolean;
	expireTimestamp?: number | bigint;
}

export interface PendingMarketOrderParams {
	clientOrderId: string;
	selfMatchingOption?: SelfMatchingOptions;
	quantity: number | bigint;
	isBid: boolean;
	payWithDeep?: boolean;
}

export interface AddConditionalOrderParams {
	marginManagerKey: string;
	conditionalOrderId: string;
	triggerBelowPrice: boolean;
	triggerPrice: number | bigint;
	pendingOrder: PendingLimitOrderParams | PendingMarketOrderParams;
}

export interface ProposalParams {
	poolKey: string;
	balanceManagerKey: string;
	takerFee: number | bigint;
	makerFee: number | bigint;
	stakeRequired: number | bigint;
}

export interface MarginProposalParams {
	takerFee: number | bigint;
	makerFee: number | bigint;
	stakeRequired: number | bigint;
}

export interface SwapParams {
	poolKey: string;
	amount: number | bigint;
	deepAmount: number | bigint;
	minOut: number | bigint;
	deepCoin?: TransactionObjectArgument;
	baseCoin?: TransactionObjectArgument;
	quoteCoin?: TransactionObjectArgument;
}

export interface SwapWithManagerParams {
	poolKey: string;
	balanceManagerKey: string;
	tradeCap: string;
	depositCap: string;
	withdrawCap: string;
	amount: number | bigint;
	minOut: number | bigint;
	baseCoin?: TransactionObjectArgument;
	quoteCoin?: TransactionObjectArgument;
}

export interface StakeParams {
	poolKey: string;
	balanceManagerKey: string;
	amount: number | bigint;
}

export interface VoteParams {
	poolKey: string;
	balanceManagerKey: string;
	proposalId: string;
}

export interface FlashLoanParams {
	poolKey: string;
	amount: number | bigint;
}

export interface CreatePoolAdminParams {
	baseCoinKey: string;
	quoteCoinKey: string;
	tickSize: number | bigint;
	lotSize: number | bigint;
	minSize: number | bigint;
	whitelisted: boolean;
	stablePool: boolean;
}

export interface CreatePermissionlessPoolParams {
	baseCoinKey: string;
	quoteCoinKey: string;
	tickSize: number | bigint;
	lotSize: number | bigint;
	minSize: number | bigint;
	deepCoin?: TransactionObjectArgument;
}

export interface SetEwmaParams {
	alpha: number | bigint;
	zScoreThreshold: number | bigint;
	additionalTakerFee: number | bigint;
}

export interface PoolConfigParams {
	minWithdrawRiskRatio: number | bigint;
	minBorrowRiskRatio: number | bigint;
	liquidationRiskRatio: number | bigint;
	targetLiquidationRiskRatio: number | bigint;
	userLiquidationReward: number | bigint;
	poolLiquidationReward: number | bigint;
}

export interface MarginPoolConfigParams {
	supplyCap: number | bigint;
	maxUtilizationRate: number | bigint;
	referralSpread: number | bigint;
	minBorrow: number | bigint;
	rateLimitCapacity?: number | bigint;
	rateLimitRefillRatePerMs?: number | bigint;
	rateLimitEnabled?: boolean;
}

export interface InterestConfigParams {
	baseRate: number | bigint;
	baseSlope: number | bigint;
	optimalUtilization: number | bigint;
	excessSlope: number | bigint;
}

export interface Config {
	DEEPBOOK_PACKAGE_ID: string;
	REGISTRY_ID: string;
	DEEP_TREASURY_ID: string;
}

// === Named Return Types ===

// Balance
export interface ManagerBalance {
	coinType: string;
	balance: number;
}
export interface VaultBalances {
	base: number;
	quote: number;
	deep: number;
}
export interface LockedBalances {
	base: number;
	quote: number;
	deep: number;
}
export interface ReferralBalances {
	base: number;
	quote: number;
	deep: number;
}

// Pool
export interface PoolTradeParams {
	takerFee: number;
	makerFee: number;
	stakeRequired: number;
}
export interface PoolBookParams {
	tickSize: number;
	lotSize: number;
	minSize: number;
}
export type PoolDeepPrice =
	| { asset_is_base: true; deep_per_base: number }
	| { asset_is_base: false; deep_per_quote: number };

// Quantity calculations
export interface QuoteQuantityOut {
	baseQuantity: number;
	baseOut: number;
	quoteOut: number;
	deepRequired: number;
}
export interface BaseQuantityOut {
	quoteQuantity: number;
	baseOut: number;
	quoteOut: number;
	deepRequired: number;
}
export interface QuantityOut {
	baseQuantity: number;
	quoteQuantity: number;
	baseOut: number;
	quoteOut: number;
	deepRequired: number;
}
export interface BaseQuantityIn {
	baseIn: number;
	quoteOut: number;
	deepRequired: number;
}
export interface QuoteQuantityIn {
	baseOut: number;
	quoteIn: number;
	deepRequired: number;
}
export interface OrderDeepRequiredResult {
	deepRequiredTaker: number;
	deepRequiredMaker: number;
}

// Order book
export interface Level2Range {
	prices: number[];
	quantities: number[];
}
export interface Level2TicksFromMid {
	bid_prices: number[];
	bid_quantities: number[];
	ask_prices: number[];
	ask_quantities: number[];
}

// Account
export interface AccountBalances {
	base: number;
	quote: number;
	deep: number;
}
export interface AccountInfo {
	epoch: string;
	open_orders: { contents: string[] };
	taker_volume: number;
	maker_volume: number;
	active_stake: number;
	inactive_stake: number;
	created_proposal: boolean;
	voted_proposal: string | null;
	unclaimed_rebates: AccountBalances;
	settled_balances: AccountBalances;
	owed_balances: AccountBalances;
}

// Order
export interface DecodedOrderId {
	isBid: boolean;
	price: number;
	orderId: number;
}

// Margin
export interface MarginManagerState {
	managerId: string;
	deepbookPoolId: string;
	riskRatio: number;
	baseAsset: string;
	quoteAsset: string;
	baseDebt: string;
	quoteDebt: string;
	basePythPrice: string;
	basePythDecimals: number;
	quotePythPrice: string;
	quotePythDecimals: number;
	currentPrice: bigint;
	lowestTriggerAbovePrice: bigint;
	highestTriggerBelowPrice: bigint;
}
export interface MarginManagerAssets {
	baseAsset: string;
	quoteAsset: string;
}
export interface MarginManagerDebts {
	baseDebt: string;
	quoteDebt: string;
}
export interface MarginManagerBalancesResult {
	base: string;
	quote: string;
	deep: string;
}
export interface BorrowedShares {
	baseShares: string;
	quoteShares: string;
}

/**
 * Parameters for depositing into a margin manager.
 * Either `amount` (number) or `coin` (TransactionArgument) must be provided, but not both.
 */
export type DepositParams = {
	managerKey: string;
} & ({ amount: number | bigint; coin?: never } | { amount?: never; coin: TransactionArgument });

/**
 * Parameters for depositing during margin manager initialization.
 * Either (`coinType` + `amount`) or (`coinType` + `coin`) must be provided.
 * `coinType` should be a coin key from config (e.g., 'SUI', 'DBUSDC', 'DEEP').
 */
export type DepositDuringInitParams = {
	manager: TransactionArgument;
	poolKey: string;
	coinType: string;
} & ({ amount: number | bigint; coin?: never } | { amount?: never; coin: TransactionArgument });
