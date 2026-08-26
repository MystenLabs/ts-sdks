// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TESTNET_PREDICT } from '../../deployments/testnet.js';
import type { PredictConfig } from './types.js';

/**
 * Testnet deployment constants, read from the shared generated record in
 * `src/deployments/` rather than transcribed here. `/account` and `/sessions` read slices of
 * that same record, so a redeploy (`pnpm sync-deployment`) moves every subpath together and
 * they cannot end up addressing different deployments.
 *
 * The record is generated from the deploy tooling's `deployment.testnet.json`; see
 * `scripts/sync-deployment.ts`. `getDeployment('testnet')` names the deployment and the
 * deepbookv3 commit these ids came from.
 */
export const TESTNET_CONFIG: PredictConfig = {
	network: TESTNET_PREDICT.network,
	packages: { ...TESTNET_PREDICT.packages },
	objects: { ...TESTNET_PREDICT.objects },
	quoteCoinType: TESTNET_PREDICT.quoteCoinType,
	underlyings: Object.fromEntries(
		Object.entries(TESTNET_PREDICT.underlyings).map(([symbol, u]) => [symbol, { ...u }]),
	),
};
