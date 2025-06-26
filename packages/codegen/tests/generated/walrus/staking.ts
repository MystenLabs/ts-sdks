/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: staking */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function Staking() {
	return bcs.struct('Staking', {
		id: object.UID(),
		version: bcs.u64(),
		package_id: bcs.Address,
		new_package_id: bcs.option(bcs.Address),
	});
}
/**
 * Creates a staking pool for the candidate, registers the candidate as a storage
 * node.
 */
export function register_candidate(options: {
	package?: string;
	arguments:
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
		  ]
		| {
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
		  };
}) {
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
/**
 * Sets next_commission in the staking pool, which will then take effect as
 * commission rate one epoch after setting the value (to allow stakers to react to
 * setting this).
 */
export function set_next_commission(options: {
	package?: string;
	arguments:
		| [
				staking: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				commissionRate: RawTransactionArgument<number>,
		  ]
		| {
				staking: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				commissionRate: RawTransactionArgument<number>;
		  };
}) {
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
/**
 * Collects the commission for the node. Transaction sender must be the
 * `CommissionReceiver` for the `StakingPool`.
 */
export function collect_commission(options: {
	package?: string;
	arguments:
		| [
				staking: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
		  ]
		| {
				staking: RawTransactionArgument<string>;
				nodeId: RawTransactionArgument<string>;
				auth: RawTransactionArgument<string>;
		  };
}) {
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
/** Sets the commission receiver for the node. */
export function set_commission_receiver(options: {
	package?: string;
	arguments:
		| [
				staking: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				receiver: RawTransactionArgument<string>,
		  ]
		| {
				staking: RawTransactionArgument<string>;
				nodeId: RawTransactionArgument<string>;
				auth: RawTransactionArgument<string>;
				receiver: RawTransactionArgument<string>;
		  };
}) {
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
/** Sets the governance authorized object for the pool. */
export function set_governance_authorized(options: {
	package?: string;
	arguments:
		| [
				staking: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				authorized: RawTransactionArgument<string>,
		  ]
		| {
				staking: RawTransactionArgument<string>;
				nodeId: RawTransactionArgument<string>;
				auth: RawTransactionArgument<string>;
				authorized: RawTransactionArgument<string>;
		  };
}) {
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
/** Computes the committee for the next epoch. */
export function compute_next_committee(options: {
	package?: string;
	arguments:
		| [staking: RawTransactionArgument<string>]
		| {
				staking: RawTransactionArgument<string>;
		  };
}) {
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
/** Sets the storage price vote for the pool. */
export function set_storage_price_vote(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				storagePrice: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				storagePrice: RawTransactionArgument<number | bigint>;
		  };
}) {
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
/** Sets the write price vote for the pool. */
export function set_write_price_vote(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				writePrice: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				writePrice: RawTransactionArgument<number | bigint>;
		  };
}) {
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
/** Sets the node capacity vote for the pool. */
export function set_node_capacity_vote(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				nodeCapacity: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				nodeCapacity: RawTransactionArgument<number | bigint>;
		  };
}) {
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
/** Get `NodeMetadata` for the given node. */
export function node_metadata(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, nodeId: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				nodeId: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Sets the public key of a node to be used starting from the next epoch for which
 * the node is selected.
 */
export function set_next_public_key(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				publicKey: RawTransactionArgument<number[]>,
				proofOfPossession: RawTransactionArgument<number[]>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				publicKey: RawTransactionArgument<number[]>;
				proofOfPossession: RawTransactionArgument<number[]>;
		  };
}) {
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
/** Sets the name of a storage node. */
export function set_name(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				name: RawTransactionArgument<string>;
		  };
}) {
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
/** Sets the network address or host of a storage node. */
export function set_network_address(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				networkAddress: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				networkAddress: RawTransactionArgument<string>;
		  };
}) {
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
/** Sets the public key used for TLS communication for a node. */
export function set_network_public_key(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				networkPublicKey: RawTransactionArgument<number[]>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				networkPublicKey: RawTransactionArgument<number[]>;
		  };
}) {
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
/** Sets the metadata of a storage node. */
export function set_node_metadata(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				metadata: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				metadata: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Ends the voting period and runs the apportionment if the current time allows.
 * Permissionless, can be called by anyone. Emits: `EpochParametersSelected` event.
 */
export function voting_end(options: {
	package?: string;
	arguments:
		| [staking: RawTransactionArgument<string>]
		| {
				staking: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Initiates the epoch change if the current time allows. Emits: `EpochChangeStart`
 * event.
 */
export function initiate_epoch_change(options: {
	package?: string;
	arguments:
		| [staking: RawTransactionArgument<string>, system: RawTransactionArgument<string>]
		| {
				staking: RawTransactionArgument<string>;
				system: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Signals to the contract that the node has received all its shards for the new
 * epoch.
 */
export function epoch_sync_done(options: {
	package?: string;
	arguments:
		| [
				staking: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number>,
		  ]
		| {
				staking: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				epoch: RawTransactionArgument<number>;
		  };
}) {
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
/** Stake `Coin` with the staking pool. */
export function stake_with_pool(options: {
	package?: string;
	arguments:
		| [
				staking: RawTransactionArgument<string>,
				toStake: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
		  ]
		| {
				staking: RawTransactionArgument<string>;
				toStake: RawTransactionArgument<string>;
				nodeId: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Marks the amount as a withdrawal to be processed and removes it from the stake
 * weight of the node. Allows the user to call withdraw_stake after the epoch
 * change to the next epoch and shard transfer is done.
 */
export function request_withdraw_stake(options: {
	package?: string;
	arguments:
		| [staking: RawTransactionArgument<string>, stakedWal: RawTransactionArgument<string>]
		| {
				staking: RawTransactionArgument<string>;
				stakedWal: RawTransactionArgument<string>;
		  };
}) {
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
/** Withdraws the staked amount from the staking pool. */
export function withdraw_stake(options: {
	package?: string;
	arguments:
		| [staking: RawTransactionArgument<string>, stakedWal: RawTransactionArgument<string>]
		| {
				staking: RawTransactionArgument<string>;
				stakedWal: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Allows a node to join the active set if it has sufficient stake. This can be
 * useful if another node in the active had its stake reduced to be lower than that
 * of the current node. In that case, the current node will be added to the active
 * set either the next time stake is added or by calling this function.
 */
export function try_join_active_set(options: {
	package?: string;
	arguments:
		| [staking: RawTransactionArgument<string>, cap: RawTransactionArgument<string>]
		| {
				staking: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
		  };
}) {
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
/** Returns the current epoch of the staking object. */
export function epoch(options: {
	package?: string;
	arguments:
		| [staking: RawTransactionArgument<string>]
		| {
				staking: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Calculate the rewards for an amount with value `staked_principal`, staked in the
 * pool with the given `node_id` between `activation_epoch` and `withdraw_epoch`.
 *
 * This function can be used with `dev_inspect` to calculate the expected rewards
 * for a `StakedWal` object or, more generally, the returns provided by a given
 * node over a given period.
 */
export function calculate_rewards(options: {
	package?: string;
	arguments:
		| [
				staking: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				stakedPrincipal: RawTransactionArgument<number | bigint>,
				activationEpoch: RawTransactionArgument<number>,
				withdrawEpoch: RawTransactionArgument<number>,
		  ]
		| {
				staking: RawTransactionArgument<string>;
				nodeId: RawTransactionArgument<string>;
				stakedPrincipal: RawTransactionArgument<number | bigint>;
				activationEpoch: RawTransactionArgument<number>;
				withdrawEpoch: RawTransactionArgument<number>;
		  };
}) {
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
