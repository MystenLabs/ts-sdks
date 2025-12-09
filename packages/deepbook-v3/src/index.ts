// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Main client and configuration
export { DeepBookClient } from './client.js';
export { DeepBookConfig } from './utils/config.js';

// Core contract classes
export { BalanceManagerContract } from './transactions/balanceManager.js';
export { DeepBookContract } from './transactions/deepbook.js';
export { DeepBookAdminContract } from './transactions/deepbookAdmin.js';
export { FlashLoanContract } from './transactions/flashLoans.js';
export { GovernanceContract } from './transactions/governance.js';

// Margin trading contracts
export { MarginAdminContract } from './transactions/marginAdmin.js';
export { MarginMaintainerContract } from './transactions/marginMaintainer.js';
export { MarginManagerContract } from './transactions/marginManager.js';
export { MarginPoolContract } from './transactions/marginPool.js';
export { PoolProxyContract } from './transactions/poolProxy.js';

// Pyth price feed integration
export { SuiPythClient, SuiPriceServiceConnection } from './pyth/pyth.js';

// BCS types for parsing on-chain data
export { Account, Balances, Order, OrderDeepPrice, VecSet } from './types/bcs.js';

// TypeScript interfaces and types
export type {
	BalanceManager,
	Coin,
	Pool,
	MarginManager,
	MarginPool,
	Environment,
	Config,
} from './types/index.js';

// Trading parameter interfaces
export type {
	PlaceLimitOrderParams,
	PlaceMarketOrderParams,
	PlaceMarginLimitOrderParams,
	PlaceMarginMarketOrderParams,
	SwapParams,
	ProposalParams,
	MarginProposalParams,
	CreatePoolAdminParams,
	CreatePermissionlessPoolParams,
	SetEwmaParams,
	PoolConfigParams,
	MarginPoolConfigParams,
	InterestConfigParams,
} from './types/index.js';

// Enums for trading
export { OrderType, SelfMatchingOptions } from './types/index.js';

// Constants and configuration maps
export type { CoinMap, PoolMap, MarginPoolMap } from './utils/constants.js';
export {
	DEEP_SCALAR,
	FLOAT_SCALAR,
	GAS_BUDGET,
	MAX_TIMESTAMP,
	POOL_CREATION_FEE_DEEP,
	PRICE_INFO_OBJECT_MAX_AGE_MS,
} from './utils/config.js';

// Error handling utilities
export {
	DeepBookError,
	ResourceNotFoundError,
	ConfigurationError,
	ValidationError,
	ErrorMessages,
} from './utils/errors.js';

// Validation utilities
export {
	validateRequired,
	validateAddress,
	validatePositiveNumber,
	validateNonNegativeNumber,
	validateRange,
	validateNonEmptyArray,
} from './utils/validation.js';
