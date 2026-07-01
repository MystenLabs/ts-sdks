// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PredictCompatibleClient } from '../client.js';
import type { PredictConfig } from '../utils/config.js';

/** Shared context handed to every on-chain query class. */
export interface QueryContext {
	client: PredictCompatibleClient;
	config: PredictConfig;
	address: string;
}
