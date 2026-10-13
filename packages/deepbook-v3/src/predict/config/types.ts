// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/**
 * The published Move packages a Predict deployment spans.
 *
 * Delayed execution (DBU-885) ships as three packages: the Predict upgrade, the order-flow
 * companion `deepbook_predict_orders` (a fresh publish), and the math library
 * `deepbook_predict_math` (a fresh publish). The queued-order builders, reads and decoders need
 * `predictDelayedExecution`, `predictOrders`, `objects.orderDesk` and `objects.queueRegistry` all
 * recorded, and throw
 * `PredictInputError` otherwise rather than address the wrong package. Pass a custom `config`
 * (a localnet publish) to use them before a network record exists.
 */
export interface PredictPackages {
	/** Latest published package ID, used for Move calls. */
	predict: string;
	/** Original ID for v1 structs/events. Omit only for an unupgraded custom deployment. */
	predictV1?: string;
	/**
	 * The Predict version that introduced delayed execution (Mainnet v4, Testnet v5): the
	 * defining ID of the Predict types and events that version added (`ExpiryPnlRealized`,
	 * `FlushOperatorUpdated`, `OrderFlowUpdated`, `OrderReceipt`). A later upgrade does not move
	 * it, so it is pinned once per network rather than read from the latest publication.
	 */
	predictDelayedExecution?: string;
	/**
	 * Latest published `deepbook_predict_orders` package ID: the call target of every queued-order
	 * entry point (`queue::enqueue_*`, `commit`, `resolve`, `refund`, `settle_step`, …), the queue
	 * reads and the desk setters.
	 */
	predictOrders?: string;
	/**
	 * Original `deepbook_predict_orders` ID, which types `MarketQueue`, `OrderDesk`, the queue
	 * events and the `OrderFlow` witness. Omit until the package is first upgraded: it then
	 * defaults to `predictOrders`.
	 */
	predictOrdersV1?: string;
	/** The `deepbook_predict_math` package ID, for its pure calls and layouts. */
	predictMath?: string;
	account: string;
	propbook: string;
}

/**
 * Per-underlying oracle wiring: the propbook underlying id plus the feed object ids the
 * live pricer reads. Names mirror the deployment manifest
 * (`packages/predict/deployment/deployment.testnet.json` → `underlyings`).
 */
export interface UnderlyingConfig {
	symbol: string;
	propbookUnderlyingId: number;
	/** `&PythFeed` — spot price feed. */
	pythFeed: string;
	/** `&BlockScholesValueStore` — Black-Scholes value store. */
	blockScholesValueStore: string;
	/** `&BlockScholesSVIStore` — SVI-surface store. */
	blockScholesSviStore: string;
}

/** Everything a tx builder or read needs to address a Predict deployment on one network. */
export interface PredictConfig {
	network: 'testnet' | 'mainnet' | 'custom';
	packages: PredictPackages;
	objects: {
		registry: string;
		protocolConfig: string;
		poolVault: string;
		oracleRegistry: string;
		accountRegistry: string;
		/**
		 * The order-flow companion's shared `OrderDesk`: the delayed-execution policy and the
		 * companion's version floor. Created once, by the package's `init` at publish.
		 */
		orderDesk?: string;
		/**
		 * The order-flow companion's shared `QueueRegistry`, created next to the desk by the same
		 * `init`. Each market's `MarketQueue` sits at an ID derived from it and the market
		 * (`deriveQueueId`), and `queue::create_and_share` writes it.
		 */
		queueRegistry?: string;
	};
	/**
	 * The deployment's settlement coin type. Always read this rather than assuming a type:
	 * the contracts renamed the collateral to `usdc::usdc::USDC`, but a deployment published
	 * before that rename still serves its original coin type, and this field is what the
	 * deployment record actually carries.
	 */
	quoteCoinType: string;
	/**
	 * Coin types the deployment owns. `plp` is NOT derivable from `packages.predict`: a Move
	 * type tag keeps the ORIGINAL package id across an upgrade, while `packages.predict`
	 * moves to the latest.
	 */
	coinTypes: { plp: string; deep: string };
	/** Scale constants the deploy owns rather than the SDK. */
	units: {
		positionLotSize: number;
		fixedPointScale: number;
		quoteCoinDecimals: number;
		positionQuantityDecimals: number;
	};
	underlyings: Record<string, UnderlyingConfig>; // keyed by symbol, e.g. "BTC"
	/**
	 * Oracle objects only the delayed-execution filler needs. Optional: traders never pass
	 * them, and a filler can name the Lazer `State` per call instead.
	 */
	oracle?: {
		/** Pyth Lazer's shared `State`, which carries the current Lazer package ID. */
		pythLazerState?: string;
	};
}
