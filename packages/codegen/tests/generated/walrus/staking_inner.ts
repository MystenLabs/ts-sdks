/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs } from '@mysten/sui/bcs';
import { MoveStruct, MoveEnum } from '../utils/index.js';
import * as object_table from './deps/sui/object_table.js';
import * as extended_field from './extended_field.js';
import * as committee from './committee.js';
import * as epoch_parameters from './epoch_parameters.js';
const $moduleName = '@local-pkg/walrus::staking_inner';
export const StakingInnerV1 = new MoveStruct(`${$moduleName}::StakingInnerV1`, {
	/** The number of shards in the system. */
	n_shards: bcs.u16(),
	/** The duration of an epoch in ms. Does not affect the first (zero) epoch. */
	epoch_duration: bcs.u64(),
	/**
	 * Special parameter, used only for the first epoch. The timestamp when the first
	 * epoch can be started.
	 */
	first_epoch_start: bcs.u64(),
	/**
	 * Stored staking pools, each identified by a unique `ID` and contains the
	 * `StakingPool` object. Uses `ObjectTable` to make the pool discovery easier by
	 * avoiding wrapping.
	 *
	 * The key is the ID of the staking pool.
	 */
	pools: object_table.ObjectTable(),
	/**
	 * The current epoch of the Walrus system. The epochs are not the same as the Sui
	 * epochs, not to be mistaken with `ctx.epoch()`.
	 */
	epoch: bcs.u32(),
	/** Stores the active set of storage nodes. Tracks the total amount of staked WAL. */
	active_set: extended_field.ExtendedField(),
	/** The next committee in the system. */
	next_committee: bcs.option(committee.Committee),
	/** The current committee in the system. */
	committee: committee.Committee,
	/** The previous committee in the system. */
	previous_committee: committee.Committee,
	/** The next epoch parameters. */
	next_epoch_params: bcs.option(epoch_parameters.EpochParams),
	/** The state of the current epoch. */
	epoch_state: EpochState,
	/**
	 * The public keys for the next epoch. The keys are stored in a sorted `VecMap`,
	 * and mirror the order of the nodes in the `next_committee`. The value is set in
	 * the `select_committee` function and consumed in the `next_bls_committee`
	 * function.
	 */
	next_epoch_public_keys: extended_field.ExtendedField(),
});
/** The epoch state. */
export const EpochState = new MoveEnum(`${$moduleName}::EpochState`, {
	EpochChangeSync: bcs.u16(),
	EpochChangeDone: bcs.u64(),
	NextParamsSelected: bcs.u64(),
});
