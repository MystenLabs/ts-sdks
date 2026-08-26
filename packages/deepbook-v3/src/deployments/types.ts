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
	/** The deepbookv3 commit the deployed Move sources were built from. */
	sourceCommit: string;
}

/**
 * Scale constants the deployment owns rather than the SDK.
 *
 * Only `positionLotSize` is currently read by the SDK (`PredictClient#assertLot`); the other
 * three are shipped as the deployment's own record of its scales. `units.ts` still hardcodes
 * the DUSDC and fixed-point decimals, so do not read this as "the SDK derives its scaling
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
	accountPackageId: string;
	accountRegistry: string;
}

/** Ids for time-limited sessions, including the spot- and Predict-only extras. */
export interface SessionsIds extends AccountIds {
	sessionsPackageId: string;
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
	packages: { predict: string; account: string; propbook: string };
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
}
