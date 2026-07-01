// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientRegistration, SuiClientTypes } from '@mysten/sui/client';
import { normalizeSuiAddress } from '@mysten/sui/utils';

import { IndexerClient } from './queries/indexerClient.js';
import { MarketQueries } from './queries/marketQueries.js';
import { VaultQueries } from './queries/vaultQueries.js';
import { AccountContract } from './transactions/account.js';
import { FlushContract } from './transactions/flush.js';
import { LpContract } from './transactions/lp.js';
import { PredictAccountContract } from './transactions/predictAccount.js';
import { TradeContract } from './transactions/trade.js';
import { PredictConfig } from './utils/config.js';
import type { PredictIds, PredictNetwork } from './utils/config.js';

/** A Sui client with the core API (`client.core.simulateTransaction`) the queries use. */
export interface PredictCompatibleClient extends ClientWithCoreApi {}

export interface PredictOptions<Name = 'predict'> {
	/** Default sender for built transactions. */
	address: string;
	/** On-chain package + shared-object ids. Required until Predict is published. */
	ids: PredictIds;
	/** Optional `predict-server` base URL enabling the indexer read helpers. */
	indexerUrl?: string;
	name?: Name;
}

export interface PredictClientOptions extends PredictOptions {
	client: PredictCompatibleClient;
	network: SuiClientTypes.Network;
}

/**
 * Facade over the Predict transaction builders + on-chain/indexer queries.
 *
 * Construct directly, or register onto a Sui client with
 * `suiClient.$extend(predict({ address, ids }))` and use `suiClient.predict`.
 */
export class PredictClient {
	readonly config: PredictConfig;

	// Transaction builders
	readonly account: AccountContract;
	readonly predictAccount: PredictAccountContract;
	readonly trade: TradeContract;
	readonly lp: LpContract;
	readonly flush: FlushContract;

	// On-chain read helpers
	readonly market: MarketQueries;
	readonly vault: VaultQueries;

	/** Indexer read helpers; present only when `indexerUrl` was configured. */
	readonly indexer?: IndexerClient;

	constructor({ client, network, address, ids, indexerUrl }: PredictClientOptions) {
		const normalizedAddress = normalizeSuiAddress(address);
		this.config = new PredictConfig({
			network: network as PredictNetwork,
			address: normalizedAddress,
			indexerUrl,
			ids,
		});

		this.account = new AccountContract(this.config);
		this.predictAccount = new PredictAccountContract(this.config);
		this.trade = new TradeContract(this.config);
		this.lp = new LpContract(this.config);
		this.flush = new FlushContract(this.config);

		const ctx = { client, config: this.config, address: normalizedAddress };
		this.market = new MarketQueries(ctx);
		this.vault = new VaultQueries(ctx);

		if (indexerUrl) {
			this.indexer = new IndexerClient({ baseUrl: indexerUrl });
		}
	}
}

/** `$extend` registration: `suiClient.$extend(predict({ address, ids }))`. */
export function predict<Name extends string = 'predict'>({
	name = 'predict' as Name,
	...options
}: PredictOptions<Name>): SuiClientRegistration<PredictCompatibleClient, Name, PredictClient> {
	return {
		name,
		register: (client) => {
			return new PredictClient({ client, network: client.network, ...options });
		},
	};
}
