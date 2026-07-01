// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';

import * as plp from '../contracts/deepbook_predict/plp.js';
import * as registry from '../contracts/deepbook_predict/registry.js';
import type { PredictConfig } from '../utils/config.js';
import type { PricerFeeds } from './trade.js';

/**
 * Keeper flush over `plp` — the pool valuation + LP-queue drain.
 *
 * The flush is one PTB threading two abilityless hot potatoes: `MarketLifecycleProof`
 * (proves an allowlisted `MarketLifecycleCap`) and `PoolValuation`. Use {@link
 * FlushContract.fullFlush} to build the whole `generateLifecycleProof →
 * startPoolValuation → valueExpiry (per active market) → finishFlush` sequence; the
 * primitives are exposed for custom composition. Every active market from
 * `plp::active_expiry_markets(vault)` must be valued exactly once or `finishFlush`
 * aborts, and `valueExpiry` builds its own pricer, so each entry needs the market's
 * four propbook feeds.
 */
export class FlushContract {
	#config: PredictConfig;

	constructor(config: PredictConfig) {
		this.#config = config;
	}

	get #predictPackageId() {
		return this.#config.ids.predictPackageId;
	}

	/** Mint a `MarketLifecycleProof` from an allowlisted `MarketLifecycleCap`. */
	generateLifecycleProof = (params: { lifecycleCap: string }) => (tx: Transaction) =>
		tx.add(
			registry.generateLifecycleProof({
				package: this.#predictPackageId,
				arguments: { registry: this.#config.ids.registryId, lifecycleCap: params.lifecycleCap },
			}),
		);

	/** Consume the proof, engage the valuation lock, snapshot active markets; returns `PoolValuation`. */
	startPoolValuation = (params: { proof: TransactionArgument }) => (tx: Transaction) =>
		tx.add(
			plp.startPoolValuation({
				package: this.#predictPackageId,
				arguments: {
					config: this.#config.ids.protocolConfigId,
					vault: this.#config.ids.poolVaultId,
					lifecycleProof: params.proof,
				},
			}),
		);

	/** Fold one market's NAV into the valuation (builds its pricer from the market's feeds). */
	valueExpiry =
		(params: { valuation: TransactionArgument; market: string; feeds: PricerFeeds }) =>
		(tx: Transaction) =>
			tx.add(
				plp.valueExpiry({
					package: this.#predictPackageId,
					arguments: {
						valuation: params.valuation,
						vault: this.#config.ids.poolVaultId,
						market: params.market,
						config: this.#config.ids.protocolConfigId,
						propbookRegistry: this.#config.ids.oracleRegistryId,
						pyth: params.feeds.pyth,
						bsSpot: params.feeds.bsSpot,
						bsForward: params.feeds.bsForward,
						bsSvi: params.feeds.bsSvi,
					},
				}),
			);

	/**
	 * Consume the valuation, price pool NAV, and drain the LP queues at that mark.
	 * `supplyBudget`/`withdrawBudget` cap how many requests drain (null = drain fully).
	 * Returns LP-attributable pool NAV (u64).
	 */
	finishFlush =
		(params: {
			valuation: TransactionArgument;
			supplyBudget?: bigint | number | null;
			withdrawBudget?: bigint | number | null;
		}) =>
		(tx: Transaction) =>
			tx.add(
				plp.finishFlush({
					package: this.#predictPackageId,
					arguments: {
						valuation: params.valuation,
						vault: this.#config.ids.poolVaultId,
						config: this.#config.ids.protocolConfigId,
						supplyBudget: params.supplyBudget ?? null,
						withdrawBudget: params.withdrawBudget ?? null,
					},
				}),
			);

	/**
	 * Build the complete flush in one PTB. `markets` must be every active market
	 * (read `plp::active_expiry_markets`), each with its four resolved propbook feeds.
	 */
	fullFlush =
		(params: {
			lifecycleCap: string;
			markets: Array<{ market: string; feeds: PricerFeeds }>;
			supplyBudget?: bigint | number | null;
			withdrawBudget?: bigint | number | null;
		}) =>
		(tx: Transaction) => {
			const proof = tx.add(this.generateLifecycleProof({ lifecycleCap: params.lifecycleCap }));
			const valuation = tx.add(this.startPoolValuation({ proof }));
			for (const m of params.markets) {
				tx.add(this.valueExpiry({ valuation, market: m.market, feeds: m.feeds }));
			}
			return tx.add(
				this.finishFlush({
					valuation,
					supplyBudget: params.supplyBudget,
					withdrawBudget: params.withdrawBudget,
				}),
			);
		};
}
