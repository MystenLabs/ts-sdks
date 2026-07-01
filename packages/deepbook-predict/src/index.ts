// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Configuration
export { PredictConfig } from './utils/config.js';
export type { PredictConfigOptions, PredictIds, PredictNetwork } from './utils/config.js';

// Protocol constants
export * from './utils/constants.js';

// Order-ID codec (mirror of `deepbook_predict::order`)
export { decodeOrderId, encodeOrderId, quantityToLots } from './types/orderId.js';
export type { DecodedOrder, OrderTerms } from './types/orderId.js';

// Client facade
export { PredictClient, predict } from './client.js';
export type { PredictClientOptions, PredictCompatibleClient, PredictOptions } from './client.js';

// Transaction builders
export { AccountContract } from './transactions/account.js';
export { PredictAccountContract } from './transactions/predictAccount.js';
export { TradeContract } from './transactions/trade.js';
export type { PricerFeeds } from './transactions/trade.js';
export { LpContract } from './transactions/lp.js';
export { FlushContract } from './transactions/flush.js';

// On-chain queries
export { MarketQueries } from './queries/marketQueries.js';
export type { MarketState } from './queries/marketQueries.js';
export { VaultQueries } from './queries/vaultQueries.js';
export type { VaultState } from './queries/vaultQueries.js';
export type { QueryContext } from './queries/context.js';

// Indexer client
export { IndexerClient } from './queries/indexerClient.js';
export type {
	FetchLike,
	FlushExecuted,
	IndexerClientOptions,
	IndexerEvent,
	LpRequestState,
	MarketCreated,
	MarketOpenInterest,
	OrderState,
	PredictManagerCreated,
	StatusResponse,
	TimeWindow,
} from './queries/indexerClient.js';
