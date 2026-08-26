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

import {
	TESTNET_ACCOUNT,
	TESTNET_DEPLOYMENT,
	TESTNET_PREDICT,
	TESTNET_SESSIONS,
	TESTNET_UNITS,
} from './testnet.js';

export { TESTNET_ACCOUNT, TESTNET_DEPLOYMENT, TESTNET_PREDICT, TESTNET_SESSIONS, TESTNET_UNITS };

/** Networks this package carries ids for. Predict and sessions are testnet-only so far. */
export type DeployedNetwork = 'testnet';

/**
 * @description Which deployment the ids on `network` came from — its name and the
 * deepbookv3 commit they were generated at. Useful when a bug report needs to say which
 * on-chain deployment an SDK build was pinned to.
 * @throws if the network has no deployment recorded, rather than returning placeholder ids.
 */
export function getDeployment(network: DeployedNetwork | 'mainnet') {
	if (network === 'testnet') return TESTNET_DEPLOYMENT;
	throw new Error(
		`no deployment recorded for network: ${network}. ` +
			'Predict, sessions and the account primitive are testnet-only.',
	);
}

/**
 * @description Scale constants for `network` — lot size, fixed-point scale, and coin
 * decimals. Deployment-wide, so any subpath formatting a custody balance can read them
 * rather than hardcoding 6.
 * @throws if the network has no recorded deployment.
 */
export function getUnits(network: DeployedNetwork | 'mainnet') {
	if (network === 'testnet') return TESTNET_UNITS;
	throw new Error(`no deployment recorded for network: ${network}`);
}
