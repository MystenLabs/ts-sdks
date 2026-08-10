/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * DEEP staking benefit policy: the stake curve and how much of it pays out.
 *
 * Benefits scale with active stake along a two-segment curve: the curve rises
 * linearly from 0 to half of max over `0..lower_benefit_power`, then from half to
 * full over `lower_benefit_power..upper_benefit_power`, capped at full above.
 * `max_benefit_ratio` then scales that curve, so it sets how much of the programme
 * runs — `0` pays nothing at any stake, `float_scaling` runs it at full strength.
 * The resulting benefit ratio scales the fixed `constants::max_fee_discount` for
 * fees, and applies directly to settled trading-loss rebates.
 *
 * Each `ExpiryMarket` snapshots this whole config at creation and prices both
 * benefits against its own copy; the one on `ProtocolConfig` is only the template
 * future markets will snapshot. Nothing here is read live, because both benefits
 * resolve after the trade that earned them — the fee discount at mint, the rebate
 * at a post-settlement claim — so a live value would let an admin reprice
 * contracts already written and shrink a rebate already earned.
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
		/**
		 * Ceiling on the benefit ratio, in FLOAT_SCALING. Scales the whole curve, so `0`
		 * disables every staking benefit and `float_scaling` runs the programme at full
		 * strength. Ships at 0.
		 */
		max_benefit_ratio: bcs.u64(),
	},
});
