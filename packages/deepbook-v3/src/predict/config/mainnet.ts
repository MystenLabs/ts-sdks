// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { MAINNET_PREDICT } from '../../deployments/mainnet.js';
import type { PredictConfig } from './types.js';

/**
 * Mainnet deployment constants, read from the shared generated record in
 * `src/deployments/` rather than transcribed here. `/account` and `/sessions` read slices of
 * that same record, so a redeploy (`pnpm sync-deployment`) moves every subpath together and
 * they cannot end up addressing different deployments.
 *
 * The record is generated from the deploy tooling's `deployment.mainnet.json`; see
 * `scripts/sync-deployment.ts`. `getDeployment('mainnet')` names the deployment and the
 * deepbookv3 commit these ids came from.
 */
export const MAINNET_CONFIG: PredictConfig = Object.freeze({
	// The record widens `network` to `string` so the published types don't pin a literal;
	// this file is the mainnet config by construction.
	network: 'mainnet',
	// TODO(DBU-887): delayed execution is not recorded here yet. `packages.predictDelayedExecution`
	// (Mainnet v4), `packages.predictOrders`, `packages.predictMath`, `objects.orderDesk` and
	// `oracle.pythLazerState` stay unset until the Predict upgrade and the two fresh publishes
	// (`deepbook_predict_orders`, `deepbook_predict_math`) are recorded and synced. Until then the
	// queued-order surface (DBU-885) throws on this network, and only a custom `config` reaches it.
	packages: MAINNET_PREDICT.packages,
	objects: MAINNET_PREDICT.objects,
	quoteCoinType: MAINNET_PREDICT.quoteCoinType,
	coinTypes: MAINNET_PREDICT.coinTypes,
	units: MAINNET_PREDICT.units,
	underlyings: MAINNET_PREDICT.underlyings,
});
