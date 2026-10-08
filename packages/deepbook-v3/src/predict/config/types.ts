// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/** The three published Move packages a Predict deployment spans. */
export interface PredictPackages {
	/** Latest published package ID, used for Move calls. */
	predict: string;
	/** Original ID for v1 structs/events. Omit only for an unupgraded custom deployment. */
	predictV1?: string;
	/**
	 * The package version that introduced delayed execution (DBU-885): the defining ID of the
	 * `order_queue` and `delayed_execution_config` types and of the queued-order events
	 * (`OrderEnqueued`, `QueuedOrderFilled`, …). Mainnet v4 and Testnet v5. A later upgrade
	 * does not move it, so it is pinned once per network rather than read from the latest
	 * publication.
	 *
	 * Unset means this SDK version has no record of delayed execution on the network: the
	 * queued-order builders, reads and decoders throw `PredictInputError` instead of
	 * addressing the wrong package. Pass a custom `config` (a localnet publish) to use them
	 * before a network record exists.
	 */
	predictDelayedExecution?: string;
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
