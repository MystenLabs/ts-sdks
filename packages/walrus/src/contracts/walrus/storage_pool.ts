/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pooled storage model: one `StoragePool` object reserves capacity for a given
 * epoch range, and multiple blobs can be registered against it. When a blob is
 * deleted, its capacity is freed back into the pool for reuse.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as storage_resource from './storage_resource.js';
import * as object_table from './deps/sui/object_table.js';
const $moduleName = '@local-pkg/walrus::storage_pool';
export const StoragePool = new MoveStruct({
	name: `${$moduleName}::StoragePool`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
	},
});
export const StoragePoolInnerV1 = new MoveStruct({
	name: `${$moduleName}::StoragePoolInnerV1`,
	fields: {
		/** The storage reservation backing this pool. */
		storage: storage_resource.Storage,
		/** Sum of all active blobs' encoded sizes. */
		used_encoded_bytes: bcs.u64(),
		/** Number of blobs in the table. */
		blob_count: bcs.u64(),
		blobs: object_table.ObjectTable,
	},
});
export const PooledBlob = new MoveStruct({
	name: `${$moduleName}::PooledBlob`,
	fields: {
		id: bcs.Address,
		registered_epoch: bcs.u32(),
		blob_id: bcs.u256(),
		unencoded_size: bcs.u64(),
		encoding_type: bcs.u8(),
		certified_epoch: bcs.option(bcs.u32()),
		/** Reference back to the owning pool. */
		storage_pool_id: bcs.Address,
		deletable: bcs.bool(),
	},
});
export interface StartEpochArguments {
	self: RawTransactionArgument<string>;
}
export interface StartEpochOptions {
	package?: string;
	arguments: StartEpochArguments | [self: RawTransactionArgument<string>];
}
export function startEpoch(options: StartEpochOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'start_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EndEpochArguments {
	self: RawTransactionArgument<string>;
}
export interface EndEpochOptions {
	package?: string;
	arguments: EndEpochArguments | [self: RawTransactionArgument<string>];
}
export function endEpoch(options: EndEpochOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'end_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReservedEncodedCapacityBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface ReservedEncodedCapacityBytesOptions {
	package?: string;
	arguments: ReservedEncodedCapacityBytesArguments | [self: RawTransactionArgument<string>];
}
export function reservedEncodedCapacityBytes(options: ReservedEncodedCapacityBytesOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'reserved_encoded_capacity_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UsedEncodedBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface UsedEncodedBytesOptions {
	package?: string;
	arguments: UsedEncodedBytesArguments | [self: RawTransactionArgument<string>];
}
export function usedEncodedBytes(options: UsedEncodedBytesOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'used_encoded_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AvailableEncodedBytesArguments {
	self: RawTransactionArgument<string>;
}
export interface AvailableEncodedBytesOptions {
	package?: string;
	arguments: AvailableEncodedBytesArguments | [self: RawTransactionArgument<string>];
}
export function availableEncodedBytes(options: AvailableEncodedBytesOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'available_encoded_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StorageArguments {
	self: RawTransactionArgument<string>;
}
export interface StorageOptions {
	package?: string;
	arguments: StorageArguments | [self: RawTransactionArgument<string>];
}
/** Returns a reference to the embedded storage reservation. */
export function storage(options: StorageOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'storage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlobCountArguments {
	self: RawTransactionArgument<string>;
}
export interface BlobCountOptions {
	package?: string;
	arguments: BlobCountArguments | [self: RawTransactionArgument<string>];
}
export function blobCount(options: BlobCountOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'blob_count',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ContainsBlobArguments {
	self: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
}
export interface ContainsBlobOptions {
	package?: string;
	arguments:
		| ContainsBlobArguments
		| [self: RawTransactionArgument<string>, blobId: RawTransactionArgument<number | bigint>];
}
export function containsBlob(options: ContainsBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['self', 'blobId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'contains_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlobObjectIdArguments {
	self: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
}
export interface BlobObjectIdOptions {
	package?: string;
	arguments:
		| BlobObjectIdArguments
		| [self: RawTransactionArgument<string>, blobId: RawTransactionArgument<number | bigint>];
}
/** External wrappers use this to build certification messages for deletable blobs. */
export function blobObjectId(options: BlobObjectIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['self', 'blobId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'blob_object_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ObjectIdArguments {
	self: RawTransactionArgument<string>;
}
export interface ObjectIdOptions {
	package?: string;
	arguments: ObjectIdArguments | [self: RawTransactionArgument<string>];
}
/** Returns the object ID of this storage pool. */
export function objectId(options: ObjectIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'object_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DestroyArguments {
	self: RawTransactionArgument<string>;
}
export interface DestroyOptions {
	package?: string;
	arguments: DestroyArguments | [self: RawTransactionArgument<string>];
}
/**
 * Destroys the pool and returns the embedded `Storage` reservation. Asserts the
 * blobs table is empty and `blob_count == 0`.
 */
export function destroy(options: DestroyOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddBlobMetadataArguments {
	self: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	metadata: TransactionArgument;
}
export interface AddBlobMetadataOptions {
	package?: string;
	arguments:
		| AddBlobMetadataArguments
		| [
				self: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				metadata: TransactionArgument,
		  ];
}
/**
 * Adds metadata to a pooled blob by blob ID.
 *
 * Aborts if the metadata is already present.
 */
export function addBlobMetadata(options: AddBlobMetadataOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u256', null] satisfies (string | null)[];
	const parameterNames = ['self', 'blobId', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'add_blob_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddOrReplaceBlobMetadataArguments {
	self: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	metadata: TransactionArgument;
}
export interface AddOrReplaceBlobMetadataOptions {
	package?: string;
	arguments:
		| AddOrReplaceBlobMetadataArguments
		| [
				self: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				metadata: TransactionArgument,
		  ];
}
/**
 * Adds metadata to a pooled blob by blob ID, replacing existing metadata if
 * present.
 *
 * Returns the replaced metadata if present.
 */
export function addOrReplaceBlobMetadata(options: AddOrReplaceBlobMetadataOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u256', null] satisfies (string | null)[];
	const parameterNames = ['self', 'blobId', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'add_or_replace_blob_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TakeBlobMetadataArguments {
	self: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
}
export interface TakeBlobMetadataOptions {
	package?: string;
	arguments:
		| TakeBlobMetadataArguments
		| [self: RawTransactionArgument<string>, blobId: RawTransactionArgument<number | bigint>];
}
/**
 * Removes and returns the metadata from a pooled blob by blob ID.
 *
 * Aborts if the metadata does not exist.
 */
export function takeBlobMetadata(options: TakeBlobMetadataOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['self', 'blobId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'take_blob_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InsertOrUpdateBlobMetadataPairArguments {
	self: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	key: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface InsertOrUpdateBlobMetadataPairOptions {
	package?: string;
	arguments:
		| InsertOrUpdateBlobMetadataPairArguments
		| [
				self: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
}
/**
 * Inserts or updates a key-value pair in a pooled blob's metadata by blob ID.
 *
 * Creates new metadata on the blob if it does not exist already.
 */
export function insertOrUpdateBlobMetadataPair(options: InsertOrUpdateBlobMetadataPairOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u256', '0x1::string::String', '0x1::string::String'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'blobId', 'key', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'insert_or_update_blob_metadata_pair',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RemoveBlobMetadataPairArguments {
	self: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	key: RawTransactionArgument<string>;
}
export interface RemoveBlobMetadataPairOptions {
	package?: string;
	arguments:
		| RemoveBlobMetadataPairArguments
		| [
				self: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				key: RawTransactionArgument<string>,
		  ];
}
/**
 * Removes the metadata pair with the given key from a pooled blob by blob ID.
 *
 * Aborts if the metadata does not exist.
 */
export function removeBlobMetadataPair(options: RemoveBlobMetadataPairOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u256', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'blobId', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'remove_blob_metadata_pair',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RemoveBlobMetadataPairIfExistsArguments {
	self: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	key: RawTransactionArgument<string>;
}
export interface RemoveBlobMetadataPairIfExistsOptions {
	package?: string;
	arguments:
		| RemoveBlobMetadataPairIfExistsArguments
		| [
				self: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				key: RawTransactionArgument<string>,
		  ];
}
/**
 * Removes and returns the value for the given key from a pooled blob's metadata,
 * if it exists.
 */
export function removeBlobMetadataPairIfExists(options: RemoveBlobMetadataPairIfExistsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u256', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'blobId', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_pool',
			function: 'remove_blob_metadata_pair_if_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
