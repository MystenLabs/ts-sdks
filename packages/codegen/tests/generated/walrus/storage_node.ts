/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as group_ops from './deps/sui/group_ops.js';
import * as extended_field from './extended_field.js';
import * as object from './deps/sui/object.js';
import * as event_blob from './event_blob.js';
export function StorageNodeInfo() {
	return bcs.struct('StorageNodeInfo', {
		name: bcs.string(),
		node_id: bcs.Address,
		network_address: bcs.string(),
		public_key: group_ops.Element(),
		next_epoch_public_key: bcs.option(group_ops.Element()),
		network_public_key: bcs.vector(bcs.u8()),
		metadata: extended_field.ExtendedField(),
	});
}
export function StorageNodeCap() {
	return bcs.struct('StorageNodeCap', {
		id: object.UID(),
		node_id: bcs.Address,
		last_epoch_sync_done: bcs.u32(),
		last_event_blob_attestation: bcs.option(event_blob.EventBlobAttestation()),
		/** Stores the Merkle root of the deny list for the storage node. */
		deny_list_root: bcs.u256(),
		/** Stores the sequence number of the deny list for the storage node. */
		deny_list_sequence: bcs.u64(),
		/** Stores the size of the deny list for the storage node. */
		deny_list_size: bcs.u64(),
	});
}
/** Return the node ID of the storage node. */
export function id(options: {
	package?: string;
	arguments:
		| [cap: RawTransactionArgument<string>]
		| {
				cap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`] satisfies string[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Return the pool ID of the storage node. */
export function node_id(options: {
	package?: string;
	arguments:
		| [cap: RawTransactionArgument<string>]
		| {
				cap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'node_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Return the last epoch in which the storage node attested that it has finished
 * syncing.
 */
export function last_epoch_sync_done(options: {
	package?: string;
	arguments:
		| [cap: RawTransactionArgument<string>]
		| {
				cap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'last_epoch_sync_done',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Return the latest event blob attestion. */
export function last_event_blob_attestation(options: {
	package?: string;
	arguments:
		| [cap: RawTransactionArgument<string>]
		| {
				cap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'last_event_blob_attestation',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Return the deny list root of the storage node. */
export function deny_list_root(options: {
	package?: string;
	arguments:
		| [cap: RawTransactionArgument<string>]
		| {
				cap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'deny_list_root',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Return the deny list sequence number of the storage node. */
export function deny_list_sequence(options: {
	package?: string;
	arguments:
		| [cap: RawTransactionArgument<string>]
		| {
				cap: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'deny_list_sequence',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
