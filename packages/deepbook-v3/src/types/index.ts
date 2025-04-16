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

export interface Coin {
	address: string;
	type: string;
	scalar: number;
}

export interface Pool {
	address: string;
	baseCoin: string;
	quoteCoin: string;
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
	poolAddress: string;
	balanceManagerAddress: string;
	baseCoinType: string;
	quoteCoinType: string;
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
	poolAddress: string;
	balanceManagerAddress: string;
	baseCoinType: string;
	quoteCoinType: string;
	clientOrderId: string;
	quantity: number;
	isBid: boolean;
	selfMatchingOption?: SelfMatchingOptions;
	payWithDeep?: boolean;
}

export interface ProposalParams {
	poolAddress: string;
	balanceManagerAddress: string;
	baseCoinType: string;
	quoteCoinType: string;
	takerFee: number;
	makerFee: number;
	stakeRequired: number;
}

export interface SwapParams {
	poolAddress: string;
	baseCoinType: string;
	quoteCoinType: string;
	amount: number;
	deepAmount: number;
	minOut: number;
	deepCoin?: TransactionObjectArgument;
	baseCoin?: TransactionObjectArgument;
	quoteCoin?: TransactionObjectArgument;
}

export interface CreatePoolAdminParams {
	baseCoinType: string;
	quoteCoinType: string;
	tickSize: number;
	lotSize: number;
	minSize: number;
	whitelisted: boolean;
	stablePool: boolean;
}

export interface CreatePermissionlessPoolParams {
	baseCoinType: string;
	quoteCoinType: string;
	tickSize: number;
	lotSize: number;
	minSize: number;
	deepCoin?: TransactionObjectArgument;
}

export interface Config {
	DEEPBOOK_PACKAGE_ID: string;
	REGISTRY_ID: string;
	DEEP_TREASURY_ID: string;
}

export type Environment = 'mainnet' | 'testnet';
