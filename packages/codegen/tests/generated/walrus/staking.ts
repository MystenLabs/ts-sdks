/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: staking */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
const $moduleName = '@local-pkg/walrus::staking';
export const Staking = new MoveStruct({
	name: `${$moduleName}::Staking`,
	fields: {
		id: object.UID,
		version: bcs.u64(),
		package_id: bcs.Address,
		new_package_id: bcs.option(bcs.Address),
	},
});
export interface RegisterCandidateArguments {
	staking: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
	networkAddress: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
	publicKey: RawTransactionArgument<number[]>;
	networkPublicKey: RawTransactionArgument<number[]>;
	proofOfPossession: RawTransactionArgument<number[]>;
	commissionRate: RawTransactionArgument<number>;
	storagePrice: RawTransactionArgument<number | bigint>;
	writePrice: RawTransactionArgument<number | bigint>;
	nodeCapacity: RawTransactionArgument<number | bigint>;
}
export interface RegisterCandidateOptions {
	package?: string;
	arguments:
		| RegisterCandidateArguments
		| [
				staking: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
				networkAddress: RawTransactionArgument<string>,
				metadata: RawTransactionArgument<string>,
				publicKey: RawTransactionArgument<number[]>,
				networkPublicKey: RawTransactionArgument<number[]>,
				proofOfPossession: RawTransactionArgument<number[]>,
				commissionRate: RawTransactionArgument<number>,
				storagePrice: RawTransactionArgument<number | bigint>,
				writePrice: RawTransactionArgument<number | bigint>,
				nodeCapacity: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Creates a staking pool for the candidate, registers the candidate as a storage
 * node.
 */
export function registerCandidate(options: RegisterCandidateOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		`${packageAddress}::node_metadata::NodeMetadata`,
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'u16',
		'u64',
		'u64',
		'u64',
	] satisfies string[];
	const parameterNames = [
		'staking',
		'name',
		'networkAddress',
		'metadata',
		'publicKey',
		'networkPublicKey',
		'proofOfPossession',
		'commissionRate',
		'storagePrice',
		'writePrice',
		'nodeCapacity',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'register_candidate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetNextCommissionArguments {
	staking: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	commissionRate: RawTransactionArgument<number>;
}
export interface SetNextCommissionOptions {
	package?: string;
	arguments:
		| SetNextCommissionArguments
		| [
				staking: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				commissionRate: RawTransactionArgument<number>,
		  ];
}
/**
 * Sets next_commission in the staking pool, which will then take effect as
 * commission rate one epoch after setting the value (to allow stakers to react to
 * setting this).
 */
export function setNextCommission(options: SetNextCommissionOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'u16',
	] satisfies string[];
	const parameterNames = ['staking', 'cap', 'commissionRate'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_next_commission',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CollectCommissionArguments {
	staking: RawTransactionArgument<string>;
	nodeId: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
}
export interface CollectCommissionOptions {
	package?: string;
	arguments:
		| CollectCommissionArguments
		| [
				staking: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
		  ];
}
/**
 * Collects the commission for the node. Transaction sender must be the
 * `CommissionReceiver` for the `StakingPool`.
 */
export function collectCommission(options: CollectCommissionOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		`${packageAddress}::auth::Authenticated`,
	] satisfies string[];
	const parameterNames = ['staking', 'nodeId', 'auth'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'collect_commission',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetCommissionReceiverArguments {
	staking: RawTransactionArgument<string>;
	nodeId: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
	receiver: RawTransactionArgument<string>;
}
export interface SetCommissionReceiverOptions {
	package?: string;
	arguments:
		| SetCommissionReceiverArguments
		| [
				staking: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				receiver: RawTransactionArgument<string>,
		  ];
}
/** Sets the commission receiver for the node. */
export function setCommissionReceiver(options: SetCommissionReceiverOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		`${packageAddress}::auth::Authenticated`,
		`${packageAddress}::auth::Authorized`,
	] satisfies string[];
	const parameterNames = ['staking', 'nodeId', 'auth', 'receiver'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_commission_receiver',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetGovernanceAuthorizedArguments {
	staking: RawTransactionArgument<string>;
	nodeId: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
	authorized: RawTransactionArgument<string>;
}
export interface SetGovernanceAuthorizedOptions {
	package?: string;
	arguments:
		| SetGovernanceAuthorizedArguments
		| [
				staking: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				authorized: RawTransactionArgument<string>,
		  ];
}
/** Sets the governance authorized object for the pool. */
export function setGovernanceAuthorized(options: SetGovernanceAuthorizedOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		`${packageAddress}::auth::Authenticated`,
		`${packageAddress}::auth::Authorized`,
	] satisfies string[];
	const parameterNames = ['staking', 'nodeId', 'auth', 'authorized'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_governance_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ComputeNextCommitteeArguments {
	staking: RawTransactionArgument<string>;
}
export interface ComputeNextCommitteeOptions {
	package?: string;
	arguments: ComputeNextCommitteeArguments | [staking: RawTransactionArgument<string>];
}
/** Computes the committee for the next epoch. */
export function computeNextCommittee(options: ComputeNextCommitteeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staking::Staking`] satisfies string[];
	const parameterNames = ['staking'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'compute_next_committee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetStoragePriceVoteArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	storagePrice: RawTransactionArgument<number | bigint>;
}
export interface SetStoragePriceVoteOptions {
	package?: string;
	arguments:
		| SetStoragePriceVoteArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				storagePrice: RawTransactionArgument<number | bigint>,
		  ];
}
/** Sets the storage price vote for the pool. */
export function setStoragePriceVote(options: SetStoragePriceVoteOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'storagePrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_storage_price_vote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetWritePriceVoteArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	writePrice: RawTransactionArgument<number | bigint>;
}
export interface SetWritePriceVoteOptions {
	package?: string;
	arguments:
		| SetWritePriceVoteArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				writePrice: RawTransactionArgument<number | bigint>,
		  ];
}
/** Sets the write price vote for the pool. */
export function setWritePriceVote(options: SetWritePriceVoteOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'writePrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_write_price_vote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetNodeCapacityVoteArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	nodeCapacity: RawTransactionArgument<number | bigint>;
}
export interface SetNodeCapacityVoteOptions {
	package?: string;
	arguments:
		| SetNodeCapacityVoteArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				nodeCapacity: RawTransactionArgument<number | bigint>,
		  ];
}
/** Sets the node capacity vote for the pool. */
export function setNodeCapacityVote(options: SetNodeCapacityVoteOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'nodeCapacity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_node_capacity_vote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NodeMetadataArguments {
	self: RawTransactionArgument<string>;
	nodeId: RawTransactionArgument<string>;
}
export interface NodeMetadataOptions {
	package?: string;
	arguments:
		| NodeMetadataArguments
		| [self: RawTransactionArgument<string>, nodeId: RawTransactionArgument<string>];
}
/** Get `NodeMetadata` for the given node. */
export function nodeMetadata(options: NodeMetadataOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
	] satisfies string[];
	const parameterNames = ['self', 'nodeId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'node_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetNextPublicKeyArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	publicKey: RawTransactionArgument<number[]>;
	proofOfPossession: RawTransactionArgument<number[]>;
}
export interface SetNextPublicKeyOptions {
	package?: string;
	arguments:
		| SetNextPublicKeyArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				publicKey: RawTransactionArgument<number[]>,
				proofOfPossession: RawTransactionArgument<number[]>,
		  ];
}
/**
 * Sets the public key of a node to be used starting from the next epoch for which
 * the node is selected.
 */
export function setNextPublicKey(options: SetNextPublicKeyOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'vector<u8>',
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'publicKey', 'proofOfPossession'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_next_public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetNameArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
}
export interface SetNameOptions {
	package?: string;
	arguments:
		| SetNameArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
		  ];
}
/** Sets the name of a storage node. */
export function setName(options: SetNameOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetNetworkAddressArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	networkAddress: RawTransactionArgument<string>;
}
export interface SetNetworkAddressOptions {
	package?: string;
	arguments:
		| SetNetworkAddressArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				networkAddress: RawTransactionArgument<string>,
		  ];
}
/** Sets the network address or host of a storage node. */
export function setNetworkAddress(options: SetNetworkAddressOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'networkAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_network_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetNetworkPublicKeyArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	networkPublicKey: RawTransactionArgument<number[]>;
}
export interface SetNetworkPublicKeyOptions {
	package?: string;
	arguments:
		| SetNetworkPublicKeyArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				networkPublicKey: RawTransactionArgument<number[]>,
		  ];
}
/** Sets the public key used for TLS communication for a node. */
export function setNetworkPublicKey(options: SetNetworkPublicKeyOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'networkPublicKey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_network_public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetNodeMetadataArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
}
export interface SetNodeMetadataOptions {
	package?: string;
	arguments:
		| SetNodeMetadataArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				metadata: RawTransactionArgument<string>,
		  ];
}
/** Sets the metadata of a storage node. */
export function setNodeMetadata(options: SetNodeMetadataOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		`${packageAddress}::node_metadata::NodeMetadata`,
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'set_node_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VotingEndArguments {
	staking: RawTransactionArgument<string>;
}
export interface VotingEndOptions {
	package?: string;
	arguments: VotingEndArguments | [staking: RawTransactionArgument<string>];
}
/**
 * Ends the voting period and runs the apportionment if the current time allows.
 * Permissionless, can be called by anyone. Emits: `EpochParametersSelected` event.
 */
export function votingEnd(options: VotingEndOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['staking', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'voting_end',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InitiateEpochChangeArguments {
	staking: RawTransactionArgument<string>;
	system: RawTransactionArgument<string>;
}
export interface InitiateEpochChangeOptions {
	package?: string;
	arguments:
		| InitiateEpochChangeArguments
		| [staking: RawTransactionArgument<string>, system: RawTransactionArgument<string>];
}
/**
 * Initiates the epoch change if the current time allows. Emits: `EpochChangeStart`
 * event.
 */
export function initiateEpochChange(options: InitiateEpochChangeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::system::System`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['staking', 'system', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'initiate_epoch_change',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EpochSyncDoneArguments {
	staking: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number>;
}
export interface EpochSyncDoneOptions {
	package?: string;
	arguments:
		| EpochSyncDoneArguments
		| [
				staking: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number>,
		  ];
}
/**
 * Signals to the contract that the node has received all its shards for the new
 * epoch.
 */
export function epochSyncDone(options: EpochSyncDoneOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'u32',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['staking', 'cap', 'epoch', 'clock'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'epoch_sync_done',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StakeWithPoolArguments {
	staking: RawTransactionArgument<string>;
	toStake: RawTransactionArgument<string>;
	nodeId: RawTransactionArgument<string>;
}
export interface StakeWithPoolOptions {
	package?: string;
	arguments:
		| StakeWithPoolArguments
		| [
				staking: RawTransactionArgument<string>,
				toStake: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
		  ];
}
/** Stake `Coin` with the staking pool. */
export function stakeWithPool(options: StakeWithPoolOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
	] satisfies string[];
	const parameterNames = ['staking', 'toStake', 'nodeId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'stake_with_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestWithdrawStakeArguments {
	staking: RawTransactionArgument<string>;
	stakedWal: RawTransactionArgument<string>;
}
export interface RequestWithdrawStakeOptions {
	package?: string;
	arguments:
		| RequestWithdrawStakeArguments
		| [staking: RawTransactionArgument<string>, stakedWal: RawTransactionArgument<string>];
}
/**
 * Marks the amount as a withdrawal to be processed and removes it from the stake
 * weight of the node. Allows the user to call withdraw_stake after the epoch
 * change to the next epoch and shard transfer is done.
 */
export function requestWithdrawStake(options: RequestWithdrawStakeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::staked_wal::StakedWal`,
	] satisfies string[];
	const parameterNames = ['staking', 'stakedWal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'request_withdraw_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WithdrawStakeArguments {
	staking: RawTransactionArgument<string>;
	stakedWal: RawTransactionArgument<string>;
}
export interface WithdrawStakeOptions {
	package?: string;
	arguments:
		| WithdrawStakeArguments
		| [staking: RawTransactionArgument<string>, stakedWal: RawTransactionArgument<string>];
}
/** Withdraws the staked amount from the staking pool. */
export function withdrawStake(options: WithdrawStakeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::staked_wal::StakedWal`,
	] satisfies string[];
	const parameterNames = ['staking', 'stakedWal'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'withdraw_stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TryJoinActiveSetArguments {
	staking: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface TryJoinActiveSetOptions {
	package?: string;
	arguments:
		| TryJoinActiveSetArguments
		| [staking: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/**
 * Allows a node to join the active set if it has sufficient stake. This can be
 * useful if another node in the active had its stake reduced to be lower than that
 * of the current node. In that case, the current node will be added to the active
 * set either the next time stake is added or by calling this function.
 */
export function tryJoinActiveSet(options: TryJoinActiveSetOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::storage_node::StorageNodeCap`,
	] satisfies string[];
	const parameterNames = ['staking', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'try_join_active_set',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EpochArguments {
	staking: RawTransactionArgument<string>;
}
export interface EpochOptions {
	package?: string;
	arguments: EpochArguments | [staking: RawTransactionArgument<string>];
}
/** Returns the current epoch of the staking object. */
export function epoch(options: EpochOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::staking::Staking`] satisfies string[];
	const parameterNames = ['staking'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CalculateRewardsArguments {
	staking: RawTransactionArgument<string>;
	nodeId: RawTransactionArgument<string>;
	stakedPrincipal: RawTransactionArgument<number | bigint>;
	activationEpoch: RawTransactionArgument<number>;
	withdrawEpoch: RawTransactionArgument<number>;
}
export interface CalculateRewardsOptions {
	package?: string;
	arguments:
		| CalculateRewardsArguments
		| [
				staking: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				stakedPrincipal: RawTransactionArgument<number | bigint>,
				activationEpoch: RawTransactionArgument<number>,
				withdrawEpoch: RawTransactionArgument<number>,
		  ];
}
/**
 * Calculate the rewards for an amount with value `staked_principal`, staked in the
 * pool with the given `node_id` between `activation_epoch` and `withdraw_epoch`.
 *
 * This function can be used with `dev_inspect` to calculate the expected rewards
 * for a `StakedWal` object or, more generally, the returns provided by a given
 * node over a given period.
 */
export function calculateRewards(options: CalculateRewardsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		'u64',
		'u32',
		'u32',
	] satisfies string[];
	const parameterNames = [
		'staking',
		'nodeId',
		'stakedPrincipal',
		'activationEpoch',
		'withdrawEpoch',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'staking',
			function: 'calculate_rewards',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
