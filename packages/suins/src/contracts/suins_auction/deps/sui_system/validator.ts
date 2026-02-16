/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as url from '../sui/url.js';
import * as bag from '../sui/bag.js';
import * as staking_pool from './staking_pool.js';
const $moduleName = '0x3::validator';
export const ValidatorMetadata = new MoveStruct({
	name: `${$moduleName}::ValidatorMetadata`,
	fields: {
		/**
		 * The Sui Address of the validator. This is the sender that created the Validator
		 * object, and also the address to send validator/coins to during withdraws.
		 */
		sui_address: bcs.Address,
		/**
		 * The public key bytes corresponding to the private key that the validator holds
		 * to sign transactions. For now, this is the same as AuthorityName.
		 */
		protocol_pubkey_bytes: bcs.vector(bcs.u8()),
		/**
		 * The public key bytes corresponding to the private key that the validator uses to
		 * establish TLS connections
		 */
		network_pubkey_bytes: bcs.vector(bcs.u8()),
		/** The public key bytes correstponding to the Narwhal Worker */
		worker_pubkey_bytes: bcs.vector(bcs.u8()),
		/** This is a proof that the validator has ownership of the private key */
		proof_of_possession: bcs.vector(bcs.u8()),
		/** A unique human-readable name of this validator. */
		name: bcs.string(),
		description: bcs.string(),
		image_url: url.Url,
		project_url: url.Url,
		/**
		 * The network address of the validator (could also contain extra info such as
		 * port, DNS and etc.).
		 */
		net_address: bcs.string(),
		/**
		 * The address of the validator used for p2p activities such as state sync (could
		 * also contain extra info such as port, DNS and etc.).
		 */
		p2p_address: bcs.string(),
		/** The address of the narwhal primary */
		primary_address: bcs.string(),
		/** The address of the narwhal worker */
		worker_address: bcs.string(),
		/**
		 * "next_epoch" metadata only takes effects in the next epoch. If none, current
		 * value will stay unchanged.
		 */
		next_epoch_protocol_pubkey_bytes: bcs.option(bcs.vector(bcs.u8())),
		next_epoch_proof_of_possession: bcs.option(bcs.vector(bcs.u8())),
		next_epoch_network_pubkey_bytes: bcs.option(bcs.vector(bcs.u8())),
		next_epoch_worker_pubkey_bytes: bcs.option(bcs.vector(bcs.u8())),
		next_epoch_net_address: bcs.option(bcs.string()),
		next_epoch_p2p_address: bcs.option(bcs.string()),
		next_epoch_primary_address: bcs.option(bcs.string()),
		next_epoch_worker_address: bcs.option(bcs.string()),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export const Validator = new MoveStruct({
	name: `${$moduleName}::Validator`,
	fields: {
		/** Summary of the validator. */
		metadata: ValidatorMetadata,
		/**
		 * The voting power of this validator, which might be different from its stake
		 * amount.
		 */
		voting_power: bcs.u64(),
		/** The ID of this validator's current valid `UnverifiedValidatorOperationCap` */
		operation_cap_id: bcs.Address,
		/** Gas price quote, updated only at end of epoch. */
		gas_price: bcs.u64(),
		/** Staking pool for this validator. */
		staking_pool: staking_pool.StakingPool,
		/** Commission rate of the validator, in basis point. */
		commission_rate: bcs.u64(),
		/** Total amount of stake that would be active in the next epoch. */
		next_epoch_stake: bcs.u64(),
		/** This validator's gas price quote for the next epoch. */
		next_epoch_gas_price: bcs.u64(),
		/** The commission rate of the validator starting the next epoch, in basis point. */
		next_epoch_commission_rate: bcs.u64(),
		/** Any extra fields that's not defined statically. */
		extra_fields: bag.Bag,
	},
});
export const StakingRequestEvent = new MoveStruct({
	name: `${$moduleName}::StakingRequestEvent`,
	fields: {
		pool_id: bcs.Address,
		validator_address: bcs.Address,
		staker_address: bcs.Address,
		epoch: bcs.u64(),
		amount: bcs.u64(),
	},
});
export const UnstakingRequestEvent = new MoveStruct({
	name: `${$moduleName}::UnstakingRequestEvent`,
	fields: {
		pool_id: bcs.Address,
		validator_address: bcs.Address,
		staker_address: bcs.Address,
		stake_activation_epoch: bcs.u64(),
		unstaking_epoch: bcs.u64(),
		principal_amount: bcs.u64(),
		reward_amount: bcs.u64(),
	},
});
export const ConvertingToFungibleStakedSuiEvent = new MoveStruct({
	name: `${$moduleName}::ConvertingToFungibleStakedSuiEvent`,
	fields: {
		pool_id: bcs.Address,
		stake_activation_epoch: bcs.u64(),
		staked_sui_principal_amount: bcs.u64(),
		fungible_staked_sui_amount: bcs.u64(),
	},
});
export const RedeemingFungibleStakedSuiEvent = new MoveStruct({
	name: `${$moduleName}::RedeemingFungibleStakedSuiEvent`,
	fields: {
		pool_id: bcs.Address,
		fungible_staked_sui_amount: bcs.u64(),
		sui_amount: bcs.u64(),
	},
});
export interface IsPreactiveArguments {
	self: RawTransactionArgument<string>;
}
export interface IsPreactiveOptions {
	package: string;
	arguments: IsPreactiveArguments | [self: RawTransactionArgument<string>];
}
/** Returns true if the validator is preactive. */
export function isPreactive(options: IsPreactiveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'is_preactive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MetadataArguments {
	self: RawTransactionArgument<string>;
}
export interface MetadataOptions {
	package: string;
	arguments: MetadataArguments | [self: RawTransactionArgument<string>];
}
export function metadata(options: MetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SuiAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface SuiAddressOptions {
	package: string;
	arguments: SuiAddressArguments | [self: RawTransactionArgument<string>];
}
export function suiAddress(options: SuiAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'sui_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NameArguments {
	self: RawTransactionArgument<string>;
}
export interface NameOptions {
	package: string;
	arguments: NameArguments | [self: RawTransactionArgument<string>];
}
export function name(options: NameOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DescriptionArguments {
	self: RawTransactionArgument<string>;
}
export interface DescriptionOptions {
	package: string;
	arguments: DescriptionArguments | [self: RawTransactionArgument<string>];
}
export function description(options: DescriptionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ImageUrlArguments {
	self: RawTransactionArgument<string>;
}
export interface ImageUrlOptions {
	package: string;
	arguments: ImageUrlArguments | [self: RawTransactionArgument<string>];
}
export function imageUrl(options: ImageUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'image_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProjectUrlArguments {
	self: RawTransactionArgument<string>;
}
export interface ProjectUrlOptions {
	package: string;
	arguments: ProjectUrlArguments | [self: RawTransactionArgument<string>];
}
export function projectUrl(options: ProjectUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'project_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NetworkAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface NetworkAddressOptions {
	package: string;
	arguments: NetworkAddressArguments | [self: RawTransactionArgument<string>];
}
export function networkAddress(options: NetworkAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'network_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface P2pAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface P2pAddressOptions {
	package: string;
	arguments: P2pAddressArguments | [self: RawTransactionArgument<string>];
}
export function p2pAddress(options: P2pAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'p2p_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PrimaryAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface PrimaryAddressOptions {
	package: string;
	arguments: PrimaryAddressArguments | [self: RawTransactionArgument<string>];
}
export function primaryAddress(options: PrimaryAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'primary_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WorkerAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface WorkerAddressOptions {
	package: string;
	arguments: WorkerAddressArguments | [self: RawTransactionArgument<string>];
}
export function workerAddress(options: WorkerAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'worker_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProtocolPubkeyBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface ProtocolPubkeyBytesOptions {
	package: string;
	arguments: ProtocolPubkeyBytesArguments | [self: RawTransactionArgument<string>];
}
export function protocolPubkeyBytes(options: ProtocolPubkeyBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'protocol_pubkey_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProofOfPossessionArguments {
	self: RawTransactionArgument<string>;
}
export interface ProofOfPossessionOptions {
	package: string;
	arguments: ProofOfPossessionArguments | [self: RawTransactionArgument<string>];
}
export function proofOfPossession(options: ProofOfPossessionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'proof_of_possession',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NetworkPubkeyBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface NetworkPubkeyBytesOptions {
	package: string;
	arguments: NetworkPubkeyBytesArguments | [self: RawTransactionArgument<string>];
}
export function networkPubkeyBytes(options: NetworkPubkeyBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'network_pubkey_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WorkerPubkeyBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface WorkerPubkeyBytesOptions {
	package: string;
	arguments: WorkerPubkeyBytesArguments | [self: RawTransactionArgument<string>];
}
export function workerPubkeyBytes(options: WorkerPubkeyBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'worker_pubkey_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochNetworkAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochNetworkAddressOptions {
	package: string;
	arguments: NextEpochNetworkAddressArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochNetworkAddress(options: NextEpochNetworkAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_network_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochP2pAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochP2pAddressOptions {
	package: string;
	arguments: NextEpochP2pAddressArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochP2pAddress(options: NextEpochP2pAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_p2p_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochPrimaryAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochPrimaryAddressOptions {
	package: string;
	arguments: NextEpochPrimaryAddressArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochPrimaryAddress(options: NextEpochPrimaryAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_primary_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochWorkerAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochWorkerAddressOptions {
	package: string;
	arguments: NextEpochWorkerAddressArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochWorkerAddress(options: NextEpochWorkerAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_worker_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochProtocolPubkeyBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochProtocolPubkeyBytesOptions {
	package: string;
	arguments: NextEpochProtocolPubkeyBytesArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochProtocolPubkeyBytes(options: NextEpochProtocolPubkeyBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_protocol_pubkey_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochProofOfPossessionArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochProofOfPossessionOptions {
	package: string;
	arguments: NextEpochProofOfPossessionArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochProofOfPossession(options: NextEpochProofOfPossessionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_proof_of_possession',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochNetworkPubkeyBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochNetworkPubkeyBytesOptions {
	package: string;
	arguments: NextEpochNetworkPubkeyBytesArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochNetworkPubkeyBytes(options: NextEpochNetworkPubkeyBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_network_pubkey_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochWorkerPubkeyBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochWorkerPubkeyBytesOptions {
	package: string;
	arguments: NextEpochWorkerPubkeyBytesArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochWorkerPubkeyBytes(options: NextEpochWorkerPubkeyBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_worker_pubkey_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OperationCapIdArguments {
	self: RawTransactionArgument<string>;
}
export interface OperationCapIdOptions {
	package: string;
	arguments: OperationCapIdArguments | [self: RawTransactionArgument<string>];
}
export function operationCapId(options: OperationCapIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'operation_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NextEpochGasPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface NextEpochGasPriceOptions {
	package: string;
	arguments: NextEpochGasPriceArguments | [self: RawTransactionArgument<string>];
}
export function nextEpochGasPrice(options: NextEpochGasPriceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'next_epoch_gas_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TotalStakeAmountArguments {
	self: RawTransactionArgument<string>;
}
export interface TotalStakeAmountOptions {
	package: string;
	arguments: TotalStakeAmountArguments | [self: RawTransactionArgument<string>];
}
export function totalStakeAmount(options: TotalStakeAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'total_stake_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StakeAmountArguments {
	self: RawTransactionArgument<string>;
}
export interface StakeAmountOptions {
	package: string;
	arguments: StakeAmountArguments | [self: RawTransactionArgument<string>];
}
export function stakeAmount(options: StakeAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'stake_amount',
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
/** Return the total amount staked with this validator */
export function totalStake(options: TotalStakeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'total_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VotingPowerArguments {
	self: RawTransactionArgument<string>;
}
export interface VotingPowerOptions {
	package: string;
	arguments: VotingPowerArguments | [self: RawTransactionArgument<string>];
}
/** Return the voting power of this validator. */
export function votingPower(options: VotingPowerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'voting_power',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PendingStakeAmountArguments {
	self: RawTransactionArgument<string>;
}
export interface PendingStakeAmountOptions {
	package: string;
	arguments: PendingStakeAmountArguments | [self: RawTransactionArgument<string>];
}
export function pendingStakeAmount(options: PendingStakeAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'pending_stake_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PendingStakeWithdrawAmountArguments {
	self: RawTransactionArgument<string>;
}
export interface PendingStakeWithdrawAmountOptions {
	package: string;
	arguments: PendingStakeWithdrawAmountArguments | [self: RawTransactionArgument<string>];
}
export function pendingStakeWithdrawAmount(options: PendingStakeWithdrawAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'pending_stake_withdraw_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GasPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface GasPriceOptions {
	package: string;
	arguments: GasPriceArguments | [self: RawTransactionArgument<string>];
}
export function gasPrice(options: GasPriceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'gas_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CommissionRateArguments {
	self: RawTransactionArgument<string>;
}
export interface CommissionRateOptions {
	package: string;
	arguments: CommissionRateArguments | [self: RawTransactionArgument<string>];
}
export function commissionRate(options: CommissionRateOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'commission_rate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PoolTokenExchangeRateAtEpochArguments {
	self: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
}
export interface PoolTokenExchangeRateAtEpochOptions {
	package: string;
	arguments:
		| PoolTokenExchangeRateAtEpochArguments
		| [self: RawTransactionArgument<string>, epoch: RawTransactionArgument<number | bigint>];
}
export function poolTokenExchangeRateAtEpoch(options: PoolTokenExchangeRateAtEpochOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'epoch'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'pool_token_exchange_rate_at_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StakingPoolIdArguments {
	self: RawTransactionArgument<string>;
}
export interface StakingPoolIdOptions {
	package: string;
	arguments: StakingPoolIdArguments | [self: RawTransactionArgument<string>];
}
export function stakingPoolId(options: StakingPoolIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'staking_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsDuplicateArguments {
	self: RawTransactionArgument<string>;
	other: RawTransactionArgument<string>;
}
export interface IsDuplicateOptions {
	package: string;
	arguments:
		| IsDuplicateArguments
		| [self: RawTransactionArgument<string>, other: RawTransactionArgument<string>];
}
export function isDuplicate(options: IsDuplicateOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'other'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'is_duplicate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidateMetadataArguments {
	metadata: RawTransactionArgument<string>;
}
export interface ValidateMetadataOptions {
	package: string;
	arguments: ValidateMetadataArguments | [metadata: RawTransactionArgument<string>];
}
/** Aborts if validator metadata is valid */
export function validateMetadata(options: ValidateMetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'validate_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValidateMetadataBcsArguments {
	metadata: RawTransactionArgument<number[]>;
}
export interface ValidateMetadataBcsOptions {
	package: string;
	arguments: ValidateMetadataBcsArguments | [metadata: RawTransactionArgument<number[]>];
}
export function validateMetadataBcs(options: ValidateMetadataBcsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'validator',
			function: 'validate_metadata_bcs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
