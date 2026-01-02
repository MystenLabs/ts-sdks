// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionObjectArgument } from '@mysten/sui/transactions';

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
	price: number;
	quantity: number;
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
	quantity: number;
	isBid: boolean;
	selfMatchingOption?: SelfMatchingOptions;
	payWithDeep?: boolean;
}

export interface CanPlaceLimitOrderParams {
	poolKey: string;
	balanceManagerKey: string;
	price: number;
	quantity: number;
	isBid: boolean;
	payWithDeep: boolean;
	expireTimestamp: number;
}

export interface CanPlaceMarketOrderParams {
	poolKey: string;
	balanceManagerKey: string;
	quantity: number;
	isBid: boolean;
	payWithDeep: boolean;
}

export interface PlaceMarginLimitOrderParams {
	poolKey: string;
	marginManagerKey: string;
	clientOrderId: string;
	price: number;
	quantity: number;
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
	quantity: number;
	isBid: boolean;
	selfMatchingOption?: SelfMatchingOptions;
	payWithDeep?: boolean;
}

export interface PendingLimitOrderParams {
	clientOrderId: string;
	orderType?: OrderType;
	selfMatchingOption?: SelfMatchingOptions;
	price: number;
	quantity: number;
	isBid: boolean;
	payWithDeep?: boolean;
	expireTimestamp?: number | bigint;
}

export interface PendingMarketOrderParams {
	clientOrderId: string;
	selfMatchingOption?: SelfMatchingOptions;
	quantity: number;
	isBid: boolean;
	payWithDeep?: boolean;
}

export interface AddConditionalOrderParams {
	marginManagerKey: string;
	conditionalOrderId: string;
	triggerBelowPrice: boolean;
	triggerPrice: number;
	pendingOrder: PendingLimitOrderParams | PendingMarketOrderParams;
}

export interface ProposalParams {
	poolKey: string;
	balanceManagerKey: string;
	takerFee: number;
	makerFee: number;
	stakeRequired: number;
}

export interface MarginProposalParams {
	takerFee: number;
	makerFee: number;
	stakeRequired: number;
}

export interface SwapParams {
	poolKey: string;
	amount: number;
	deepAmount: number;
	minOut: number;
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
	amount: number;
	minOut: number;
	baseCoin?: TransactionObjectArgument;
	quoteCoin?: TransactionObjectArgument;
}

export interface StakeParams {
	poolKey: string;
	balanceManagerKey: string;
	amount: number;
}

export interface VoteParams {
	poolKey: string;
	balanceManagerKey: string;
	proposalId: string;
}

export interface FlashLoanParams {
	poolKey: string;
	amount: number;
}

export interface CreatePoolAdminParams {
	baseCoinKey: string;
	quoteCoinKey: string;
	tickSize: number;
	lotSize: number;
	minSize: number;
	whitelisted: boolean;
	stablePool: boolean;
}

export interface CreatePermissionlessPoolParams {
	baseCoinKey: string;
	quoteCoinKey: string;
	tickSize: number;
	lotSize: number;
	minSize: number;
	deepCoin?: TransactionObjectArgument;
}

export interface SetEwmaParams {
	alpha: number;
	zScoreThreshold: number;
	additionalTakerFee: number;
}

export interface PoolConfigParams {
	minWithdrawRiskRatio: number;
	minBorrowRiskRatio: number;
	liquidationRiskRatio: number;
	targetLiquidationRiskRatio: number;
	userLiquidationReward: number;
	poolLiquidationReward: number;
}

export interface MarginPoolConfigParams {
	supplyCap: number;
	maxUtilizationRate: number;
	referralSpread: number;
	minBorrow: number;
}

export interface InterestConfigParams {
	baseRate: number;
	baseSlope: number;
	optimalUtilization: number;
	excessSlope: number;
}

export interface Config {
	DEEPBOOK_PACKAGE_ID: string;
	REGISTRY_ID: string;
	DEEP_TREASURY_ID: string;
}

export type Environment = 'mainnet' | 'testnet';
