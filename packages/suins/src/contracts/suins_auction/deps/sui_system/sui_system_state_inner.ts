/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as bag from '../sui/bag.js';
import * as validator_set from './validator_set.js';
import * as storage_fund from './storage_fund.js';
import * as vec_map from '../sui/vec_map.js';
import * as vec_set from '../sui/vec_set.js';
import * as stake_subsidy from './stake_subsidy.js';
import * as balance from '../sui/balance.js';
const $moduleName = '0x3::sui_system_state_inner';
export const ExecutionTimeObservationChunkKey = new MoveStruct({
	name: `${$moduleName}::ExecutionTimeObservationChunkKey`,
	fields: {
		chunk_index: bcs.u64(),
	},
});
export const SystemParameters = new MoveStruct({
	name: `${$moduleName}::SystemParameters`,
	fields: {
		/** The duration of an epoch, in milliseconds. */
		epoch_duration_ms: bcs.u64(),
		/** The starting epoch in which stake subsidies start being paid out */
		stake_subsidy_start_epoch: bcs.u64(),
		/**
		 * Deprecated. Maximum number of active validators at any moment. We do not allow
		 * the number of validators in any epoch to go above this.
		 */
		max_validator_count: bcs.u64(),
		/** Deprecated. Lower-bound on the amount of stake required to become a validator. */
		min_validator_joining_stake: bcs.u64(),
		/**
		 * Validators with stake amount below `validator_low_stake_threshold` are
		 * considered to have low stake and will be escorted out of the validator set after
		 * being below this threshold for more than `validator_low_stake_grace_period`
		 * number of epochs.
		 */
		validator_low_stake_threshold: bcs.u64(),
		/**
		 * Deprecated. Validators with stake below `validator_very_low_stake_threshold`
		 * will be removed immediately at epoch change, no grace period.
		 */
		validator_very_low_stake_threshold: bcs.u64(),
		/**
		 * A validator can have stake below `validator_low_stake_threshold` for this many
		 * epochs before being kicked out.
		 */
		validator_low_stake_grace_period: bcs.u64(),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export const SystemParametersV2 = new MoveStruct({
	name: `${$moduleName}::SystemParametersV2`,
	fields: {
		/** The duration of an epoch, in milliseconds. */
		epoch_duration_ms: bcs.u64(),
		/** The starting epoch in which stake subsidies start being paid out */
		stake_subsidy_start_epoch: bcs.u64(),
		/** Minimum number of active validators at any moment. */
		min_validator_count: bcs.u64(),
		/**
		 * Maximum number of active validators at any moment. We do not allow the number of
		 * validators in any epoch to go above this.
		 */
		max_validator_count: bcs.u64(),
		/** Deprecated. Lower-bound on the amount of stake required to become a validator. */
		min_validator_joining_stake: bcs.u64(),
		/**
		 * Deprecated. Validators with stake amount below `validator_low_stake_threshold`
		 * are considered to have low stake and will be escorted out of the validator set
		 * after being below this threshold for more than
		 * `validator_low_stake_grace_period` number of epochs.
		 */
		validator_low_stake_threshold: bcs.u64(),
		/**
		 * Deprecated. Validators with stake below `validator_very_low_stake_threshold`
		 * will be removed immediately at epoch change, no grace period.
		 */
		validator_very_low_stake_threshold: bcs.u64(),
		/**
		 * A validator can have stake below `validator_low_stake_threshold` for this many
		 * epochs before being kicked out.
		 */
		validator_low_stake_grace_period: bcs.u64(),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export const SuiSystemStateInner = new MoveStruct({
	name: `${$moduleName}::SuiSystemStateInner`,
	fields: {
		/** The current epoch ID, starting from 0. */
		epoch: bcs.u64(),
		/** The current protocol version, starting from 1. */
		protocol_version: bcs.u64(),
		/**
		 * The current version of the system state data structure type. This is always the
		 * same as SuiSystemState.version. Keeping a copy here so that we know what version
		 * it is by inspecting SuiSystemStateInner as well.
		 */
		system_state_version: bcs.u64(),
		/** Contains all information about the validators. */
		validators: validator_set.ValidatorSet,
		/** The storage fund. */
		storage_fund: storage_fund.StorageFund,
		/** A list of system config parameters. */
		parameters: SystemParameters,
		/** The reference gas price for the current epoch. */
		reference_gas_price: bcs.u64(),
		/**
		 * A map storing the records of validator reporting each other. There is an entry
		 * in the map for each validator that has been reported at least once. The entry
		 * VecSet contains all the validators that reported them. If a validator has never
		 * been reported they don't have an entry in this map. This map persists across
		 * epoch: a peer continues being in a reported state until the reporter doesn't
		 * explicitly remove their report. Note that in case we want to support validator
		 * address change in future, the reports should be based on validator ids
		 */
		validator_report_records: vec_map.VecMap(bcs.Address, vec_set.VecSet(bcs.Address)),
		/** Schedule of stake subsidies given out each epoch. */
		stake_subsidy: stake_subsidy.StakeSubsidy,
		/**
		 * Whether the system is running in a downgraded safe mode due to a non-recoverable
		 * bug. This is set whenever we failed to execute advance*epoch, and ended up
		 * executing advance_epoch_safe_mode. It can be reset once we are able to
		 * successfully execute advance_epoch. The rest of the fields starting with
		 * `safe_mode*` are accumulated during safe mode when advance_epoch_safe_mode is
		 * executed. They will eventually be processed once we are out of safe mode.
		 */
		safe_mode: bcs.bool(),
		safe_mode_storage_rewards: balance.Balance,
		safe_mode_computation_rewards: balance.Balance,
		safe_mode_storage_rebates: bcs.u64(),
		safe_mode_non_refundable_storage_fee: bcs.u64(),
		/** Unix timestamp of the current epoch start */
		epoch_start_timestamp_ms: bcs.u64(),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export const SuiSystemStateInnerV2 = new MoveStruct({
	name: `${$moduleName}::SuiSystemStateInnerV2`,
	fields: {
		/** The current epoch ID, starting from 0. */
		epoch: bcs.u64(),
		/** The current protocol version, starting from 1. */
		protocol_version: bcs.u64(),
		/**
		 * The current version of the system state data structure type. This is always the
		 * same as SuiSystemState.version. Keeping a copy here so that we know what version
		 * it is by inspecting SuiSystemStateInner as well.
		 */
		system_state_version: bcs.u64(),
		/** Contains all information about the validators. */
		validators: validator_set.ValidatorSet,
		/** The storage fund. */
		storage_fund: storage_fund.StorageFund,
		/** A list of system config parameters. */
		parameters: SystemParametersV2,
		/** The reference gas price for the current epoch. */
		reference_gas_price: bcs.u64(),
		/**
		 * A map storing the records of validator reporting each other. There is an entry
		 * in the map for each validator that has been reported at least once. The entry
		 * VecSet contains all the validators that reported them. If a validator has never
		 * been reported they don't have an entry in this map. This map persists across
		 * epoch: a peer continues being in a reported state until the reporter doesn't
		 * explicitly remove their report. Note that in case we want to support validator
		 * address change in future, the reports should be based on validator ids
		 */
		validator_report_records: vec_map.VecMap(bcs.Address, vec_set.VecSet(bcs.Address)),
		/** Schedule of stake subsidies given out each epoch. */
		stake_subsidy: stake_subsidy.StakeSubsidy,
		/**
		 * Whether the system is running in a downgraded safe mode due to a non-recoverable
		 * bug. This is set whenever we failed to execute advance*epoch, and ended up
		 * executing advance_epoch_safe_mode. It can be reset once we are able to
		 * successfully execute advance_epoch. The rest of the fields starting with
		 * `safe_mode*` are accumulated during safe mode when advance_epoch_safe_mode is
		 * executed. They will eventually be processed once we are out of safe mode.
		 */
		safe_mode: bcs.bool(),
		safe_mode_storage_rewards: balance.Balance,
		safe_mode_computation_rewards: balance.Balance,
		safe_mode_storage_rebates: bcs.u64(),
		safe_mode_non_refundable_storage_fee: bcs.u64(),
		/** Unix timestamp of the current epoch start */
		epoch_start_timestamp_ms: bcs.u64(),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export const SystemEpochInfoEvent = new MoveStruct({
	name: `${$moduleName}::SystemEpochInfoEvent`,
	fields: {
		epoch: bcs.u64(),
		protocol_version: bcs.u64(),
		reference_gas_price: bcs.u64(),
		total_stake: bcs.u64(),
		storage_fund_reinvestment: bcs.u64(),
		storage_charge: bcs.u64(),
		storage_rebate: bcs.u64(),
		storage_fund_balance: bcs.u64(),
		stake_subsidy_amount: bcs.u64(),
		total_gas_fees: bcs.u64(),
		total_stake_rewards_distributed: bcs.u64(),
		leftover_storage_fund_inflow: bcs.u64(),
	},
});
