/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Admin-tunable DEEP staking parameters and the benefit curve they drive.
 *
 * Benefits scale with active stake along a two-segment curve: the benefit ratio
 * rises linearly from 0 to half of max over `0..lower_benefit_power`, then from
 * half to full over `lower_benefit_power..upper_benefit_power`, capped at full
 * above. That ratio scales the fixed `constants::max_fee_discount` for fees. The
 * same benefit ratio scales settled trading-loss rebates.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::stake_config';
export const StakeConfig = new MoveStruct({
	name: `${$moduleName}::StakeConfig`,
	fields: {
		/** Active stake at the curve kink (half of max benefits), in raw DEEP units. */
		lower_benefit_power: bcs.u64(),
		/** Active stake for full (max) benefits, in raw DEEP units. */
		upper_benefit_power: bcs.u64(),
	},
});
