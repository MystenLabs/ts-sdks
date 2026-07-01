// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';

import * as account from '../contracts/account/account.js';
import * as expiryMarket from '../contracts/deepbook_predict/expiry_market.js';
import type { PredictConfig } from '../utils/config.js';
import { ACCUMULATOR_ROOT_ID, U64_MAX } from '../utils/constants.js';

/**
 * The four canonical propbook feed object ids for a market's underlying. Resolve them
 * from the `OracleRegistry` via `propbook_*_id_for_underlying(market.propbook_underlying_id)`
 * (a query helper for this lands in a later milestone); they must be the current
 * canonical feeds or `load_live_pricer` aborts.
 */
export interface PricerFeeds {
	pyth: string;
	bsSpot: string;
	bsForward: string;
	bsSvi: string;
}

/**
 * Trader flows over `expiry_market`.
 *
 * Live-priced flows (mint, `redeemLive`, `currentNav`) take a `Pricer` — build it once
 * per market per transaction with {@link TradeContract.loadLivePricer} and thread the
 * returned value in (it is `copy`/`drop` and bound to that one market). Owner actions
 * mint a fresh `Auth` internally. `Clock` is auto-injected; `AccumulatorRoot` (`0xacc`)
 * is passed explicitly for the internal DUSDC settle.
 */
export class TradeContract {
	#config: PredictConfig;

	constructor(config: PredictConfig) {
		this.#config = config;
	}

	get #predictPackageId() {
		return this.#config.ids.predictPackageId;
	}

	#auth(tx: Transaction) {
		if (this.#config.address) {
			tx.setSenderIfNotSet(this.#config.address);
		}
		return tx.add(account.generateAuth({ package: this.#config.ids.accountPackageId }));
	}

	/**
	 * Load a live `Pricer` bound to `market`. Returns the pricer to thread into mint /
	 * `redeemLive` / `currentNav` in the SAME transaction.
	 */
	loadLivePricer = (params: { market: string; feeds: PricerFeeds }) => (tx: Transaction) =>
		tx.add(
			expiryMarket.loadLivePricer({
				package: this.#predictPackageId,
				arguments: {
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
	 * Mint an exact contract quantity. `quantity` is in quote units (a multiple of the
	 * position lot size); `leverage` is 1e9-scaled; `maxCost` (all-in DUSDC) and
	 * `maxProbability` (1e9-scaled) are slippage caps, defaulting to uncapped. Returns
	 * the minted order id (`u256`) as a transaction result.
	 */
	mintExactQuantity =
		(params: {
			market: string;
			account: string;
			pricer: TransactionArgument;
			lowerTick: bigint | number;
			higherTick: bigint | number;
			quantity: bigint | number;
			leverage: bigint | number;
			maxCost?: bigint | number;
			maxProbability?: bigint | number;
		}) =>
		(tx: Transaction) => {
			const auth = this.#auth(tx);
			return tx.add(
				expiryMarket.mintExactQuantity({
					package: this.#predictPackageId,
					arguments: {
						market: params.market,
						wrapper: params.account,
						auth,
						config: this.#config.ids.protocolConfigId,
						pricer: params.pricer,
						lowerTick: params.lowerTick,
						higherTick: params.higherTick,
						quantity: params.quantity,
						leverage: params.leverage,
						maxCost: params.maxCost ?? U64_MAX,
						maxProbability: params.maxProbability ?? U64_MAX,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);
		};

	/**
	 * Mint as much quantity as `amount` (net-premium budget, raw DUSDC) buys. `minQuantity`
	 * is the slippage guard; fees/penalty are charged on top of `amount`. Returns the
	 * minted order id (`u256`).
	 */
	mintExactAmount =
		(params: {
			market: string;
			account: string;
			pricer: TransactionArgument;
			lowerTick: bigint | number;
			higherTick: bigint | number;
			amount: bigint | number;
			minQuantity: bigint | number;
			leverage: bigint | number;
		}) =>
		(tx: Transaction) => {
			const auth = this.#auth(tx);
			return tx.add(
				expiryMarket.mintExactAmount({
					package: this.#predictPackageId,
					arguments: {
						market: params.market,
						wrapper: params.account,
						auth,
						config: this.#config.ids.protocolConfigId,
						pricer: params.pricer,
						lowerTick: params.lowerTick,
						higherTick: params.higherTick,
						amount: params.amount,
						minQuantity: params.minQuantity,
						leverage: params.leverage,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);
		};

	/**
	 * Close (fully or partially) a live position. `minProbability` / `minProceeds`
	 * (default 0 = disabled) are slippage floors. Returns `(closedOrderId, Option<replacementOrderId>)`;
	 * a partial close yields a `Some` replacement.
	 */
	redeemLive =
		(params: {
			market: string;
			account: string;
			pricer: TransactionArgument;
			orderId: bigint | number;
			closeQuantity: bigint | number;
			minProbability?: bigint | number;
			minProceeds?: bigint | number;
		}) =>
		(tx: Transaction) => {
			const auth = this.#auth(tx);
			return tx.add(
				expiryMarket.redeemLive({
					package: this.#predictPackageId,
					arguments: {
						market: params.market,
						wrapper: params.account,
						auth,
						config: this.#config.ids.protocolConfigId,
						pricer: params.pricer,
						orderId: params.orderId,
						closeQuantity: params.closeQuantity,
						minProbability: params.minProbability ?? 0,
						minProceeds: params.minProceeds ?? 0,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);
		};

	/**
	 * Redeem a settled position at its terminal payout (owner authority). `closeQuantity`
	 * must equal the full order quantity. Needs the underlying's Pyth feed for the settled
	 * spot; no pricer.
	 */
	redeemSettled =
		(params: {
			market: string;
			account: string;
			pyth: string;
			orderId: bigint | number;
			closeQuantity: bigint | number;
		}) =>
		(tx: Transaction) => {
			const auth = this.#auth(tx);
			return tx.add(
				expiryMarket.redeemSettled({
					package: this.#predictPackageId,
					arguments: {
						market: params.market,
						wrapper: params.account,
						auth,
						config: this.#config.ids.protocolConfigId,
						propbookRegistry: this.#config.ids.oracleRegistryId,
						pyth: params.pyth,
						orderId: params.orderId,
						closeQuantity: params.closeQuantity,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);
		};

	/**
	 * Permissionless settled redeem (keeper path) — uses app-auth from the account
	 * registry instead of owner `Auth`. Aborts if `PredictApp` has been deauthorized.
	 */
	redeemSettledPermissionless =
		(params: {
			market: string;
			account: string;
			pyth: string;
			orderId: bigint | number;
			closeQuantity: bigint | number;
		}) =>
		(tx: Transaction) =>
			tx.add(
				expiryMarket.redeemSettledPermissionless({
					package: this.#predictPackageId,
					arguments: {
						market: params.market,
						accountRegistry: this.#config.ids.accountRegistryId,
						wrapper: params.account,
						config: this.#config.ids.protocolConfigId,
						propbookRegistry: this.#config.ids.oracleRegistryId,
						pyth: params.pyth,
						orderId: params.orderId,
						closeQuantity: params.closeQuantity,
						root: ACCUMULATOR_ROOT_ID,
					},
				}),
			);

	/** Exact live NAV of a market (read; use with `devInspect`). Requires a market-bound pricer. */
	currentNav = (params: { market: string; pricer: TransactionArgument }) => (tx: Transaction) =>
		tx.add(
			expiryMarket.currentNav({
				package: this.#predictPackageId,
				arguments: { market: params.market, pricer: params.pricer },
			}),
		);

	/** Set the market's reference tick from the underlying's current Pyth spot. */
	setReferenceTick = (params: { market: string; pyth: string }) => (tx: Transaction) =>
		tx.add(
			expiryMarket.setReferenceTick({
				package: this.#predictPackageId,
				arguments: {
					market: params.market,
					config: this.#config.ids.protocolConfigId,
					propbookRegistry: this.#config.ids.oracleRegistryId,
					pyth: params.pyth,
				},
			}),
		);
}
