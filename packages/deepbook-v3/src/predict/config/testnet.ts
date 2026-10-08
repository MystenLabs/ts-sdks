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
export const TESTNET_CONFIG: PredictConfig = Object.freeze({
	// The record widens `network` to `string` so the published types don't pin a literal;
	// this file is the testnet config by construction.
	network: 'testnet',
	// TODO(DBU-887): `packages.predictDelayedExecution` and `oracle.pythLazerState` stay unset
	// until the Testnet v5 publication is recorded and synced. Until then the queued-order
	// surface (DBU-885) throws on this network, and only a custom `config` reaches it.
	packages: TESTNET_PREDICT.packages,
	objects: TESTNET_PREDICT.objects,
	quoteCoinType: TESTNET_PREDICT.quoteCoinType,
	coinTypes: TESTNET_PREDICT.coinTypes,
	units: TESTNET_PREDICT.units,
	underlyings: TESTNET_PREDICT.underlyings,
});
