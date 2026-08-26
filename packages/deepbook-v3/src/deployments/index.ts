// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Canonical per-network deployment ids.
 *
 * Every subpath reads its slice of this one record rather than carrying its own copy, so a
 * redeploy is a single regeneration (`pnpm sync-deployment`) and the subpaths cannot end up
 * addressing different deployments. The records themselves are generated from the deploy
 * tooling's manifest — see `scripts/sync-deployment.ts`.
 */

import type { SuiClientTypes } from '@mysten/sui/client';

import {
	TESTNET_ACCOUNT,
	TESTNET_DEPLOYMENT,
	TESTNET_PREDICT,
	TESTNET_SESSIONS,
	TESTNET_UNITS,
} from './testnet.js';
import type { DeploymentInfo, DeploymentUnits } from './types.js';

export type {
	AccountIds,
	DeploymentInfo,
	DeploymentUnits,
	PredictIds,
	SessionsIds,
} from './types.js';

export { TESTNET_ACCOUNT, TESTNET_DEPLOYMENT, TESTNET_PREDICT, TESTNET_SESSIONS, TESTNET_UNITS };

/** Networks this package carries ids for. Predict and sessions are testnet-only so far. */
export type DeployedNetwork = 'testnet';

/**
 * Accepts the same wide network type the Sui client exposes, so `getUnits(client.network)`
 * composes. Narrowing to `DeployedNetwork` would reject that, and listing
 * `'testnet' | 'mainnet'` would be worse still: it admits exactly one value that always
 * throws while rejecting `'devnet'` at compile time.
 */
export type NetworkArg = SuiClientTypes.Network;

function unrecorded(network: string, override: string): Error {
	return new Error(
		`@mysten/deepbook-v3: no deployment recorded for network '${network}'. ` +
			'Predict, sessions and the account primitive are testnet-only today. ' +
			`For your own deployment, ${override}`,
	);
}

/**
 * @description Which deployment the ids on `network` came from — its name and the
 * deepbookv3 commit they were generated at. Useful when a bug report needs to say which
 * on-chain deployment an SDK build was pinned to.
 * @throws if the network has no deployment recorded, rather than returning placeholder ids.
 */
export function getDeployment(network: NetworkArg): DeploymentInfo {
	if (network === 'testnet') return TESTNET_DEPLOYMENT;
	throw unrecorded(network, 'read the deployment name and commit from your own deploy manifest.');
}

/**
 * @description Scale constants for `network` — lot size, fixed-point scale, and coin
 * decimals. Deployment-wide, so any subpath formatting a custody balance can read them
 * rather than hardcoding 6.
 * @throws if the network has no recorded deployment.
 */
export function getUnits(network: NetworkArg): DeploymentUnits {
	if (network === 'testnet') return TESTNET_UNITS;
	throw unrecorded(network, 'read these scale constants from your own deploy manifest.');
}
