/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The Exponentially Weighted Moving Average (EWMA) state for DeepBook This state
 * is used to calculate the smoothed mean and variance of gas prices and apply a
 * penalty to taker fees based on the Z-score of the current gas price relative to
 * the smoothed mean and variance. The state is disabled by default and can be
 * configured with different parameters.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@deepbook/core::ewma';
export const EWMAState: MoveStruct<{
	mean: ReturnType<typeof bcs.u64>;
	variance: ReturnType<typeof bcs.u64>;
	alpha: ReturnType<typeof bcs.u64>;
	z_score_threshold: ReturnType<typeof bcs.u64>;
	additional_taker_fee: ReturnType<typeof bcs.u64>;
	last_updated_timestamp: ReturnType<typeof bcs.u64>;
	enabled: ReturnType<typeof bcs.bool>;
}> = new MoveStruct({
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
export const EWMAUpdate: MoveStruct<{
	pool_id: typeof bcs.Address;
	gas_price: ReturnType<typeof bcs.u64>;
	mean: ReturnType<typeof bcs.u64>;
	variance: ReturnType<typeof bcs.u64>;
	timestamp: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::EWMAUpdate`,
	fields: {
		pool_id: bcs.Address,
		gas_price: bcs.u64(),
		mean: bcs.u64(),
		variance: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
