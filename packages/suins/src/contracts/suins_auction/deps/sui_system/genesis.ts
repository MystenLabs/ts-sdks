/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x3::genesis';
export const GenesisValidatorMetadata = new MoveStruct({
	name: `${$moduleName}::GenesisValidatorMetadata`,
	fields: {
		name: bcs.vector(bcs.u8()),
		description: bcs.vector(bcs.u8()),
		image_url: bcs.vector(bcs.u8()),
		project_url: bcs.vector(bcs.u8()),
		sui_address: bcs.Address,
		gas_price: bcs.u64(),
		commission_rate: bcs.u64(),
		protocol_public_key: bcs.vector(bcs.u8()),
		proof_of_possession: bcs.vector(bcs.u8()),
		network_public_key: bcs.vector(bcs.u8()),
		worker_public_key: bcs.vector(bcs.u8()),
		network_address: bcs.vector(bcs.u8()),
		p2p_address: bcs.vector(bcs.u8()),
		primary_address: bcs.vector(bcs.u8()),
		worker_address: bcs.vector(bcs.u8()),
	},
});
export const GenesisChainParameters = new MoveStruct({
	name: `${$moduleName}::GenesisChainParameters`,
	fields: {
		protocol_version: bcs.u64(),
		chain_start_timestamp_ms: bcs.u64(),
		epoch_duration_ms: bcs.u64(),
		/** Stake Subsidy parameters */
		stake_subsidy_start_epoch: bcs.u64(),
		stake_subsidy_initial_distribution_amount: bcs.u64(),
		stake_subsidy_period_length: bcs.u64(),
		stake_subsidy_decrease_rate: bcs.u16(),
		/** Validator committee parameters */
		max_validator_count: bcs.u64(),
		min_validator_joining_stake: bcs.u64(),
		validator_low_stake_threshold: bcs.u64(),
		validator_very_low_stake_threshold: bcs.u64(),
		validator_low_stake_grace_period: bcs.u64(),
	},
});
export const TokenAllocation = new MoveStruct({
	name: `${$moduleName}::TokenAllocation`,
	fields: {
		recipient_address: bcs.Address,
		amount_mist: bcs.u64(),
		/**
		 * Indicates if this allocation should be staked at genesis and with which
		 * validator
		 */
		staked_with_validator: bcs.option(bcs.Address),
	},
});
export const TokenDistributionSchedule = new MoveStruct({
	name: `${$moduleName}::TokenDistributionSchedule`,
	fields: {
		stake_subsidy_fund_mist: bcs.u64(),
		allocations: bcs.vector(TokenAllocation),
	},
});
