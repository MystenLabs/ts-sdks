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
	// Delayed execution (DBU-885) is recorded on Mainnet. The generated record carries the package
	// IDs that move with upgrades (Predict, `deepbook_predict_orders`, `deepbook_predict_math`) and
	// the Lazer `State`. The three IDs pinned below are in no publication record and never move:
	// the Predict version that introduced delayed execution (Mainnet v4), which defines its new
	// types and events, and the `OrderDesk` and `QueueRegistry` that `deepbook_predict_orders`'s
	// `init` shared at publish.
	packages: Object.freeze({
		...MAINNET_PREDICT.packages,
		predictDelayedExecution: '0x98235c5842831c9b5f51dc637cf34c91db2aca5510802eb6ebfec63f5b71a7bb',
	}),
	objects: Object.freeze({
		...MAINNET_PREDICT.objects,
		orderDesk: '0x87b0a87262aacf58eaff567eed2fb7cb0f9cbc1f5ce33ef79216cd26d13a1b5b',
		queueRegistry: '0x8d4f0c671862f065ac7f2c2cb24abc47cf75ed8fc8e5e52c1d4bdfa53eee164f',
	}),
	quoteCoinType: MAINNET_PREDICT.quoteCoinType,
	coinTypes: MAINNET_PREDICT.coinTypes,
	units: MAINNET_PREDICT.units,
	underlyings: MAINNET_PREDICT.underlyings,
	oracle: MAINNET_PREDICT.oracle,
});
