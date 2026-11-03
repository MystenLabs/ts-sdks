// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Shapes for the generated deployment records.
 *
 * The generated file annotates each record with one of these rather than using `as const`.
 * That matters for consumers: `as const` would publish the literal ids in the `.d.mts`, so
 * `getDeployment('testnet').network === 'mainnet'` would be a compile ERROR rather than
 * `false`, spreading a record to override one field would fail, and every redeploy would
 * silently change the published types.
 */

/** Which on-chain deployment a set of ids came from. */
export interface DeploymentInfo {
	deployment: string;
	network: string;
	chainId: string;
	/** The initial deployment's source commit; later package IDs come from Published.toml. */
	sourceCommit: string;
}

/**
 * Scale constants the deployment owns rather than the SDK.
 *
 * Only `positionLotSize` is currently read by the SDK (`PredictClient#assertLot`); the other
 * three are shipped as the deployment's own record of its scales. `units.ts` still hardcodes
 * the USDC and fixed-point decimals, so do not read this as "the SDK derives its scaling
 * from here" — wiring that up is separate work.
 */
export interface DeploymentUnits {
	/** Predict-only: order quantity must be a whole number of these. */
	positionLotSize: number;
	fixedPointScale: number;
	quoteCoinDecimals: number;
	positionQuantityDecimals: number;
}

/** Ids for the shared `account` primitive. */
export interface AccountIds {
	/**
	 * The ORIGINAL `account` package ID. Type tags and the derived wrapper and account addresses
	 * are built from it, because Move types keep their defining package across upgrades. Moving it
	 * to a newer package would derive addresses nothing lives at.
	 */
	accountPackageId: string;
	accountRegistry: string;
	/**
	 * The latest `account` package, once the network has upgraded it: the call target of every
	 * account call. A PTB can't call a package at an older version than another package in it
	 * links (Predict's Version 5 links account v2), and `receive_coin` only exists from v2.
	 * Absent while the network runs v1. Never used for type tags or derived addresses.
	 */
	accountPackageIdLatest?: string;
}

/** Ids for time-limited sessions, including the spot- and Predict-only extras. */
export interface SessionsIds extends AccountIds {
	sessionsPackageId: string;
	/** Original package ID for existing structs and dynamic-field keys. */
	sessionsPackageIdV1: string;
	sessionsConfig: string;
	/** Spot wrappers only. */
	deepbookRegistry: string;
	/** Spot wrappers only. */
	deepbookCoreAccountPackageId: string;
	/** Every Predict wrapper takes `config: &ProtocolConfig`. */
	protocolConfig: string;
}

/** Per-underlying oracle wiring. */
export interface UnderlyingIds {
	symbol: string;
	propbookUnderlyingId: number;
	pythFeed: string;
	blockScholesValueStore: string;
	blockScholesSviStore: string;
}

/** Ids for DeepBook Predict. */
export interface PredictIds {
	network: string;
	packages: {
		predict: string;
		predictV1: string;
		account: string;
		propbook: string;
		/** Latest `deepbook_predict_orders`, once the network records delayed execution. */
		predictOrders?: string;
		/** Its original ID, only once it differs from `predictOrders`. */
		predictOrdersV1?: string;
		/** `deepbook_predict_math`, once the network records delayed execution. */
		predictMath?: string;
		/** Latest `account`, once the network has upgraded it. `account` stays the original ID. */
		accountLatest?: string;
	};
	objects: {
		registry: string;
		protocolConfig: string;
		poolVault: string;
		oracleRegistry: string;
		accountRegistry: string;
	};
	quoteCoinType: string;
	coinTypes: { plp: string; deep: string };
	units: DeploymentUnits;
	underlyings: Record<string, UnderlyingIds>;
	/** Pyth Lazer's shared `State`, recorded with delayed execution. */
	oracle?: { pythLazerState: string };
}
