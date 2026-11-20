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
	/**
	 * ORIGINAL `account` package ID: type tags (`DataKey`, events) and the derived wrapper and
	 * account addresses are built from it, so it never moves.
	 */
	account: string;
	/**
	 * Latest `account` package once the network has upgraded it: the call target of every account
	 * call in a Predict PTB (`generate_auth`, `deposit_funds`, `load_account`, …). A PTB can't call
	 * a package at an older version than another package in it links, and Predict's Version 5
	 * links account v2. Omit while account is at v1: calls then target `account`.
	 */
	accountLatest?: string;
	propbook: string;
	/**
	 * Predict's `constants::current_version` compiled into `predict`, the call target. A
	 * `ProtocolConfig.version_watermark` above it retires the code this config calls. It follows the
	 * Mainnet package number, not the Testnet one (Testnet's package v8 compiles 5). Defaults to
	 * `PREDICT_PACKAGE_VERSION`, the version these bindings were generated from.
	 */
	predictCurrentVersion?: bigint;
	/**
	 * `desk::current_version` compiled into `predictOrders`. A desk floor above it retires the
	 * order-flow code this config calls. Defaults to `ORDER_FLOW_PACKAGE_VERSION`.
	 */
	predictOrdersCurrentVersion?: bigint;
	/**
	 * Predict package version 6, which reads no Propbook object. Set together with
	 * `predictOrdersV3`, it switches the config to the signed-data flow: every Predict call targets
	 * it (a PTB can't call an older Predict than the order-flow package links), placement uses the
	 * oracle-free `_v2` entry points, and the version guards expect 6. It is also the defining ID
	 * of the types version 6 adds (`OracleBindingKey`, `OracleBinding`, `OracleBindingUpdated`).
	 * Unset until that publication is recorded: the network records carry a TODO placeholder.
	 */
	predictV6?: string;
	/**
	 * `deepbook_predict_orders` version 3, the call target of the oracle-free `queue::enqueue_*_v2`
	 * and `queue::commit_v2`, and of every other order-flow call once set. Also the defining ID of
	 * the types it adds (`BsTimingKey`, `BsTiming`, `BsTimingUpdated`). Unset until recorded.
	 */
	predictOrdersV3?: string;
	/**
	 * The `deepbook_predict_math` publication that adds `block_scholes` (`BsVol`, `vols`), the call
	 * target `commitV2` builds the committed volatility with. Unset until recorded.
	 */
	predictMathV3?: string;
}

/**
 * Per-underlying oracle wiring: the propbook underlying id plus the feed object ids the
 * version 5 pricer reads. Names mirror the deployment manifest
 * (`packages/predict/deployment/deployment.testnet.json` → `underlyings`). The signed-data flow
 * (`packages.predictV6`) reads only `propbookUnderlyingId`, which keys the market's oracle binding.
 * The three Propbook object ids stay for configs whose call targets are still version 5.
 */
export interface UnderlyingConfig {
	symbol: string;
	propbookUnderlyingId: number;
	/** `&PythFeed` — spot price feed. Version 5 placement only. */
	pythFeed: string;
	/** `&BlockScholesValueStore` — Black-Scholes value store. Version 5 placement only. */
	blockScholesValueStore: string;
	/** `&BlockScholesSVIStore` — SVI-surface store. Version 5 placement only. */
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
	 * them, and a filler can name them per call instead.
	 */
	oracle?: {
		/** Pyth Lazer's shared `State`, which carries the current Lazer package ID. */
		pythLazerState?: string;
		/** The Block Scholes verifier package (`bs_oracle`), which `commitV2` calls to verify batches. */
		blockScholesPackage?: string;
		/** The verifier's shared `SignerRegistry`. */
		blockScholesSignerRegistry?: string;
	};
}
