// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
import { MessageType } from '@protobuf-ts/runtime';
/**
 * @generated from protobuf message sui.rpc.v2beta2.SystemState
 */
export interface SystemState {
	/**
	 * The version of the system state data structure type.
	 *
	 * @generated from protobuf field: optional uint64 version = 1;
	 */
	version?: bigint;
	/**
	 * The epoch id
	 *
	 * @generated from protobuf field: optional uint64 epoch = 2;
	 */
	epoch?: bigint;
	/**
	 * The protocol version
	 *
	 * @generated from protobuf field: optional uint64 protocol_version = 3;
	 */
	protocolVersion?: bigint;
	/**
	 * Information about the validators
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ValidatorSet validators = 4;
	 */
	validators?: ValidatorSet;
	/**
	 * Storage Fund info
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.StorageFund storage_fund = 5;
	 */
	storageFund?: StorageFund;
	/**
	 * Set of system config parameters
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SystemParameters parameters = 6;
	 */
	parameters?: SystemParameters;
	/**
	 * The reference gas price for this epoch
	 *
	 * @generated from protobuf field: optional uint64 reference_gas_price = 7;
	 */
	referenceGasPrice?: bigint;
	/**
	 * A list of the records of validator reporting each other.
	 *
	 * There is an entry in this list for each validator that has been reported
	 * at least once. Each record contains all the validators that reported
	 * them. If a validator has never been reported they don't have a record in this list.
	 * This lists persists across epoch: a peer continues being in a reported state until the
	 * reporter doesn't explicitly remove their report.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ValidatorReportRecord validator_report_records = 8;
	 */
	validatorReportRecords: ValidatorReportRecord[];
	/**
	 * Schedule of stake subsidies given out each epoch.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.StakeSubsidy stake_subsidy = 9;
	 */
	stakeSubsidy?: StakeSubsidy;
	/**
	 * Whether the system is running in a downgraded safe mode due to a non-recoverable bug.
	 * This is set whenever we failed to execute advance_epoch, and ended up executing advance_epoch_safe_mode.
	 * It can be reset once we are able to successfully execute advance_epoch.
	 * The rest of the fields starting with `safe_mode_` are accumulated during safe mode
	 * when advance_epoch_safe_mode is executed. They will eventually be processed once we
	 * are out of safe mode.
	 *
	 * @generated from protobuf field: optional bool safe_mode = 10;
	 */
	safeMode?: boolean;
	/**
	 * Storage rewards accumulated during safe_mode
	 *
	 * @generated from protobuf field: optional uint64 safe_mode_storage_rewards = 11;
	 */
	safeModeStorageRewards?: bigint;
	/**
	 * Computation rewards accumulated during safe_mode
	 *
	 * @generated from protobuf field: optional uint64 safe_mode_computation_rewards = 12;
	 */
	safeModeComputationRewards?: bigint;
	/**
	 * Storage rebates paid out during safe_mode
	 *
	 * @generated from protobuf field: optional uint64 safe_mode_storage_rebates = 13;
	 */
	safeModeStorageRebates?: bigint;
	/**
	 * Nonrefundable storage fees accumulated during safe_mode
	 *
	 * @generated from protobuf field: optional uint64 safe_mode_non_refundable_storage_fee = 14;
	 */
	safeModeNonRefundableStorageFee?: bigint;
	/**
	 * Unix timestamp of when this this epoch started
	 *
	 * @generated from protobuf field: optional uint64 epoch_start_timestamp_ms = 15;
	 */
	epochStartTimestampMs?: bigint;
	/**
	 * Any extra fields that's not defined statically.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable extra_fields = 16;
	 */
	extraFields?: MoveTable;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ValidatorReportRecord
 */
export interface ValidatorReportRecord {
	/**
	 * The address of the validator being reported
	 *
	 * @generated from protobuf field: optional string reported = 1;
	 */
	reported?: string;
	/**
	 * The list of validator (addresses) that are reporting on the validator specified by `reported`
	 *
	 * @generated from protobuf field: repeated string reporters = 2;
	 */
	reporters: string[];
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.SystemParameters
 */
export interface SystemParameters {
	/**
	 * The duration of an epoch, in milliseconds.
	 *
	 * @generated from protobuf field: optional uint64 epoch_duration_ms = 1;
	 */
	epochDurationMs?: bigint;
	/**
	 * The starting epoch in which stake subsidies start being paid out
	 *
	 * @generated from protobuf field: optional uint64 stake_subsidy_start_epoch = 2;
	 */
	stakeSubsidyStartEpoch?: bigint;
	/**
	 * Minimum number of active validators at any moment.
	 *
	 * @generated from protobuf field: optional uint64 min_validator_count = 3;
	 */
	minValidatorCount?: bigint;
	/**
	 * Maximum number of active validators at any moment.
	 * We do not allow the number of validators in any epoch to go above this.
	 *
	 * @generated from protobuf field: optional uint64 max_validator_count = 4;
	 */
	maxValidatorCount?: bigint;
	/**
	 * Deprecated.
	 * Lower-bound on the amount of stake required to become a validator.
	 *
	 * @generated from protobuf field: optional uint64 min_validator_joining_stake = 5;
	 */
	minValidatorJoiningStake?: bigint;
	/**
	 * Deprecated.
	 * Validators with stake amount below `validator_low_stake_threshold` are considered to
	 * have low stake and will be escorted out of the validator set after being below this
	 * threshold for more than `validator_low_stake_grace_period` number of epochs.
	 *
	 * @generated from protobuf field: optional uint64 validator_low_stake_threshold = 6;
	 */
	validatorLowStakeThreshold?: bigint;
	/**
	 * Deprecated.
	 * Validators with stake below `validator_very_low_stake_threshold` will be removed
	 * immediately at epoch change, no grace period.
	 *
	 * @generated from protobuf field: optional uint64 validator_very_low_stake_threshold = 7;
	 */
	validatorVeryLowStakeThreshold?: bigint;
	/**
	 * A validator can have stake below `validator_low_stake_threshold`
	 * for this many epochs before being kicked out.
	 *
	 * @generated from protobuf field: optional uint64 validator_low_stake_grace_period = 8;
	 */
	validatorLowStakeGracePeriod?: bigint;
	/**
	 * Any extra fields that are not defined statically.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable extra_fields = 9;
	 */
	extraFields?: MoveTable;
}
/**
 * A message that represents a Move `0x2::table::Table` or `0x2::bag::Bag`
 *
 * @generated from protobuf message sui.rpc.v2beta2.MoveTable
 */
export interface MoveTable {
	/**
	 * The UID of the table or bag
	 *
	 * @generated from protobuf field: optional string id = 1;
	 */
	id?: string;
	/**
	 * The size or number of key-value pairs in the table or bag
	 *
	 * @generated from protobuf field: optional uint64 size = 2;
	 */
	size?: bigint;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.StakeSubsidy
 */
export interface StakeSubsidy {
	/**
	 * Balance of SUI set aside for stake subsidies that will be drawn down over time.
	 *
	 * @generated from protobuf field: optional uint64 balance = 1;
	 */
	balance?: bigint;
	/**
	 * Count of the number of times stake subsidies have been distributed.
	 *
	 * @generated from protobuf field: optional uint64 distribution_counter = 2;
	 */
	distributionCounter?: bigint;
	/**
	 * The amount of stake subsidy to be drawn down per distribution.
	 * This amount decays and decreases over time.
	 *
	 * @generated from protobuf field: optional uint64 current_distribution_amount = 3;
	 */
	currentDistributionAmount?: bigint;
	/**
	 * Number of distributions to occur before the distribution amount decays.
	 *
	 * @generated from protobuf field: optional uint64 stake_subsidy_period_length = 4;
	 */
	stakeSubsidyPeriodLength?: bigint;
	/**
	 * The rate at which the distribution amount decays at the end of each
	 * period. Expressed in basis points.
	 *
	 * @generated from protobuf field: optional uint32 stake_subsidy_decrease_rate = 5;
	 */
	stakeSubsidyDecreaseRate?: number;
	/**
	 * Any extra fields that's not defined statically.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable extra_fields = 6;
	 */
	extraFields?: MoveTable;
}
/**
 * Struct representing the onchain storage fund.
 *
 * @generated from protobuf message sui.rpc.v2beta2.StorageFund
 */
export interface StorageFund {
	/**
	 * This is the sum of `storage_rebate` of
	 * all objects currently stored on-chain. To maintain this invariant, the only inflow of this
	 * balance is storage charges collected from transactions, and the only outflow is storage rebates
	 * of transactions, including both the portion refunded to the transaction senders as well as
	 * the non-refundable portion taken out and put into `non_refundable_balance`.
	 *
	 * @generated from protobuf field: optional uint64 total_object_storage_rebates = 1;
	 */
	totalObjectStorageRebates?: bigint;
	/**
	 * Represents any remaining inflow of the storage fund that should not
	 * be taken out of the fund.
	 *
	 * @generated from protobuf field: optional uint64 non_refundable_balance = 2;
	 */
	nonRefundableBalance?: bigint;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ValidatorSet
 */
export interface ValidatorSet {
	/**
	 * Total amount of stake from all active validators at the beginning of the epoch.
	 * Written only once per epoch, in `advance_epoch` function.
	 *
	 * @generated from protobuf field: optional uint64 total_stake = 1;
	 */
	totalStake?: bigint;
	/**
	 * The current list of active validators.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Validator active_validators = 2;
	 */
	activeValidators: Validator[];
	/**
	 * List of new validator candidates added during the current epoch.
	 * They will be processed at the end of the epoch.
	 *
	 * key: u64 (index), value: 0x3::validator::Validator
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable pending_active_validators = 3;
	 */
	pendingActiveValidators?: MoveTable;
	/**
	 * Removal requests from the validators. Each element is an index
	 * pointing to `active_validators`.
	 *
	 * @generated from protobuf field: repeated uint64 pending_removals = 4;
	 */
	pendingRemovals: bigint[];
	/**
	 * Mappings from staking pool's ID to the sui address of a validator.
	 *
	 * key: address (staking pool Id), value: address (sui address of the validator)
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable staking_pool_mappings = 5;
	 */
	stakingPoolMappings?: MoveTable;
	/**
	 * Mapping from a staking pool ID to the inactive validator that has that pool as its staking pool.
	 * When a validator is deactivated the validator is removed from `active_validators` it
	 * is added to this table so that stakers can continue to withdraw their stake from it.
	 *
	 * key: address (staking pool Id), value: 0x3::validator_wrapper::ValidatorWrapper
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable inactive_validators = 6;
	 */
	inactiveValidators?: MoveTable;
	/**
	 * Table storing preactive/candidate validators, mapping their addresses to their `Validator ` structs.
	 * When an address calls `request_add_validator_candidate`, they get added to this table and become a preactive
	 * validator.
	 * When the candidate has met the min stake requirement, they can call `request_add_validator` to
	 * officially add them to the active validator set `active_validators` next epoch.
	 *
	 * key: address (sui address of the validator), value: 0x3::validator_wrapper::ValidatorWrapper
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable validator_candidates = 7;
	 */
	validatorCandidates?: MoveTable;
	/**
	 * Table storing the number of epochs during which a validator's stake has been below the low stake threshold.
	 *
	 * @generated from protobuf field: map<string, uint64> at_risk_validators = 8;
	 */
	atRiskValidators: {
		[key: string]: bigint;
	};
	/**
	 * Any extra fields that's not defined statically.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable extra_fields = 9;
	 */
	extraFields?: MoveTable;
}
/**
 * Definition of a Validator in the system contracts
 *
 * Note: fields of ValidatorMetadata are flattened into this type
 *
 * @generated from protobuf message sui.rpc.v2beta2.Validator
 */
export interface Validator {
	/**
	 * A unique human-readable name of this validator.
	 *
	 * @generated from protobuf field: optional string name = 1;
	 */
	name?: string;
	/**
	 * The Sui Address of the validator. This is the sender that created the Validator object,
	 * and also the address to send validator/coins to during withdraws.
	 *
	 * @generated from protobuf field: optional string address = 2;
	 */
	address?: string;
	/**
	 * @generated from protobuf field: optional string description = 3;
	 */
	description?: string;
	/**
	 * @generated from protobuf field: optional string image_url = 4;
	 */
	imageUrl?: string;
	/**
	 * @generated from protobuf field: optional string project_url = 5;
	 */
	projectUrl?: string;
	/**
	 * The public key bytes corresponding to the private key that the validator
	 * holds to sign transactions. For now, this is the same as AuthorityName.
	 *
	 * @generated from protobuf field: optional bytes protocol_public_key = 7;
	 */
	protocolPublicKey?: Uint8Array;
	/**
	 * This is a proof that the validator has ownership of the protocol private key
	 *
	 * @generated from protobuf field: optional bytes proof_of_possession = 8;
	 */
	proofOfPossession?: Uint8Array;
	/**
	 * The public key bytes corresponding to the private key that the validator
	 * uses to establish TLS connections
	 *
	 * @generated from protobuf field: optional bytes network_public_key = 10;
	 */
	networkPublicKey?: Uint8Array;
	/**
	 * The public key bytes correstponding to the Narwhal Worker
	 *
	 * @generated from protobuf field: optional bytes worker_public_key = 12;
	 */
	workerPublicKey?: Uint8Array;
	/**
	 * The network address of the validator (could also contain extra info such as port, DNS and etc.).
	 *
	 * @generated from protobuf field: optional string network_address = 13;
	 */
	networkAddress?: string;
	/**
	 * The address of the validator used for p2p activities such as state sync (could also contain extra info such as port, DNS and etc.).
	 *
	 * @generated from protobuf field: optional string p2p_address = 14 [json_name = "p2pAddress"];
	 */
	p2PAddress?: string;
	/**
	 * The address of the narwhal primary
	 *
	 * @generated from protobuf field: optional string primary_address = 15;
	 */
	primaryAddress?: string;
	/**
	 * The address of the narwhal worker
	 *
	 * @generated from protobuf field: optional string worker_address = 16;
	 */
	workerAddress?: string;
	/**
	 * @generated from protobuf field: optional bytes next_epoch_protocol_public_key = 18;
	 */
	nextEpochProtocolPublicKey?: Uint8Array;
	/**
	 * @generated from protobuf field: optional bytes next_epoch_proof_of_possession = 19;
	 */
	nextEpochProofOfPossession?: Uint8Array;
	/**
	 * @generated from protobuf field: optional bytes next_epoch_network_public_key = 21;
	 */
	nextEpochNetworkPublicKey?: Uint8Array;
	/**
	 * @generated from protobuf field: optional bytes next_epoch_worker_public_key = 23;
	 */
	nextEpochWorkerPublicKey?: Uint8Array;
	/**
	 * @generated from protobuf field: optional string next_epoch_network_address = 24;
	 */
	nextEpochNetworkAddress?: string;
	/**
	 * @generated from protobuf field: optional string next_epoch_p2p_address = 25 [json_name = "nextEpochP2pAddress"];
	 */
	nextEpochP2PAddress?: string;
	/**
	 * @generated from protobuf field: optional string next_epoch_primary_address = 26;
	 */
	nextEpochPrimaryAddress?: string;
	/**
	 * @generated from protobuf field: optional string next_epoch_worker_address = 27;
	 */
	nextEpochWorkerAddress?: string;
	/**
	 * Any extra fields that's not defined statically in the `ValidatorMetadata` struct
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable metadata_extra_fields = 28;
	 */
	metadataExtraFields?: MoveTable;
	/**
	 * The voting power of this validator, which might be different from its
	 * stake amount.
	 *
	 * @generated from protobuf field: optional uint64 voting_power = 29;
	 */
	votingPower?: bigint;
	/**
	 * The ID of this validator's current valid `UnverifiedValidatorOperationCap`
	 *
	 * @generated from protobuf field: optional string operation_cap_id = 30;
	 */
	operationCapId?: string;
	/**
	 * Gas price quote, updated only at end of epoch.
	 *
	 * @generated from protobuf field: optional uint64 gas_price = 31;
	 */
	gasPrice?: bigint;
	/**
	 * Staking pool for this validator.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.StakingPool staking_pool = 32;
	 */
	stakingPool?: StakingPool;
	/**
	 * Commission rate of the validator, in basis point.
	 *
	 * @generated from protobuf field: optional uint64 commission_rate = 33;
	 */
	commissionRate?: bigint;
	/**
	 * Total amount of stake that would be active in the next epoch.
	 *
	 * @generated from protobuf field: optional uint64 next_epoch_stake = 34;
	 */
	nextEpochStake?: bigint;
	/**
	 * This validator's gas price quote for the next epoch.
	 *
	 * @generated from protobuf field: optional uint64 next_epoch_gas_price = 35;
	 */
	nextEpochGasPrice?: bigint;
	/**
	 * The commission rate of the validator starting the next epoch, in basis point.
	 *
	 * @generated from protobuf field: optional uint64 next_epoch_commission_rate = 36;
	 */
	nextEpochCommissionRate?: bigint;
	/**
	 * Any extra fields that's not defined statically.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable extra_fields = 37;
	 */
	extraFields?: MoveTable;
}
/**
 * A staking pool embedded in each validator struct in the system state object.
 *
 * @generated from protobuf message sui.rpc.v2beta2.StakingPool
 */
export interface StakingPool {
	/**
	 * UID of the StakingPool object
	 *
	 * @generated from protobuf field: optional string id = 1;
	 */
	id?: string;
	/**
	 * The epoch at which this pool became active.
	 * The value is `None` if the pool is pre-active and `Some(<epoch_number>)` if active or inactive.
	 *
	 * @generated from protobuf field: optional uint64 activation_epoch = 2;
	 */
	activationEpoch?: bigint;
	/**
	 * The epoch at which this staking pool ceased to be active. `None` = {pre-active, active},
	 * `Some(<epoch_number>)` if in-active, and it was de-activated at epoch `<epoch_number>`.
	 *
	 * @generated from protobuf field: optional uint64 deactivation_epoch = 3;
	 */
	deactivationEpoch?: bigint;
	/**
	 * The total number of SUI tokens in this pool, including the SUI in the rewards_pool, as well as in all the principal
	 * in the `StakedSui` object, updated at epoch boundaries.
	 *
	 * @generated from protobuf field: optional uint64 sui_balance = 4;
	 */
	suiBalance?: bigint;
	/**
	 * The epoch stake rewards will be added here at the end of each epoch.
	 *
	 * @generated from protobuf field: optional uint64 rewards_pool = 5;
	 */
	rewardsPool?: bigint;
	/**
	 * Total number of pool tokens issued by the pool.
	 *
	 * @generated from protobuf field: optional uint64 pool_token_balance = 6;
	 */
	poolTokenBalance?: bigint;
	/**
	 * Exchange rate history of previous epochs.
	 *
	 * The entries start from the `activation_epoch` of this pool and contains exchange rates at the beginning of each epoch,
	 * i.e., right after the rewards for the previous epoch have been deposited into the pool.
	 *
	 * key: u64 (epoch number), value: PoolTokenExchangeRate
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable exchange_rates = 7;
	 */
	exchangeRates?: MoveTable;
	/**
	 * Pending stake amount for this epoch, emptied at epoch boundaries.
	 *
	 * @generated from protobuf field: optional uint64 pending_stake = 8;
	 */
	pendingStake?: bigint;
	/**
	 * Pending stake withdrawn during the current epoch, emptied at epoch boundaries.
	 * This includes both the principal and rewards SUI withdrawn.
	 *
	 * @generated from protobuf field: optional uint64 pending_total_sui_withdraw = 9;
	 */
	pendingTotalSuiWithdraw?: bigint;
	/**
	 * Pending pool token withdrawn during the current epoch, emptied at epoch boundaries.
	 *
	 * @generated from protobuf field: optional uint64 pending_pool_token_withdraw = 10;
	 */
	pendingPoolTokenWithdraw?: bigint;
	/**
	 * Any extra fields that's not defined statically.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MoveTable extra_fields = 11;
	 */
	extraFields?: MoveTable;
}
// @generated message type with reflection information, may provide speed optimized methods
class SystemState$Type extends MessageType<SystemState> {
	constructor() {
		super('sui.rpc.v2beta2.SystemState', [
			{
				no: 1,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'protocol_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 4, name: 'validators', kind: 'message', T: () => ValidatorSet },
			{ no: 5, name: 'storage_fund', kind: 'message', T: () => StorageFund },
			{ no: 6, name: 'parameters', kind: 'message', T: () => SystemParameters },
			{
				no: 7,
				name: 'reference_gas_price',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 8,
				name: 'validator_report_records',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => ValidatorReportRecord,
			},
			{ no: 9, name: 'stake_subsidy', kind: 'message', T: () => StakeSubsidy },
			{ no: 10, name: 'safe_mode', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
			{
				no: 11,
				name: 'safe_mode_storage_rewards',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 12,
				name: 'safe_mode_computation_rewards',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 13,
				name: 'safe_mode_storage_rebates',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 14,
				name: 'safe_mode_non_refundable_storage_fee',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 15,
				name: 'epoch_start_timestamp_ms',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 16, name: 'extra_fields', kind: 'message', T: () => MoveTable },
		]);
	}
	create(value?: PartialMessage<SystemState>): SystemState {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.validatorReportRecords = [];
		if (value !== undefined) reflectionMergePartial<SystemState>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SystemState,
	): SystemState {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 version */ 1:
					message.version = reader.uint64().toBigInt();
					break;
				case /* optional uint64 epoch */ 2:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 protocol_version */ 3:
					message.protocolVersion = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.ValidatorSet validators */ 4:
					message.validators = ValidatorSet.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.validators,
					);
					break;
				case /* optional sui.rpc.v2beta2.StorageFund storage_fund */ 5:
					message.storageFund = StorageFund.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.storageFund,
					);
					break;
				case /* optional sui.rpc.v2beta2.SystemParameters parameters */ 6:
					message.parameters = SystemParameters.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.parameters,
					);
					break;
				case /* optional uint64 reference_gas_price */ 7:
					message.referenceGasPrice = reader.uint64().toBigInt();
					break;
				case /* repeated sui.rpc.v2beta2.ValidatorReportRecord validator_report_records */ 8:
					message.validatorReportRecords.push(
						ValidatorReportRecord.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional sui.rpc.v2beta2.StakeSubsidy stake_subsidy */ 9:
					message.stakeSubsidy = StakeSubsidy.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.stakeSubsidy,
					);
					break;
				case /* optional bool safe_mode */ 10:
					message.safeMode = reader.bool();
					break;
				case /* optional uint64 safe_mode_storage_rewards */ 11:
					message.safeModeStorageRewards = reader.uint64().toBigInt();
					break;
				case /* optional uint64 safe_mode_computation_rewards */ 12:
					message.safeModeComputationRewards = reader.uint64().toBigInt();
					break;
				case /* optional uint64 safe_mode_storage_rebates */ 13:
					message.safeModeStorageRebates = reader.uint64().toBigInt();
					break;
				case /* optional uint64 safe_mode_non_refundable_storage_fee */ 14:
					message.safeModeNonRefundableStorageFee = reader.uint64().toBigInt();
					break;
				case /* optional uint64 epoch_start_timestamp_ms */ 15:
					message.epochStartTimestampMs = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.MoveTable extra_fields */ 16:
					message.extraFields = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.extraFields,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: SystemState,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 version = 1; */
		if (message.version !== undefined) writer.tag(1, WireType.Varint).uint64(message.version);
		/* optional uint64 epoch = 2; */
		if (message.epoch !== undefined) writer.tag(2, WireType.Varint).uint64(message.epoch);
		/* optional uint64 protocol_version = 3; */
		if (message.protocolVersion !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.protocolVersion);
		/* optional sui.rpc.v2beta2.ValidatorSet validators = 4; */
		if (message.validators)
			ValidatorSet.internalBinaryWrite(
				message.validators,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.StorageFund storage_fund = 5; */
		if (message.storageFund)
			StorageFund.internalBinaryWrite(
				message.storageFund,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.SystemParameters parameters = 6; */
		if (message.parameters)
			SystemParameters.internalBinaryWrite(
				message.parameters,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 reference_gas_price = 7; */
		if (message.referenceGasPrice !== undefined)
			writer.tag(7, WireType.Varint).uint64(message.referenceGasPrice);
		/* repeated sui.rpc.v2beta2.ValidatorReportRecord validator_report_records = 8; */
		for (let i = 0; i < message.validatorReportRecords.length; i++)
			ValidatorReportRecord.internalBinaryWrite(
				message.validatorReportRecords[i],
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.StakeSubsidy stake_subsidy = 9; */
		if (message.stakeSubsidy)
			StakeSubsidy.internalBinaryWrite(
				message.stakeSubsidy,
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional bool safe_mode = 10; */
		if (message.safeMode !== undefined) writer.tag(10, WireType.Varint).bool(message.safeMode);
		/* optional uint64 safe_mode_storage_rewards = 11; */
		if (message.safeModeStorageRewards !== undefined)
			writer.tag(11, WireType.Varint).uint64(message.safeModeStorageRewards);
		/* optional uint64 safe_mode_computation_rewards = 12; */
		if (message.safeModeComputationRewards !== undefined)
			writer.tag(12, WireType.Varint).uint64(message.safeModeComputationRewards);
		/* optional uint64 safe_mode_storage_rebates = 13; */
		if (message.safeModeStorageRebates !== undefined)
			writer.tag(13, WireType.Varint).uint64(message.safeModeStorageRebates);
		/* optional uint64 safe_mode_non_refundable_storage_fee = 14; */
		if (message.safeModeNonRefundableStorageFee !== undefined)
			writer.tag(14, WireType.Varint).uint64(message.safeModeNonRefundableStorageFee);
		/* optional uint64 epoch_start_timestamp_ms = 15; */
		if (message.epochStartTimestampMs !== undefined)
			writer.tag(15, WireType.Varint).uint64(message.epochStartTimestampMs);
		/* optional sui.rpc.v2beta2.MoveTable extra_fields = 16; */
		if (message.extraFields)
			MoveTable.internalBinaryWrite(
				message.extraFields,
				writer.tag(16, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SystemState
 */
export const SystemState = new SystemState$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ValidatorReportRecord$Type extends MessageType<ValidatorReportRecord> {
	constructor() {
		super('sui.rpc.v2beta2.ValidatorReportRecord', [
			{ no: 1, name: 'reported', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'reporters',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 9 /*ScalarType.STRING*/,
			},
		]);
	}
	create(value?: PartialMessage<ValidatorReportRecord>): ValidatorReportRecord {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.reporters = [];
		if (value !== undefined) reflectionMergePartial<ValidatorReportRecord>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ValidatorReportRecord,
	): ValidatorReportRecord {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string reported */ 1:
					message.reported = reader.string();
					break;
				case /* repeated string reporters */ 2:
					message.reporters.push(reader.string());
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ValidatorReportRecord,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string reported = 1; */
		if (message.reported !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.reported);
		/* repeated string reporters = 2; */
		for (let i = 0; i < message.reporters.length; i++)
			writer.tag(2, WireType.LengthDelimited).string(message.reporters[i]);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ValidatorReportRecord
 */
export const ValidatorReportRecord = new ValidatorReportRecord$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SystemParameters$Type extends MessageType<SystemParameters> {
	constructor() {
		super('sui.rpc.v2beta2.SystemParameters', [
			{
				no: 1,
				name: 'epoch_duration_ms',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'stake_subsidy_start_epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'min_validator_count',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 4,
				name: 'max_validator_count',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 5,
				name: 'min_validator_joining_stake',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 6,
				name: 'validator_low_stake_threshold',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 7,
				name: 'validator_very_low_stake_threshold',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 8,
				name: 'validator_low_stake_grace_period',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 9, name: 'extra_fields', kind: 'message', T: () => MoveTable },
		]);
	}
	create(value?: PartialMessage<SystemParameters>): SystemParameters {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<SystemParameters>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SystemParameters,
	): SystemParameters {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch_duration_ms */ 1:
					message.epochDurationMs = reader.uint64().toBigInt();
					break;
				case /* optional uint64 stake_subsidy_start_epoch */ 2:
					message.stakeSubsidyStartEpoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 min_validator_count */ 3:
					message.minValidatorCount = reader.uint64().toBigInt();
					break;
				case /* optional uint64 max_validator_count */ 4:
					message.maxValidatorCount = reader.uint64().toBigInt();
					break;
				case /* optional uint64 min_validator_joining_stake */ 5:
					message.minValidatorJoiningStake = reader.uint64().toBigInt();
					break;
				case /* optional uint64 validator_low_stake_threshold */ 6:
					message.validatorLowStakeThreshold = reader.uint64().toBigInt();
					break;
				case /* optional uint64 validator_very_low_stake_threshold */ 7:
					message.validatorVeryLowStakeThreshold = reader.uint64().toBigInt();
					break;
				case /* optional uint64 validator_low_stake_grace_period */ 8:
					message.validatorLowStakeGracePeriod = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.MoveTable extra_fields */ 9:
					message.extraFields = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.extraFields,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: SystemParameters,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch_duration_ms = 1; */
		if (message.epochDurationMs !== undefined)
			writer.tag(1, WireType.Varint).uint64(message.epochDurationMs);
		/* optional uint64 stake_subsidy_start_epoch = 2; */
		if (message.stakeSubsidyStartEpoch !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.stakeSubsidyStartEpoch);
		/* optional uint64 min_validator_count = 3; */
		if (message.minValidatorCount !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.minValidatorCount);
		/* optional uint64 max_validator_count = 4; */
		if (message.maxValidatorCount !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.maxValidatorCount);
		/* optional uint64 min_validator_joining_stake = 5; */
		if (message.minValidatorJoiningStake !== undefined)
			writer.tag(5, WireType.Varint).uint64(message.minValidatorJoiningStake);
		/* optional uint64 validator_low_stake_threshold = 6; */
		if (message.validatorLowStakeThreshold !== undefined)
			writer.tag(6, WireType.Varint).uint64(message.validatorLowStakeThreshold);
		/* optional uint64 validator_very_low_stake_threshold = 7; */
		if (message.validatorVeryLowStakeThreshold !== undefined)
			writer.tag(7, WireType.Varint).uint64(message.validatorVeryLowStakeThreshold);
		/* optional uint64 validator_low_stake_grace_period = 8; */
		if (message.validatorLowStakeGracePeriod !== undefined)
			writer.tag(8, WireType.Varint).uint64(message.validatorLowStakeGracePeriod);
		/* optional sui.rpc.v2beta2.MoveTable extra_fields = 9; */
		if (message.extraFields)
			MoveTable.internalBinaryWrite(
				message.extraFields,
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SystemParameters
 */
export const SystemParameters = new SystemParameters$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MoveTable$Type extends MessageType<MoveTable> {
	constructor() {
		super('sui.rpc.v2beta2.MoveTable', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'size',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<MoveTable>): MoveTable {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<MoveTable>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MoveTable,
	): MoveTable {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string id */ 1:
					message.id = reader.string();
					break;
				case /* optional uint64 size */ 2:
					message.size = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MoveTable,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string id = 1; */
		if (message.id !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.id);
		/* optional uint64 size = 2; */
		if (message.size !== undefined) writer.tag(2, WireType.Varint).uint64(message.size);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MoveTable
 */
export const MoveTable = new MoveTable$Type();
// @generated message type with reflection information, may provide speed optimized methods
class StakeSubsidy$Type extends MessageType<StakeSubsidy> {
	constructor() {
		super('sui.rpc.v2beta2.StakeSubsidy', [
			{
				no: 1,
				name: 'balance',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'distribution_counter',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'current_distribution_amount',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 4,
				name: 'stake_subsidy_period_length',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 5,
				name: 'stake_subsidy_decrease_rate',
				kind: 'scalar',
				opt: true,
				T: 13 /*ScalarType.UINT32*/,
			},
			{ no: 6, name: 'extra_fields', kind: 'message', T: () => MoveTable },
		]);
	}
	create(value?: PartialMessage<StakeSubsidy>): StakeSubsidy {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<StakeSubsidy>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: StakeSubsidy,
	): StakeSubsidy {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 balance */ 1:
					message.balance = reader.uint64().toBigInt();
					break;
				case /* optional uint64 distribution_counter */ 2:
					message.distributionCounter = reader.uint64().toBigInt();
					break;
				case /* optional uint64 current_distribution_amount */ 3:
					message.currentDistributionAmount = reader.uint64().toBigInt();
					break;
				case /* optional uint64 stake_subsidy_period_length */ 4:
					message.stakeSubsidyPeriodLength = reader.uint64().toBigInt();
					break;
				case /* optional uint32 stake_subsidy_decrease_rate */ 5:
					message.stakeSubsidyDecreaseRate = reader.uint32();
					break;
				case /* optional sui.rpc.v2beta2.MoveTable extra_fields */ 6:
					message.extraFields = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.extraFields,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: StakeSubsidy,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 balance = 1; */
		if (message.balance !== undefined) writer.tag(1, WireType.Varint).uint64(message.balance);
		/* optional uint64 distribution_counter = 2; */
		if (message.distributionCounter !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.distributionCounter);
		/* optional uint64 current_distribution_amount = 3; */
		if (message.currentDistributionAmount !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.currentDistributionAmount);
		/* optional uint64 stake_subsidy_period_length = 4; */
		if (message.stakeSubsidyPeriodLength !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.stakeSubsidyPeriodLength);
		/* optional uint32 stake_subsidy_decrease_rate = 5; */
		if (message.stakeSubsidyDecreaseRate !== undefined)
			writer.tag(5, WireType.Varint).uint32(message.stakeSubsidyDecreaseRate);
		/* optional sui.rpc.v2beta2.MoveTable extra_fields = 6; */
		if (message.extraFields)
			MoveTable.internalBinaryWrite(
				message.extraFields,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.StakeSubsidy
 */
export const StakeSubsidy = new StakeSubsidy$Type();
// @generated message type with reflection information, may provide speed optimized methods
class StorageFund$Type extends MessageType<StorageFund> {
	constructor() {
		super('sui.rpc.v2beta2.StorageFund', [
			{
				no: 1,
				name: 'total_object_storage_rebates',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'non_refundable_balance',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<StorageFund>): StorageFund {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<StorageFund>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: StorageFund,
	): StorageFund {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 total_object_storage_rebates */ 1:
					message.totalObjectStorageRebates = reader.uint64().toBigInt();
					break;
				case /* optional uint64 non_refundable_balance */ 2:
					message.nonRefundableBalance = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: StorageFund,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 total_object_storage_rebates = 1; */
		if (message.totalObjectStorageRebates !== undefined)
			writer.tag(1, WireType.Varint).uint64(message.totalObjectStorageRebates);
		/* optional uint64 non_refundable_balance = 2; */
		if (message.nonRefundableBalance !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.nonRefundableBalance);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.StorageFund
 */
export const StorageFund = new StorageFund$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ValidatorSet$Type extends MessageType<ValidatorSet> {
	constructor() {
		super('sui.rpc.v2beta2.ValidatorSet', [
			{
				no: 1,
				name: 'total_stake',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'active_validators',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => Validator,
			},
			{ no: 3, name: 'pending_active_validators', kind: 'message', T: () => MoveTable },
			{
				no: 4,
				name: 'pending_removals',
				kind: 'scalar',
				repeat: 1 /*RepeatType.PACKED*/,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 5, name: 'staking_pool_mappings', kind: 'message', T: () => MoveTable },
			{ no: 6, name: 'inactive_validators', kind: 'message', T: () => MoveTable },
			{ no: 7, name: 'validator_candidates', kind: 'message', T: () => MoveTable },
			{
				no: 8,
				name: 'at_risk_validators',
				kind: 'map',
				K: 9 /*ScalarType.STRING*/,
				V: { kind: 'scalar', T: 4 /*ScalarType.UINT64*/, L: 0 /*LongType.BIGINT*/ },
			},
			{ no: 9, name: 'extra_fields', kind: 'message', T: () => MoveTable },
		]);
	}
	create(value?: PartialMessage<ValidatorSet>): ValidatorSet {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.activeValidators = [];
		message.pendingRemovals = [];
		message.atRiskValidators = {};
		if (value !== undefined) reflectionMergePartial<ValidatorSet>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ValidatorSet,
	): ValidatorSet {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 total_stake */ 1:
					message.totalStake = reader.uint64().toBigInt();
					break;
				case /* repeated sui.rpc.v2beta2.Validator active_validators */ 2:
					message.activeValidators.push(
						Validator.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional sui.rpc.v2beta2.MoveTable pending_active_validators */ 3:
					message.pendingActiveValidators = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.pendingActiveValidators,
					);
					break;
				case /* repeated uint64 pending_removals */ 4:
					if (wireType === WireType.LengthDelimited)
						for (let e = reader.int32() + reader.pos; reader.pos < e; )
							message.pendingRemovals.push(reader.uint64().toBigInt());
					else message.pendingRemovals.push(reader.uint64().toBigInt());
					break;
				case /* optional sui.rpc.v2beta2.MoveTable staking_pool_mappings */ 5:
					message.stakingPoolMappings = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.stakingPoolMappings,
					);
					break;
				case /* optional sui.rpc.v2beta2.MoveTable inactive_validators */ 6:
					message.inactiveValidators = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.inactiveValidators,
					);
					break;
				case /* optional sui.rpc.v2beta2.MoveTable validator_candidates */ 7:
					message.validatorCandidates = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.validatorCandidates,
					);
					break;
				case /* map<string, uint64> at_risk_validators */ 8:
					this.binaryReadMap8(message.atRiskValidators, reader, options);
					break;
				case /* optional sui.rpc.v2beta2.MoveTable extra_fields */ 9:
					message.extraFields = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.extraFields,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	private binaryReadMap8(
		map: ValidatorSet['atRiskValidators'],
		reader: IBinaryReader,
		options: BinaryReadOptions,
	): void {
		let len = reader.uint32(),
			end = reader.pos + len,
			key: keyof ValidatorSet['atRiskValidators'] | undefined,
			val: ValidatorSet['atRiskValidators'][any] | undefined;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case 1:
					key = reader.string();
					break;
				case 2:
					val = reader.uint64().toBigInt();
					break;
				default:
					throw new globalThis.Error(
						'unknown map entry field for field sui.rpc.v2beta2.ValidatorSet.at_risk_validators',
					);
			}
		}
		map[key ?? ''] = val ?? 0n;
	}
	internalBinaryWrite(
		message: ValidatorSet,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 total_stake = 1; */
		if (message.totalStake !== undefined) writer.tag(1, WireType.Varint).uint64(message.totalStake);
		/* repeated sui.rpc.v2beta2.Validator active_validators = 2; */
		for (let i = 0; i < message.activeValidators.length; i++)
			Validator.internalBinaryWrite(
				message.activeValidators[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.MoveTable pending_active_validators = 3; */
		if (message.pendingActiveValidators)
			MoveTable.internalBinaryWrite(
				message.pendingActiveValidators,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated uint64 pending_removals = 4; */
		if (message.pendingRemovals.length) {
			writer.tag(4, WireType.LengthDelimited).fork();
			for (let i = 0; i < message.pendingRemovals.length; i++)
				writer.uint64(message.pendingRemovals[i]);
			writer.join();
		}
		/* optional sui.rpc.v2beta2.MoveTable staking_pool_mappings = 5; */
		if (message.stakingPoolMappings)
			MoveTable.internalBinaryWrite(
				message.stakingPoolMappings,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.MoveTable inactive_validators = 6; */
		if (message.inactiveValidators)
			MoveTable.internalBinaryWrite(
				message.inactiveValidators,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.MoveTable validator_candidates = 7; */
		if (message.validatorCandidates)
			MoveTable.internalBinaryWrite(
				message.validatorCandidates,
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* map<string, uint64> at_risk_validators = 8; */
		for (let k of globalThis.Object.keys(message.atRiskValidators))
			writer
				.tag(8, WireType.LengthDelimited)
				.fork()
				.tag(1, WireType.LengthDelimited)
				.string(k)
				.tag(2, WireType.Varint)
				.uint64(message.atRiskValidators[k])
				.join();
		/* optional sui.rpc.v2beta2.MoveTable extra_fields = 9; */
		if (message.extraFields)
			MoveTable.internalBinaryWrite(
				message.extraFields,
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ValidatorSet
 */
export const ValidatorSet = new ValidatorSet$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Validator$Type extends MessageType<Validator> {
	constructor() {
		super('sui.rpc.v2beta2.Validator', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'description', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'image_url', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'project_url', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 7, name: 'protocol_public_key', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 8, name: 'proof_of_possession', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 10, name: 'network_public_key', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 12, name: 'worker_public_key', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 13, name: 'network_address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 14,
				name: 'p2p_address',
				kind: 'scalar',
				jsonName: 'p2pAddress',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{ no: 15, name: 'primary_address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 16, name: 'worker_address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 18,
				name: 'next_epoch_protocol_public_key',
				kind: 'scalar',
				opt: true,
				T: 12 /*ScalarType.BYTES*/,
			},
			{
				no: 19,
				name: 'next_epoch_proof_of_possession',
				kind: 'scalar',
				opt: true,
				T: 12 /*ScalarType.BYTES*/,
			},
			{
				no: 21,
				name: 'next_epoch_network_public_key',
				kind: 'scalar',
				opt: true,
				T: 12 /*ScalarType.BYTES*/,
			},
			{
				no: 23,
				name: 'next_epoch_worker_public_key',
				kind: 'scalar',
				opt: true,
				T: 12 /*ScalarType.BYTES*/,
			},
			{
				no: 24,
				name: 'next_epoch_network_address',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 25,
				name: 'next_epoch_p2p_address',
				kind: 'scalar',
				jsonName: 'nextEpochP2pAddress',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 26,
				name: 'next_epoch_primary_address',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 27,
				name: 'next_epoch_worker_address',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{ no: 28, name: 'metadata_extra_fields', kind: 'message', T: () => MoveTable },
			{
				no: 29,
				name: 'voting_power',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 30, name: 'operation_cap_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 31,
				name: 'gas_price',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 32, name: 'staking_pool', kind: 'message', T: () => StakingPool },
			{
				no: 33,
				name: 'commission_rate',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 34,
				name: 'next_epoch_stake',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 35,
				name: 'next_epoch_gas_price',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 36,
				name: 'next_epoch_commission_rate',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 37, name: 'extra_fields', kind: 'message', T: () => MoveTable },
		]);
	}
	create(value?: PartialMessage<Validator>): Validator {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Validator>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Validator,
	): Validator {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string name */ 1:
					message.name = reader.string();
					break;
				case /* optional string address */ 2:
					message.address = reader.string();
					break;
				case /* optional string description */ 3:
					message.description = reader.string();
					break;
				case /* optional string image_url */ 4:
					message.imageUrl = reader.string();
					break;
				case /* optional string project_url */ 5:
					message.projectUrl = reader.string();
					break;
				case /* optional bytes protocol_public_key */ 7:
					message.protocolPublicKey = reader.bytes();
					break;
				case /* optional bytes proof_of_possession */ 8:
					message.proofOfPossession = reader.bytes();
					break;
				case /* optional bytes network_public_key */ 10:
					message.networkPublicKey = reader.bytes();
					break;
				case /* optional bytes worker_public_key */ 12:
					message.workerPublicKey = reader.bytes();
					break;
				case /* optional string network_address */ 13:
					message.networkAddress = reader.string();
					break;
				case /* optional string p2p_address = 14 [json_name = "p2pAddress"];*/ 14:
					message.p2PAddress = reader.string();
					break;
				case /* optional string primary_address */ 15:
					message.primaryAddress = reader.string();
					break;
				case /* optional string worker_address */ 16:
					message.workerAddress = reader.string();
					break;
				case /* optional bytes next_epoch_protocol_public_key */ 18:
					message.nextEpochProtocolPublicKey = reader.bytes();
					break;
				case /* optional bytes next_epoch_proof_of_possession */ 19:
					message.nextEpochProofOfPossession = reader.bytes();
					break;
				case /* optional bytes next_epoch_network_public_key */ 21:
					message.nextEpochNetworkPublicKey = reader.bytes();
					break;
				case /* optional bytes next_epoch_worker_public_key */ 23:
					message.nextEpochWorkerPublicKey = reader.bytes();
					break;
				case /* optional string next_epoch_network_address */ 24:
					message.nextEpochNetworkAddress = reader.string();
					break;
				case /* optional string next_epoch_p2p_address = 25 [json_name = "nextEpochP2pAddress"];*/ 25:
					message.nextEpochP2PAddress = reader.string();
					break;
				case /* optional string next_epoch_primary_address */ 26:
					message.nextEpochPrimaryAddress = reader.string();
					break;
				case /* optional string next_epoch_worker_address */ 27:
					message.nextEpochWorkerAddress = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.MoveTable metadata_extra_fields */ 28:
					message.metadataExtraFields = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.metadataExtraFields,
					);
					break;
				case /* optional uint64 voting_power */ 29:
					message.votingPower = reader.uint64().toBigInt();
					break;
				case /* optional string operation_cap_id */ 30:
					message.operationCapId = reader.string();
					break;
				case /* optional uint64 gas_price */ 31:
					message.gasPrice = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.StakingPool staking_pool */ 32:
					message.stakingPool = StakingPool.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.stakingPool,
					);
					break;
				case /* optional uint64 commission_rate */ 33:
					message.commissionRate = reader.uint64().toBigInt();
					break;
				case /* optional uint64 next_epoch_stake */ 34:
					message.nextEpochStake = reader.uint64().toBigInt();
					break;
				case /* optional uint64 next_epoch_gas_price */ 35:
					message.nextEpochGasPrice = reader.uint64().toBigInt();
					break;
				case /* optional uint64 next_epoch_commission_rate */ 36:
					message.nextEpochCommissionRate = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.MoveTable extra_fields */ 37:
					message.extraFields = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.extraFields,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: Validator,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string name = 1; */
		if (message.name !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.name);
		/* optional string address = 2; */
		if (message.address !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.address);
		/* optional string description = 3; */
		if (message.description !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.description);
		/* optional string image_url = 4; */
		if (message.imageUrl !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.imageUrl);
		/* optional string project_url = 5; */
		if (message.projectUrl !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.projectUrl);
		/* optional bytes protocol_public_key = 7; */
		if (message.protocolPublicKey !== undefined)
			writer.tag(7, WireType.LengthDelimited).bytes(message.protocolPublicKey);
		/* optional bytes proof_of_possession = 8; */
		if (message.proofOfPossession !== undefined)
			writer.tag(8, WireType.LengthDelimited).bytes(message.proofOfPossession);
		/* optional bytes network_public_key = 10; */
		if (message.networkPublicKey !== undefined)
			writer.tag(10, WireType.LengthDelimited).bytes(message.networkPublicKey);
		/* optional bytes worker_public_key = 12; */
		if (message.workerPublicKey !== undefined)
			writer.tag(12, WireType.LengthDelimited).bytes(message.workerPublicKey);
		/* optional string network_address = 13; */
		if (message.networkAddress !== undefined)
			writer.tag(13, WireType.LengthDelimited).string(message.networkAddress);
		/* optional string p2p_address = 14 [json_name = "p2pAddress"]; */
		if (message.p2PAddress !== undefined)
			writer.tag(14, WireType.LengthDelimited).string(message.p2PAddress);
		/* optional string primary_address = 15; */
		if (message.primaryAddress !== undefined)
			writer.tag(15, WireType.LengthDelimited).string(message.primaryAddress);
		/* optional string worker_address = 16; */
		if (message.workerAddress !== undefined)
			writer.tag(16, WireType.LengthDelimited).string(message.workerAddress);
		/* optional bytes next_epoch_protocol_public_key = 18; */
		if (message.nextEpochProtocolPublicKey !== undefined)
			writer.tag(18, WireType.LengthDelimited).bytes(message.nextEpochProtocolPublicKey);
		/* optional bytes next_epoch_proof_of_possession = 19; */
		if (message.nextEpochProofOfPossession !== undefined)
			writer.tag(19, WireType.LengthDelimited).bytes(message.nextEpochProofOfPossession);
		/* optional bytes next_epoch_network_public_key = 21; */
		if (message.nextEpochNetworkPublicKey !== undefined)
			writer.tag(21, WireType.LengthDelimited).bytes(message.nextEpochNetworkPublicKey);
		/* optional bytes next_epoch_worker_public_key = 23; */
		if (message.nextEpochWorkerPublicKey !== undefined)
			writer.tag(23, WireType.LengthDelimited).bytes(message.nextEpochWorkerPublicKey);
		/* optional string next_epoch_network_address = 24; */
		if (message.nextEpochNetworkAddress !== undefined)
			writer.tag(24, WireType.LengthDelimited).string(message.nextEpochNetworkAddress);
		/* optional string next_epoch_p2p_address = 25 [json_name = "nextEpochP2pAddress"]; */
		if (message.nextEpochP2PAddress !== undefined)
			writer.tag(25, WireType.LengthDelimited).string(message.nextEpochP2PAddress);
		/* optional string next_epoch_primary_address = 26; */
		if (message.nextEpochPrimaryAddress !== undefined)
			writer.tag(26, WireType.LengthDelimited).string(message.nextEpochPrimaryAddress);
		/* optional string next_epoch_worker_address = 27; */
		if (message.nextEpochWorkerAddress !== undefined)
			writer.tag(27, WireType.LengthDelimited).string(message.nextEpochWorkerAddress);
		/* optional sui.rpc.v2beta2.MoveTable metadata_extra_fields = 28; */
		if (message.metadataExtraFields)
			MoveTable.internalBinaryWrite(
				message.metadataExtraFields,
				writer.tag(28, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 voting_power = 29; */
		if (message.votingPower !== undefined)
			writer.tag(29, WireType.Varint).uint64(message.votingPower);
		/* optional string operation_cap_id = 30; */
		if (message.operationCapId !== undefined)
			writer.tag(30, WireType.LengthDelimited).string(message.operationCapId);
		/* optional uint64 gas_price = 31; */
		if (message.gasPrice !== undefined) writer.tag(31, WireType.Varint).uint64(message.gasPrice);
		/* optional sui.rpc.v2beta2.StakingPool staking_pool = 32; */
		if (message.stakingPool)
			StakingPool.internalBinaryWrite(
				message.stakingPool,
				writer.tag(32, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 commission_rate = 33; */
		if (message.commissionRate !== undefined)
			writer.tag(33, WireType.Varint).uint64(message.commissionRate);
		/* optional uint64 next_epoch_stake = 34; */
		if (message.nextEpochStake !== undefined)
			writer.tag(34, WireType.Varint).uint64(message.nextEpochStake);
		/* optional uint64 next_epoch_gas_price = 35; */
		if (message.nextEpochGasPrice !== undefined)
			writer.tag(35, WireType.Varint).uint64(message.nextEpochGasPrice);
		/* optional uint64 next_epoch_commission_rate = 36; */
		if (message.nextEpochCommissionRate !== undefined)
			writer.tag(36, WireType.Varint).uint64(message.nextEpochCommissionRate);
		/* optional sui.rpc.v2beta2.MoveTable extra_fields = 37; */
		if (message.extraFields)
			MoveTable.internalBinaryWrite(
				message.extraFields,
				writer.tag(37, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Validator
 */
export const Validator = new Validator$Type();
// @generated message type with reflection information, may provide speed optimized methods
class StakingPool$Type extends MessageType<StakingPool> {
	constructor() {
		super('sui.rpc.v2beta2.StakingPool', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'activation_epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'deactivation_epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 4,
				name: 'sui_balance',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 5,
				name: 'rewards_pool',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 6,
				name: 'pool_token_balance',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 7, name: 'exchange_rates', kind: 'message', T: () => MoveTable },
			{
				no: 8,
				name: 'pending_stake',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 9,
				name: 'pending_total_sui_withdraw',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 10,
				name: 'pending_pool_token_withdraw',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 11, name: 'extra_fields', kind: 'message', T: () => MoveTable },
		]);
	}
	create(value?: PartialMessage<StakingPool>): StakingPool {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<StakingPool>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: StakingPool,
	): StakingPool {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string id */ 1:
					message.id = reader.string();
					break;
				case /* optional uint64 activation_epoch */ 2:
					message.activationEpoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 deactivation_epoch */ 3:
					message.deactivationEpoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 sui_balance */ 4:
					message.suiBalance = reader.uint64().toBigInt();
					break;
				case /* optional uint64 rewards_pool */ 5:
					message.rewardsPool = reader.uint64().toBigInt();
					break;
				case /* optional uint64 pool_token_balance */ 6:
					message.poolTokenBalance = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.MoveTable exchange_rates */ 7:
					message.exchangeRates = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.exchangeRates,
					);
					break;
				case /* optional uint64 pending_stake */ 8:
					message.pendingStake = reader.uint64().toBigInt();
					break;
				case /* optional uint64 pending_total_sui_withdraw */ 9:
					message.pendingTotalSuiWithdraw = reader.uint64().toBigInt();
					break;
				case /* optional uint64 pending_pool_token_withdraw */ 10:
					message.pendingPoolTokenWithdraw = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.MoveTable extra_fields */ 11:
					message.extraFields = MoveTable.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.extraFields,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: StakingPool,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string id = 1; */
		if (message.id !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.id);
		/* optional uint64 activation_epoch = 2; */
		if (message.activationEpoch !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.activationEpoch);
		/* optional uint64 deactivation_epoch = 3; */
		if (message.deactivationEpoch !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.deactivationEpoch);
		/* optional uint64 sui_balance = 4; */
		if (message.suiBalance !== undefined) writer.tag(4, WireType.Varint).uint64(message.suiBalance);
		/* optional uint64 rewards_pool = 5; */
		if (message.rewardsPool !== undefined)
			writer.tag(5, WireType.Varint).uint64(message.rewardsPool);
		/* optional uint64 pool_token_balance = 6; */
		if (message.poolTokenBalance !== undefined)
			writer.tag(6, WireType.Varint).uint64(message.poolTokenBalance);
		/* optional sui.rpc.v2beta2.MoveTable exchange_rates = 7; */
		if (message.exchangeRates)
			MoveTable.internalBinaryWrite(
				message.exchangeRates,
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 pending_stake = 8; */
		if (message.pendingStake !== undefined)
			writer.tag(8, WireType.Varint).uint64(message.pendingStake);
		/* optional uint64 pending_total_sui_withdraw = 9; */
		if (message.pendingTotalSuiWithdraw !== undefined)
			writer.tag(9, WireType.Varint).uint64(message.pendingTotalSuiWithdraw);
		/* optional uint64 pending_pool_token_withdraw = 10; */
		if (message.pendingPoolTokenWithdraw !== undefined)
			writer.tag(10, WireType.Varint).uint64(message.pendingPoolTokenWithdraw);
		/* optional sui.rpc.v2beta2.MoveTable extra_fields = 11; */
		if (message.extraFields)
			MoveTable.internalBinaryWrite(
				message.extraFields,
				writer.tag(11, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.StakingPool
 */
export const StakingPool = new StakingPool$Type();
