/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as validator from './validator.js';
import * as table_vec from '../sui/table_vec.js';
import * as table from '../sui/table.js';
import * as vec_map from '../sui/vec_map.js';
import * as bag from '../sui/bag.js';
import * as staking_pool from './staking_pool.js';
const $moduleName = '0x3::validator_set';
export const ValidatorSet = new MoveStruct({
	name: `${$moduleName}::ValidatorSet`,
	fields: {
		/**
		 * Total amount of stake from all active validators at the beginning of the epoch.
		 * Written only once per epoch, in `advance_epoch` function.
		 */
		total_stake: bcs.u64(),
		/** The current list of active validators. */
		active_validators: bcs.vector(validator.Validator),
		/**
		 * List of new validator candidates added during the current epoch. They will be
		 * processed at the end of the epoch.
		 */
		pending_active_validators: table_vec.TableVec,
		/**
		 * Removal requests from the validators. Each element is an index pointing to
		 * `active_validators`.
		 */
		pending_removals: bcs.vector(bcs.u64()),
		/** Mappings from staking pool's ID to the sui address of a validator. */
		staking_pool_mappings: table.Table,
		/**
		 * Mapping from a staking pool ID to the inactive validator that has that pool as
		 * its staking pool. When a validator is deactivated the validator is removed from
		 * `active_validators` it is added to this table so that stakers can continue to
		 * withdraw their stake from it.
		 */
		inactive_validators: table.Table,
		/**
		 * Table storing preactive/candidate validators, mapping their addresses to their
		 * `Validator ` structs. When an address calls `request_add_validator_candidate`,
		 * they get added to this table and become a preactive validator. When the
		 * candidate has met the min stake requirement, they can call
		 * `request_add_validator` to officially add them to the active validator set
		 * `active_validators` next epoch.
		 */
		validator_candidates: table.Table,
		/**
		 * Table storing the number of epochs during which a validator's stake has been
		 * below the low stake threshold.
		 */
		at_risk_validators: vec_map.VecMap(bcs.Address, bcs.u64()),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export const ValidatorEpochInfoEvent = new MoveStruct({
	name: `${$moduleName}::ValidatorEpochInfoEvent`,
	fields: {
		epoch: bcs.u64(),
		validator_address: bcs.Address,
		reference_gas_survey_quote: bcs.u64(),
		stake: bcs.u64(),
		commission_rate: bcs.u64(),
		pool_staking_reward: bcs.u64(),
		storage_fund_staking_reward: bcs.u64(),
		pool_token_exchange_rate: staking_pool.PoolTokenExchangeRate,
		tallying_rule_reporters: bcs.vector(bcs.Address),
		tallying_rule_global_score: bcs.u64(),
	},
});
export const ValidatorEpochInfoEventV2 = new MoveStruct({
	name: `${$moduleName}::ValidatorEpochInfoEventV2`,
	fields: {
		epoch: bcs.u64(),
		validator_address: bcs.Address,
		reference_gas_survey_quote: bcs.u64(),
		stake: bcs.u64(),
		voting_power: bcs.u64(),
		commission_rate: bcs.u64(),
		pool_staking_reward: bcs.u64(),
		storage_fund_staking_reward: bcs.u64(),
		pool_token_exchange_rate: staking_pool.PoolTokenExchangeRate,
		tallying_rule_reporters: bcs.vector(bcs.Address),
		tallying_rule_global_score: bcs.u64(),
	},
});
export const ValidatorJoinEvent = new MoveStruct({
	name: `${$moduleName}::ValidatorJoinEvent`,
	fields: {
		epoch: bcs.u64(),
		validator_address: bcs.Address,
		staking_pool_id: bcs.Address,
	},
});
export const ValidatorLeaveEvent = new MoveStruct({
	name: `${$moduleName}::ValidatorLeaveEvent`,
	fields: {
		epoch: bcs.u64(),
		validator_address: bcs.Address,
		staking_pool_id: bcs.Address,
		is_voluntary: bcs.bool(),
	},
});
export const VotingPowerAdmissionStartEpochKey = new MoveTuple({
	name: `${$moduleName}::VotingPowerAdmissionStartEpochKey`,
	fields: [bcs.bool()],
});
export interface DeriveReferenceGasPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface DeriveReferenceGasPriceOptions {
	package: string;
	arguments: DeriveReferenceGasPriceArguments | [self: RawTransactionArgument<string>];
}
/**
 * Called by `sui_system` to derive reference gas price for the new epoch. Derive
 * the reference gas price based on the gas price quote submitted by each
 * validator. The returned gas price should be greater than or equal to 2/3 of the
 * validators submitted gas price, weighted by stake.
 */
export function deriveReferenceGasPrice(options: DeriveReferenceGasPriceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'derive_reference_gas_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TotalStakeArguments {
	self: RawTransactionArgument<string>;
}
export interface TotalStakeOptions {
	package: string;
	arguments: TotalStakeArguments | [self: RawTransactionArgument<string>];
}
export function totalStake(options: TotalStakeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'total_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidatorTotalStakeAmountArguments {
	self: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
}
export interface ValidatorTotalStakeAmountOptions {
	package: string;
	arguments:
		| ValidatorTotalStakeAmountArguments
		| [self: RawTransactionArgument<string>, validatorAddress: RawTransactionArgument<string>];
}
export function validatorTotalStakeAmount(options: ValidatorTotalStakeAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'validatorAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'validator_total_stake_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidatorStakeAmountArguments {
	self: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
}
export interface ValidatorStakeAmountOptions {
	package: string;
	arguments:
		| ValidatorStakeAmountArguments
		| [self: RawTransactionArgument<string>, validatorAddress: RawTransactionArgument<string>];
}
export function validatorStakeAmount(options: ValidatorStakeAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'validatorAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'validator_stake_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidatorVotingPowerArguments {
	self: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
}
export interface ValidatorVotingPowerOptions {
	package: string;
	arguments:
		| ValidatorVotingPowerArguments
		| [self: RawTransactionArgument<string>, validatorAddress: RawTransactionArgument<string>];
}
export function validatorVotingPower(options: ValidatorVotingPowerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'validatorAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'validator_voting_power',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidatorStakingPoolIdArguments {
	self: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
}
export interface ValidatorStakingPoolIdOptions {
	package: string;
	arguments:
		| ValidatorStakingPoolIdArguments
		| [self: RawTransactionArgument<string>, validatorAddress: RawTransactionArgument<string>];
}
export function validatorStakingPoolId(options: ValidatorStakingPoolIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'validatorAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'validator_staking_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StakingPoolMappingsArguments {
	self: RawTransactionArgument<string>;
}
export interface StakingPoolMappingsOptions {
	package: string;
	arguments: StakingPoolMappingsArguments | [self: RawTransactionArgument<string>];
}
export function stakingPoolMappings(options: StakingPoolMappingsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'staking_pool_mappings',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidatorAddressByPoolIdArguments {
	self: RawTransactionArgument<string>;
	poolId: RawTransactionArgument<string>;
}
export interface ValidatorAddressByPoolIdOptions {
	package: string;
	arguments:
		| ValidatorAddressByPoolIdArguments
		| [self: RawTransactionArgument<string>, poolId: RawTransactionArgument<string>];
}
export function validatorAddressByPoolId(options: ValidatorAddressByPoolIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'poolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'validator_address_by_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetActiveValidatorRefArguments {
	self: RawTransactionArgument<string>;
	addr: RawTransactionArgument<string>;
}
export interface GetActiveValidatorRefOptions {
	package: string;
	arguments:
		| GetActiveValidatorRefArguments
		| [self: RawTransactionArgument<string>, addr: RawTransactionArgument<string>];
}
export function getActiveValidatorRef(options: GetActiveValidatorRefOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'get_active_validator_ref',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetPendingValidatorRefArguments {
	self: RawTransactionArgument<string>;
	addr: RawTransactionArgument<string>;
}
export interface GetPendingValidatorRefOptions {
	package: string;
	arguments:
		| GetPendingValidatorRefArguments
		| [self: RawTransactionArgument<string>, addr: RawTransactionArgument<string>];
}
export function getPendingValidatorRef(options: GetPendingValidatorRefOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'get_pending_validator_ref',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SumVotingPowerByAddressesArguments {
	vs: RawTransactionArgument<string[]>;
	addresses: RawTransactionArgument<string[]>;
}
export interface SumVotingPowerByAddressesOptions {
	package: string;
	arguments:
		| SumVotingPowerByAddressesArguments
		| [vs: RawTransactionArgument<string[]>, addresses: RawTransactionArgument<string[]>];
}
/** Sum up the total stake of a given list of validator addresses. */
export function sumVotingPowerByAddresses(options: SumVotingPowerByAddressesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<null>', 'vector<address>'] satisfies (string | null)[];
	const parameterNames = ['vs', 'addresses'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'sum_voting_power_by_addresses',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ActiveValidatorsArguments {
	self: RawTransactionArgument<string>;
}
export interface ActiveValidatorsOptions {
	package: string;
	arguments: ActiveValidatorsArguments | [self: RawTransactionArgument<string>];
}
/** Return the active validators in `self` */
export function activeValidators(options: ActiveValidatorsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'active_validators',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsValidatorCandidateArguments {
	self: RawTransactionArgument<string>;
	addr: RawTransactionArgument<string>;
}
export interface IsValidatorCandidateOptions {
	package: string;
	arguments:
		| IsValidatorCandidateArguments
		| [self: RawTransactionArgument<string>, addr: RawTransactionArgument<string>];
}
/** Returns true if the `addr` is a validator candidate. */
export function isValidatorCandidate(options: IsValidatorCandidateOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'is_validator_candidate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsInactiveValidatorArguments {
	self: RawTransactionArgument<string>;
	stakingPoolId: RawTransactionArgument<string>;
}
export interface IsInactiveValidatorOptions {
	package: string;
	arguments:
		| IsInactiveValidatorArguments
		| [self: RawTransactionArgument<string>, stakingPoolId: RawTransactionArgument<string>];
}
/**
 * Returns true if the staking pool identified by `staking_pool_id` is of an
 * inactive validator.
 */
export function isInactiveValidator(options: IsInactiveValidatorOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'stakingPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator_set',
			function: 'is_inactive_validator',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
