/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Sui System State Type Upgrade Guide `SuiSystemState` is a thin wrapper around
 * `SuiSystemStateInner` that provides a versioned interface. The `SuiSystemState`
 * object has a fixed ID 0x5, and the `SuiSystemStateInner` object is stored as a
 * dynamic field. There are a few different ways to upgrade the
 * `SuiSystemStateInner` type:
 *
 * The simplest and one that doesn't involve a real upgrade is to just add dynamic
 * fields to the `extra_fields` field of `SuiSystemStateInner` or any of its sub
 * type. This is useful when we are in a rush, or making a small change, or still
 * experimenting a new field.
 *
 * To properly upgrade the `SuiSystemStateInner` type, we need to ship a new
 * framework that does the following:
 *
 * 1.  Define a new `SuiSystemStateInner`type (e.g. `SuiSystemStateInnerV2`).
 * 2.  Define a data migration function that migrates the old `SuiSystemStateInner`
 *     to the new one (i.e. SuiSystemStateInnerV2).
 * 3.  Replace all uses of `SuiSystemStateInner` with `SuiSystemStateInnerV2` in
 *     both sui_system.move and sui_system_state_inner.move, with the exception of
 *     the `sui_system_state_inner::create` function, which should always return
 *     the genesis type.
 * 4.  Inside `load_inner_maybe_upgrade` function, check the current version in the
 *     wrapper, and if it's not the latest version, call the data migration
 *     function to upgrade the inner object. Make sure to also update the version
 *     in the wrapper. A detailed example can be found in
 *     sui/tests/framework_upgrades/mock_sui_systems/shallow_upgrade. Along with
 *     the Move change, we also need to update the Rust code to support the new
 *     type. This includes:
 * 5.  Define a new `SuiSystemStateInner` struct type that matches the new Move
 *     type, and implement the SuiSystemStateTrait.
 * 6.  Update the `SuiSystemState` struct to include the new version as a new enum
 *     variant.
 * 7.  Update the `get_sui_system_state` function to handle the new version. To
 *     test that the upgrade will be successful, we need to modify
 *     `sui_system_state_production_upgrade_test` test in protocol_version_tests
 *     and trigger a real upgrade using the new framework. We will need to keep
 *     this directory as old version, put the new framework in a new directory, and
 *     run the test to exercise the upgrade.
 *
 * To upgrade Validator type, besides everything above, we also need to:
 *
 * 1.  Define a new Validator type (e.g. ValidatorV2).
 * 2.  Define a data migration function that migrates the old Validator to the new
 *     one (i.e. ValidatorV2).
 * 3.  Replace all uses of Validator with ValidatorV2 except the genesis creation
 *     function.
 * 4.  In validator_wrapper::upgrade_to_latest, check the current version in the
 *     wrapper, and if it's not the latest version, call the data migration
 *     function to upgrade it. In Rust, we also need to add a new case in
 *     `get_validator_from_table`. Note that it is possible to upgrade
 *     SuiSystemStateInner without upgrading Validator, but not the other way
 *     around. And when we only upgrade SuiSystemStateInner, the version of
 *     Validator in the wrapper will not be updated, and hence may become
 *     inconsistent with the version of SuiSystemStateInner. This is fine as long
 *     as we don't use the Validator version to determine the SuiSystemStateInner
 *     version, or vice versa.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x3::sui_system';
export const SuiSystemState = new MoveStruct({
	name: `${$moduleName}::SuiSystemState`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
	},
});
export interface RequestAddValidatorCandidateArguments {
	pubkeyBytes: RawTransactionArgument<number[]>;
	networkPubkeyBytes: RawTransactionArgument<number[]>;
	workerPubkeyBytes: RawTransactionArgument<number[]>;
	proofOfPossession: RawTransactionArgument<number[]>;
	name: RawTransactionArgument<number[]>;
	description: RawTransactionArgument<number[]>;
	imageUrl: RawTransactionArgument<number[]>;
	projectUrl: RawTransactionArgument<number[]>;
	netAddress: RawTransactionArgument<number[]>;
	p2pAddress: RawTransactionArgument<number[]>;
	primaryAddress: RawTransactionArgument<number[]>;
	workerAddress: RawTransactionArgument<number[]>;
	gasPrice: RawTransactionArgument<number | bigint>;
	commissionRate: RawTransactionArgument<number | bigint>;
}
export interface RequestAddValidatorCandidateOptions {
	package: string;
	arguments:
		| RequestAddValidatorCandidateArguments
		| [
				pubkeyBytes: RawTransactionArgument<number[]>,
				networkPubkeyBytes: RawTransactionArgument<number[]>,
				workerPubkeyBytes: RawTransactionArgument<number[]>,
				proofOfPossession: RawTransactionArgument<number[]>,
				name: RawTransactionArgument<number[]>,
				description: RawTransactionArgument<number[]>,
				imageUrl: RawTransactionArgument<number[]>,
				projectUrl: RawTransactionArgument<number[]>,
				netAddress: RawTransactionArgument<number[]>,
				p2pAddress: RawTransactionArgument<number[]>,
				primaryAddress: RawTransactionArgument<number[]>,
				workerAddress: RawTransactionArgument<number[]>,
				gasPrice: RawTransactionArgument<number | bigint>,
				commissionRate: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Can be called by anyone who wishes to become a validator candidate and starts
 * accruing delegated stakes in their staking pool. Once they have at least
 * `MIN_VALIDATOR_JOINING_STAKE` amount of stake they can call
 * `request_add_validator` to officially become an active validator at the next
 * epoch. Aborts if the caller is already a pending or active validator, or a
 * validator candidate. Note: `proof_of_possession` MUST be a valid signature using
 * sui_address and protocol_pubkey_bytes. To produce a valid PoP, run [fn
 * test_proof_of_possession].
 */
export function requestAddValidatorCandidate(options: RequestAddValidatorCandidateOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		'0x3::sui_system::SuiSystemState',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'u64',
		'u64',
	] satisfies (string | null)[];
	const parameterNames = [
		'pubkeyBytes',
		'networkPubkeyBytes',
		'workerPubkeyBytes',
		'proofOfPossession',
		'name',
		'description',
		'imageUrl',
		'projectUrl',
		'netAddress',
		'p2pAddress',
		'primaryAddress',
		'workerAddress',
		'gasPrice',
		'commissionRate',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_add_validator_candidate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestRemoveValidatorCandidateArguments {}
export interface RequestRemoveValidatorCandidateOptions {
	package: string;
	arguments?: RequestRemoveValidatorCandidateArguments | [];
}
/**
 * Called by a validator candidate to remove themselves from the candidacy. After
 * this call their staking pool becomes deactivate.
 */
export function requestRemoveValidatorCandidate(
	options: RequestRemoveValidatorCandidateOptions = {},
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_remove_validator_candidate',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
		});
}
export interface RequestAddValidatorArguments {}
export interface RequestAddValidatorOptions {
	package: string;
	arguments?: RequestAddValidatorArguments | [];
}
/**
 * Called by a validator candidate to add themselves to the active validator set
 * beginning next epoch. Aborts if the validator is a duplicate with one of the
 * pending or active validators, or if the amount of stake the validator has
 * doesn't meet the min threshold, or if the number of new validators for the next
 * epoch has already reached the maximum.
 */
export function requestAddValidator(options: RequestAddValidatorOptions = {}) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_add_validator',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
		});
}
export interface RequestRemoveValidatorArguments {}
export interface RequestRemoveValidatorOptions {
	package: string;
	arguments?: RequestRemoveValidatorArguments | [];
}
/**
 * A validator can call this function to request a removal in the next epoch. We
 * use the sender of `ctx` to look up the validator (i.e. sender must match the
 * sui_address in the validator). At the end of the epoch, the `validator` object
 * will be returned to the sui_address of the validator.
 */
export function requestRemoveValidator(options: RequestRemoveValidatorOptions = {}) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_remove_validator',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
		});
}
export interface RequestSetGasPriceArguments {
	cap: RawTransactionArgument<string>;
	newGasPrice: RawTransactionArgument<number | bigint>;
}
export interface RequestSetGasPriceOptions {
	package: string;
	arguments:
		| RequestSetGasPriceArguments
		| [cap: RawTransactionArgument<string>, newGasPrice: RawTransactionArgument<number | bigint>];
}
/**
 * A validator can call this entry function to submit a new gas price quote, to be
 * used for the reference gas price calculation at the end of the epoch.
 */
export function requestSetGasPrice(options: RequestSetGasPriceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null, 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['cap', 'newGasPrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_set_gas_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetCandidateValidatorGasPriceArguments {
	cap: RawTransactionArgument<string>;
	newGasPrice: RawTransactionArgument<number | bigint>;
}
export interface SetCandidateValidatorGasPriceOptions {
	package: string;
	arguments:
		| SetCandidateValidatorGasPriceArguments
		| [cap: RawTransactionArgument<string>, newGasPrice: RawTransactionArgument<number | bigint>];
}
/** This entry function is used to set new gas price for candidate validators */
export function setCandidateValidatorGasPrice(options: SetCandidateValidatorGasPriceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null, 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['cap', 'newGasPrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'set_candidate_validator_gas_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestSetCommissionRateArguments {
	newCommissionRate: RawTransactionArgument<number | bigint>;
}
export interface RequestSetCommissionRateOptions {
	package: string;
	arguments:
		| RequestSetCommissionRateArguments
		| [newCommissionRate: RawTransactionArgument<number | bigint>];
}
/**
 * A validator can call this entry function to set a new commission rate, updated
 * at the end of the epoch.
 */
export function requestSetCommissionRate(options: RequestSetCommissionRateOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'u64'] satisfies (string | null)[];
	const parameterNames = ['newCommissionRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_set_commission_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetCandidateValidatorCommissionRateArguments {
	newCommissionRate: RawTransactionArgument<number | bigint>;
}
export interface SetCandidateValidatorCommissionRateOptions {
	package: string;
	arguments:
		| SetCandidateValidatorCommissionRateArguments
		| [newCommissionRate: RawTransactionArgument<number | bigint>];
}
/** This entry function is used to set new commission rate for candidate validators */
export function setCandidateValidatorCommissionRate(
	options: SetCandidateValidatorCommissionRateOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'u64'] satisfies (string | null)[];
	const parameterNames = ['newCommissionRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'set_candidate_validator_commission_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestAddStakeArguments {
	stake: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
}
export interface RequestAddStakeOptions {
	package: string;
	arguments:
		| RequestAddStakeArguments
		| [stake: RawTransactionArgument<string>, validatorAddress: RawTransactionArgument<string>];
}
/** Add stake to a validator's staking pool. */
export function requestAddStake(options: RequestAddStakeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null, 'address'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['stake', 'validatorAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_add_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestAddStakeNonEntryArguments {
	stake: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
}
export interface RequestAddStakeNonEntryOptions {
	package: string;
	arguments:
		| RequestAddStakeNonEntryArguments
		| [stake: RawTransactionArgument<string>, validatorAddress: RawTransactionArgument<string>];
}
/**
 * The non-entry version of `request_add_stake`, which returns the staked SUI
 * instead of transferring it to the sender.
 */
export function requestAddStakeNonEntry(options: RequestAddStakeNonEntryOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null, 'address'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['stake', 'validatorAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_add_stake_non_entry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestAddStakeMulCoinArguments {
	stakes: RawTransactionArgument<string[]>;
	stakeAmount: RawTransactionArgument<number | bigint | null>;
	validatorAddress: RawTransactionArgument<string>;
}
export interface RequestAddStakeMulCoinOptions {
	package: string;
	arguments:
		| RequestAddStakeMulCoinArguments
		| [
				stakes: RawTransactionArgument<string[]>,
				stakeAmount: RawTransactionArgument<number | bigint | null>,
				validatorAddress: RawTransactionArgument<string>,
		  ];
}
/** Add stake to a validator's staking pool using multiple coins. */
export function requestAddStakeMulCoin(options: RequestAddStakeMulCoinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		'0x3::sui_system::SuiSystemState',
		'vector<null>',
		'0x1::option::Option<u64>',
		'address',
	] satisfies (string | null)[];
	const parameterNames = ['stakes', 'stakeAmount', 'validatorAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_add_stake_mul_coin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestWithdrawStakeArguments {
	stakedSui: RawTransactionArgument<string>;
}
export interface RequestWithdrawStakeOptions {
	package: string;
	arguments: RequestWithdrawStakeArguments | [stakedSui: RawTransactionArgument<string>];
}
/** Withdraw stake from a validator's staking pool. */
export function requestWithdrawStake(options: RequestWithdrawStakeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null] satisfies (string | null)[];
	const parameterNames = ['stakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_withdraw_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ConvertToFungibleStakedSuiArguments {
	stakedSui: RawTransactionArgument<string>;
}
export interface ConvertToFungibleStakedSuiOptions {
	package: string;
	arguments: ConvertToFungibleStakedSuiArguments | [stakedSui: RawTransactionArgument<string>];
}
/** Convert StakedSui into a FungibleStakedSui object. */
export function convertToFungibleStakedSui(options: ConvertToFungibleStakedSuiOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null] satisfies (string | null)[];
	const parameterNames = ['stakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'convert_to_fungible_staked_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RedeemFungibleStakedSuiArguments {
	fungibleStakedSui: RawTransactionArgument<string>;
}
export interface RedeemFungibleStakedSuiOptions {
	package: string;
	arguments: RedeemFungibleStakedSuiArguments | [fungibleStakedSui: RawTransactionArgument<string>];
}
/** Convert FungibleStakedSui into a StakedSui object. */
export function redeemFungibleStakedSui(options: RedeemFungibleStakedSuiOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null] satisfies (string | null)[];
	const parameterNames = ['fungibleStakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'redeem_fungible_staked_sui',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestWithdrawStakeNonEntryArguments {
	stakedSui: RawTransactionArgument<string>;
}
export interface RequestWithdrawStakeNonEntryOptions {
	package: string;
	arguments: RequestWithdrawStakeNonEntryArguments | [stakedSui: RawTransactionArgument<string>];
}
/**
 * Non-entry version of `request_withdraw_stake` that returns the withdrawn SUI
 * instead of transferring it to the sender.
 */
export function requestWithdrawStakeNonEntry(options: RequestWithdrawStakeNonEntryOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null] satisfies (string | null)[];
	const parameterNames = ['stakedSui'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'request_withdraw_stake_non_entry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReportValidatorArguments {
	cap: RawTransactionArgument<string>;
	reporteeAddr: RawTransactionArgument<string>;
}
export interface ReportValidatorOptions {
	package: string;
	arguments:
		| ReportValidatorArguments
		| [cap: RawTransactionArgument<string>, reporteeAddr: RawTransactionArgument<string>];
}
/**
 * Report a validator as a bad or non-performant actor in the system. Succeeds if
 * all the following are satisfied:
 *
 * 1.  both the reporter in `cap` and the input `reportee_addr` are active
 *     validators.
 * 2.  reporter and reportee not the same address.
 * 3.  the cap object is still valid. This function is idempotent.
 */
export function reportValidator(options: ReportValidatorOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null, 'address'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['cap', 'reporteeAddr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'report_validator',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UndoReportValidatorArguments {
	cap: RawTransactionArgument<string>;
	reporteeAddr: RawTransactionArgument<string>;
}
export interface UndoReportValidatorOptions {
	package: string;
	arguments:
		| UndoReportValidatorArguments
		| [cap: RawTransactionArgument<string>, reporteeAddr: RawTransactionArgument<string>];
}
/**
 * Undo a `report_validator` action. Aborts if
 *
 * 1.  the reportee is not a currently active validator or
 * 2.  the sender has not previously reported the `reportee_addr`, or
 * 3.  the cap is not valid
 */
export function undoReportValidator(options: UndoReportValidatorOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', null, 'address'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['cap', 'reporteeAddr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'undo_report_validator',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RotateOperationCapArguments {}
export interface RotateOperationCapOptions {
	package: string;
	arguments?: RotateOperationCapArguments | [];
}
/**
 * Create a new `UnverifiedValidatorOperationCap`, transfer it to the validator and
 * registers it. The original object is thus revoked.
 */
export function rotateOperationCap(options: RotateOperationCapOptions = {}) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'rotate_operation_cap',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorNameArguments {
	name: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorNameOptions {
	package: string;
	arguments: UpdateValidatorNameArguments | [name: RawTransactionArgument<number[]>];
}
/** Update a validator's name. */
export function updateValidatorName(options: UpdateValidatorNameOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorDescriptionArguments {
	description: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorDescriptionOptions {
	package: string;
	arguments: UpdateValidatorDescriptionArguments | [description: RawTransactionArgument<number[]>];
}
/** Update a validator's description */
export function updateValidatorDescription(options: UpdateValidatorDescriptionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['description'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorImageUrlArguments {
	imageUrl: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorImageUrlOptions {
	package: string;
	arguments: UpdateValidatorImageUrlArguments | [imageUrl: RawTransactionArgument<number[]>];
}
/** Update a validator's image url */
export function updateValidatorImageUrl(options: UpdateValidatorImageUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['imageUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_image_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorProjectUrlArguments {
	projectUrl: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorProjectUrlOptions {
	package: string;
	arguments: UpdateValidatorProjectUrlArguments | [projectUrl: RawTransactionArgument<number[]>];
}
/** Update a validator's project url */
export function updateValidatorProjectUrl(options: UpdateValidatorProjectUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['projectUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_project_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorNextEpochNetworkAddressArguments {
	networkAddress: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorNextEpochNetworkAddressOptions {
	package: string;
	arguments:
		| UpdateValidatorNextEpochNetworkAddressArguments
		| [networkAddress: RawTransactionArgument<number[]>];
}
/**
 * Update a validator's network address. The change will only take effects starting
 * from the next epoch.
 */
export function updateValidatorNextEpochNetworkAddress(
	options: UpdateValidatorNextEpochNetworkAddressOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['networkAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_next_epoch_network_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateCandidateValidatorNetworkAddressArguments {
	networkAddress: RawTransactionArgument<number[]>;
}
export interface UpdateCandidateValidatorNetworkAddressOptions {
	package: string;
	arguments:
		| UpdateCandidateValidatorNetworkAddressArguments
		| [networkAddress: RawTransactionArgument<number[]>];
}
/** Update candidate validator's network address. */
export function updateCandidateValidatorNetworkAddress(
	options: UpdateCandidateValidatorNetworkAddressOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['networkAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_candidate_validator_network_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorNextEpochP2pAddressArguments {
	p2pAddress: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorNextEpochP2pAddressOptions {
	package: string;
	arguments:
		| UpdateValidatorNextEpochP2pAddressArguments
		| [p2pAddress: RawTransactionArgument<number[]>];
}
/**
 * Update a validator's p2p address. The change will only take effects starting
 * from the next epoch.
 */
export function updateValidatorNextEpochP2pAddress(
	options: UpdateValidatorNextEpochP2pAddressOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['p2pAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_next_epoch_p2p_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateCandidateValidatorP2pAddressArguments {
	p2pAddress: RawTransactionArgument<number[]>;
}
export interface UpdateCandidateValidatorP2pAddressOptions {
	package: string;
	arguments:
		| UpdateCandidateValidatorP2pAddressArguments
		| [p2pAddress: RawTransactionArgument<number[]>];
}
/** Update candidate validator's p2p address. */
export function updateCandidateValidatorP2pAddress(
	options: UpdateCandidateValidatorP2pAddressOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['p2pAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_candidate_validator_p2p_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorNextEpochPrimaryAddressArguments {
	primaryAddress: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorNextEpochPrimaryAddressOptions {
	package: string;
	arguments:
		| UpdateValidatorNextEpochPrimaryAddressArguments
		| [primaryAddress: RawTransactionArgument<number[]>];
}
/**
 * Update a validator's narwhal primary address. The change will only take effects
 * starting from the next epoch.
 */
export function updateValidatorNextEpochPrimaryAddress(
	options: UpdateValidatorNextEpochPrimaryAddressOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['primaryAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_next_epoch_primary_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateCandidateValidatorPrimaryAddressArguments {
	primaryAddress: RawTransactionArgument<number[]>;
}
export interface UpdateCandidateValidatorPrimaryAddressOptions {
	package: string;
	arguments:
		| UpdateCandidateValidatorPrimaryAddressArguments
		| [primaryAddress: RawTransactionArgument<number[]>];
}
/** Update candidate validator's narwhal primary address. */
export function updateCandidateValidatorPrimaryAddress(
	options: UpdateCandidateValidatorPrimaryAddressOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['primaryAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_candidate_validator_primary_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorNextEpochWorkerAddressArguments {
	workerAddress: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorNextEpochWorkerAddressOptions {
	package: string;
	arguments:
		| UpdateValidatorNextEpochWorkerAddressArguments
		| [workerAddress: RawTransactionArgument<number[]>];
}
/**
 * Update a validator's narwhal worker address. The change will only take effects
 * starting from the next epoch.
 */
export function updateValidatorNextEpochWorkerAddress(
	options: UpdateValidatorNextEpochWorkerAddressOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['workerAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_next_epoch_worker_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateCandidateValidatorWorkerAddressArguments {
	workerAddress: RawTransactionArgument<number[]>;
}
export interface UpdateCandidateValidatorWorkerAddressOptions {
	package: string;
	arguments:
		| UpdateCandidateValidatorWorkerAddressArguments
		| [workerAddress: RawTransactionArgument<number[]>];
}
/** Update candidate validator's narwhal worker address. */
export function updateCandidateValidatorWorkerAddress(
	options: UpdateCandidateValidatorWorkerAddressOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['workerAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_candidate_validator_worker_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorNextEpochProtocolPubkeyArguments {
	protocolPubkey: RawTransactionArgument<number[]>;
	proofOfPossession: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorNextEpochProtocolPubkeyOptions {
	package: string;
	arguments:
		| UpdateValidatorNextEpochProtocolPubkeyArguments
		| [
				protocolPubkey: RawTransactionArgument<number[]>,
				proofOfPossession: RawTransactionArgument<number[]>,
		  ];
}
/**
 * Update a validator's public key of protocol key and proof of possession. The
 * change will only take effects starting from the next epoch.
 */
export function updateValidatorNextEpochProtocolPubkey(
	options: UpdateValidatorNextEpochProtocolPubkeyOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['protocolPubkey', 'proofOfPossession'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_next_epoch_protocol_pubkey',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateCandidateValidatorProtocolPubkeyArguments {
	protocolPubkey: RawTransactionArgument<number[]>;
	proofOfPossession: RawTransactionArgument<number[]>;
}
export interface UpdateCandidateValidatorProtocolPubkeyOptions {
	package: string;
	arguments:
		| UpdateCandidateValidatorProtocolPubkeyArguments
		| [
				protocolPubkey: RawTransactionArgument<number[]>,
				proofOfPossession: RawTransactionArgument<number[]>,
		  ];
}
/** Update candidate validator's public key of protocol key and proof of possession. */
export function updateCandidateValidatorProtocolPubkey(
	options: UpdateCandidateValidatorProtocolPubkeyOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['protocolPubkey', 'proofOfPossession'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_candidate_validator_protocol_pubkey',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorNextEpochWorkerPubkeyArguments {
	workerPubkey: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorNextEpochWorkerPubkeyOptions {
	package: string;
	arguments:
		| UpdateValidatorNextEpochWorkerPubkeyArguments
		| [workerPubkey: RawTransactionArgument<number[]>];
}
/**
 * Update a validator's public key of worker key. The change will only take effects
 * starting from the next epoch.
 */
export function updateValidatorNextEpochWorkerPubkey(
	options: UpdateValidatorNextEpochWorkerPubkeyOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['workerPubkey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_next_epoch_worker_pubkey',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateCandidateValidatorWorkerPubkeyArguments {
	workerPubkey: RawTransactionArgument<number[]>;
}
export interface UpdateCandidateValidatorWorkerPubkeyOptions {
	package: string;
	arguments:
		| UpdateCandidateValidatorWorkerPubkeyArguments
		| [workerPubkey: RawTransactionArgument<number[]>];
}
/** Update candidate validator's public key of worker key. */
export function updateCandidateValidatorWorkerPubkey(
	options: UpdateCandidateValidatorWorkerPubkeyOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['workerPubkey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_candidate_validator_worker_pubkey',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateValidatorNextEpochNetworkPubkeyArguments {
	networkPubkey: RawTransactionArgument<number[]>;
}
export interface UpdateValidatorNextEpochNetworkPubkeyOptions {
	package: string;
	arguments:
		| UpdateValidatorNextEpochNetworkPubkeyArguments
		| [networkPubkey: RawTransactionArgument<number[]>];
}
/**
 * Update a validator's public key of network key. The change will only take
 * effects starting from the next epoch.
 */
export function updateValidatorNextEpochNetworkPubkey(
	options: UpdateValidatorNextEpochNetworkPubkeyOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['networkPubkey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_validator_next_epoch_network_pubkey',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateCandidateValidatorNetworkPubkeyArguments {
	networkPubkey: RawTransactionArgument<number[]>;
}
export interface UpdateCandidateValidatorNetworkPubkeyOptions {
	package: string;
	arguments:
		| UpdateCandidateValidatorNetworkPubkeyArguments
		| [networkPubkey: RawTransactionArgument<number[]>];
}
/** Update candidate validator's public key of network key. */
export function updateCandidateValidatorNetworkPubkey(
	options: UpdateCandidateValidatorNetworkPubkeyOptions,
) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['networkPubkey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'update_candidate_validator_network_pubkey',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidatorAddressByPoolIdArguments {
	poolId: RawTransactionArgument<string>;
}
export interface ValidatorAddressByPoolIdOptions {
	package: string;
	arguments: ValidatorAddressByPoolIdArguments | [poolId: RawTransactionArgument<string>];
}
export function validatorAddressByPoolId(options: ValidatorAddressByPoolIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', '0x2::object::ID'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['poolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'validator_address_by_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PoolExchangeRatesArguments {
	poolId: RawTransactionArgument<string>;
}
export interface PoolExchangeRatesOptions {
	package: string;
	arguments: PoolExchangeRatesArguments | [poolId: RawTransactionArgument<string>];
}
/**
 * Getter of the pool token exchange rate of a staking pool. Works for both active
 * and inactive pools.
 */
export function poolExchangeRates(options: PoolExchangeRatesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState', '0x2::object::ID'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['poolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'pool_exchange_rates',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ActiveValidatorAddressesArguments {}
export interface ActiveValidatorAddressesOptions {
	package: string;
	arguments?: ActiveValidatorAddressesArguments | [];
}
/** Getter returning addresses of the currently active validators. */
export function activeValidatorAddresses(options: ActiveValidatorAddressesOptions = {}) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'active_validator_addresses',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
		});
}
export interface ActiveValidatorAddressesRefArguments {}
export interface ActiveValidatorAddressesRefOptions {
	package: string;
	arguments?: ActiveValidatorAddressesRefArguments | [];
}
/** Getter returning addresses of the currently active validators by reference. */
export function activeValidatorAddressesRef(options: ActiveValidatorAddressesRefOptions = {}) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'active_validator_addresses_ref',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
		});
}
export interface ActiveValidatorVotingPowersArguments {}
export interface ActiveValidatorVotingPowersOptions {
	package: string;
	arguments?: ActiveValidatorVotingPowersArguments | [];
}
/**
 * Getter returns the voting power of the active validators, values are voting
 * power in the scale of 10000.
 */
export function activeValidatorVotingPowers(options: ActiveValidatorVotingPowersOptions = {}) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui_system',
			function: 'active_validator_voting_powers',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
		});
}
