// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The Exponentially Weighted Moving Average (EWMA) state for DeepBook This state
 * is used to calculate the smoothed mean and variance of gas prices and apply a
 * penalty to taker fees based on the Z-score of the current gas price relative to
 * the smoothed mean and variance. The state is enabled by default and can be
 * configured with different parameters.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@deepbook/core::ewma';
export const EWMAState = new MoveStruct({
	name: `${$moduleName}::EWMAState`,
	fields: {
		mean: bcs.u64(),
		variance: bcs.u64(),
		alpha: bcs.u64(),
		z_score_threshold: bcs.u64(),
		additional_taker_fee: bcs.u64(),
		last_updated_timestamp: bcs.u64(),
		enabled: bcs.bool(),
	},
});
