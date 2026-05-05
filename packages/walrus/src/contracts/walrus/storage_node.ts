/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import {
	type Transaction,
	type TransactionResult,
	type TransactionArgument,
} from '@mysten/sui/transactions';
import * as group_ops from './deps/sui/group_ops.js';
import * as extended_field from './extended_field.js';
import * as event_blob from './event_blob.js';
const $moduleName = '@local-pkg/walrus::storage_node';
const _StorageNodeInfoFields = {
	name: bcs.string(),
	node_id: bcs.Address,
	network_address: bcs.string(),
	public_key: group_ops.Element,
	next_epoch_public_key: bcs.option(group_ops.Element),
	network_public_key: bcs.vector(bcs.u8()),
	metadata: extended_field.ExtendedField,
};
export const StorageNodeInfo: MoveStruct<typeof _StorageNodeInfoFields> = new MoveStruct({
	name: `${$moduleName}::StorageNodeInfo`,
	fields: _StorageNodeInfoFields,
});
const _StorageNodeCapFields = {
	id: bcs.Address,
	node_id: bcs.Address,
	last_epoch_sync_done: bcs.u32(),
	last_event_blob_attestation: bcs.option(event_blob.EventBlobAttestation),
	/** Stores the Merkle root of the deny list for the storage node. */
	deny_list_root: bcs.u256(),
	/** Stores the sequence number of the deny list for the storage node. */
	deny_list_sequence: bcs.u64(),
	/** Stores the size of the deny list for the storage node. */
	deny_list_size: bcs.u64(),
};
export const StorageNodeCap: MoveStruct<typeof _StorageNodeCapFields> = new MoveStruct({
	name: `${$moduleName}::StorageNodeCap`,
	fields: _StorageNodeCapFields,
});
export interface IdArguments {
	cap: TransactionArgument;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [cap: TransactionArgument];
}
/** Return the node ID of the storage node. */
export function id(options: IdOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NodeIdArguments {
	cap: RawTransactionArgument<string>;
}
export interface NodeIdOptions {
	package?: string;
	arguments: NodeIdArguments | [cap: RawTransactionArgument<string>];
}
/** Return the pool ID of the storage node. */
export function nodeId(options: NodeIdOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'node_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LastEpochSyncDoneArguments {
	cap: RawTransactionArgument<string>;
}
export interface LastEpochSyncDoneOptions {
	package?: string;
	arguments: LastEpochSyncDoneArguments | [cap: RawTransactionArgument<string>];
}
/**
 * Return the last epoch in which the storage node attested that it has finished
 * syncing.
 */
export function lastEpochSyncDone(
	options: LastEpochSyncDoneOptions,
): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'last_epoch_sync_done',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LastEventBlobAttestationArguments {
	cap: RawTransactionArgument<string>;
}
export interface LastEventBlobAttestationOptions {
	package?: string;
	arguments: LastEventBlobAttestationArguments | [cap: RawTransactionArgument<string>];
}
/** Return the latest event blob attestation. */
export function lastEventBlobAttestation(
	options: LastEventBlobAttestationOptions,
): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'last_event_blob_attestation',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DenyListRootArguments {
	cap: RawTransactionArgument<string>;
}
export interface DenyListRootOptions {
	package?: string;
	arguments: DenyListRootArguments | [cap: RawTransactionArgument<string>];
}
/** Return the deny list root of the storage node. */
export function denyListRoot(options: DenyListRootOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'deny_list_root',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DenyListSequenceArguments {
	cap: RawTransactionArgument<string>;
}
export interface DenyListSequenceOptions {
	package?: string;
	arguments: DenyListSequenceArguments | [cap: RawTransactionArgument<string>];
}
/** Return the deny list sequence number of the storage node. */
export function denyListSequence(
	options: DenyListSequenceOptions,
): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_node',
			function: 'deny_list_sequence',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
