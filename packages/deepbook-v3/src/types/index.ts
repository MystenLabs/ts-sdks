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
	metadataId?: string;
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
