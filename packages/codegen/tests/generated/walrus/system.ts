/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: system */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
const $moduleName = '@local-pkg/walrus::system';
export const System = new MoveStruct(`${$moduleName}::System`, {
	id: object.UID,
	version: bcs.u64(),
	package_id: bcs.Address,
	new_package_id: bcs.option(bcs.Address),
});
export interface InvalidateBlobIdArguments {
	system: RawTransactionArgument<string>;
	signature: RawTransactionArgument<number[]>;
	membersBitmap: RawTransactionArgument<number[]>;
	message: RawTransactionArgument<number[]>;
}
export interface InvalidateBlobIdOptions {
	package?: string;
	arguments:
		| InvalidateBlobIdArguments
		| [
				system: RawTransactionArgument<string>,
				signature: RawTransactionArgument<number[]>,
				membersBitmap: RawTransactionArgument<number[]>,
				message: RawTransactionArgument<number[]>,
		  ];
}
/** Marks blob as invalid given an invalid blob certificate. */
export function invalidateBlobId(options: InvalidateBlobIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['system', 'signature', 'membersBitmap', 'message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'invalidate_blob_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CertifyEventBlobArguments {
	system: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	rootHash: RawTransactionArgument<number | bigint>;
	size: RawTransactionArgument<number | bigint>;
	encodingType: RawTransactionArgument<number>;
	endingCheckpointSequenceNum: RawTransactionArgument<number | bigint>;
	epoch: RawTransactionArgument<number>;
}
export interface CertifyEventBlobOptions {
	package?: string;
	arguments:
		| CertifyEventBlobArguments
		| [
				system: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				rootHash: RawTransactionArgument<number | bigint>,
				size: RawTransactionArgument<number | bigint>,
				encodingType: RawTransactionArgument<number>,
				endingCheckpointSequenceNum: RawTransactionArgument<number | bigint>,
				epoch: RawTransactionArgument<number>,
		  ];
}
/** Certifies a blob containing Walrus events. */
export function certifyEventBlob(options: CertifyEventBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'u256',
		'u256',
		'u64',
		'u8',
		'u64',
		'u32',
	] satisfies string[];
	const parameterNames = [
		'system',
		'cap',
		'blobId',
		'rootHash',
		'size',
		'encodingType',
		'endingCheckpointSequenceNum',
		'epoch',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'certify_event_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReserveSpaceArguments {
	self: RawTransactionArgument<string>;
	storageAmount: RawTransactionArgument<number | bigint>;
	epochsAhead: RawTransactionArgument<number>;
	payment: RawTransactionArgument<string>;
}
export interface ReserveSpaceOptions {
	package?: string;
	arguments:
		| ReserveSpaceArguments
		| [
				self: RawTransactionArgument<string>,
				storageAmount: RawTransactionArgument<number | bigint>,
				epochsAhead: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ];
}
/** Allows buying a storage reservation for a given period of epochs. */
export function reserveSpace(options: ReserveSpaceOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		'u64',
		'u32',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'storageAmount', 'epochsAhead', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'reserve_space',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RegisterBlobArguments {
	self: RawTransactionArgument<string>;
	storage: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	rootHash: RawTransactionArgument<number | bigint>;
	size: RawTransactionArgument<number | bigint>;
	encodingType: RawTransactionArgument<number>;
	deletable: RawTransactionArgument<boolean>;
	writePayment: RawTransactionArgument<string>;
}
export interface RegisterBlobOptions {
	package?: string;
	arguments:
		| RegisterBlobArguments
		| [
				self: RawTransactionArgument<string>,
				storage: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				rootHash: RawTransactionArgument<number | bigint>,
				size: RawTransactionArgument<number | bigint>,
				encodingType: RawTransactionArgument<number>,
				deletable: RawTransactionArgument<boolean>,
				writePayment: RawTransactionArgument<string>,
		  ];
}
/**
 * Registers a new blob in the system. `size` is the size of the unencoded blob.
 * The reserved space in `storage` must be at least the size of the encoded blob.
 */
export function registerBlob(options: RegisterBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`${packageAddress}::storage_resource::Storage`,
		'u256',
		'u256',
		'u64',
		'u8',
		'bool',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = [
		'self',
		'storage',
		'blobId',
		'rootHash',
		'size',
		'encodingType',
		'deletable',
		'writePayment',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'register_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CertifyBlobArguments {
	self: RawTransactionArgument<string>;
	blob: RawTransactionArgument<string>;
	signature: RawTransactionArgument<number[]>;
	signersBitmap: RawTransactionArgument<number[]>;
	message: RawTransactionArgument<number[]>;
}
export interface CertifyBlobOptions {
	package?: string;
	arguments:
		| CertifyBlobArguments
		| [
				self: RawTransactionArgument<string>,
				blob: RawTransactionArgument<string>,
				signature: RawTransactionArgument<number[]>,
				signersBitmap: RawTransactionArgument<number[]>,
				message: RawTransactionArgument<number[]>,
		  ];
}
/**
 * Certify that a blob will be available in the storage system until the end epoch
 * of the storage associated with it.
 */
export function certifyBlob(options: CertifyBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`${packageAddress}::blob::Blob`,
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['self', 'blob', 'signature', 'signersBitmap', 'message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'certify_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeleteBlobArguments {
	self: RawTransactionArgument<string>;
	blob: RawTransactionArgument<string>;
}
export interface DeleteBlobOptions {
	package?: string;
	arguments:
		| DeleteBlobArguments
		| [self: RawTransactionArgument<string>, blob: RawTransactionArgument<string>];
}
/** Deletes a deletable blob and returns the contained storage resource. */
export function deleteBlob(options: DeleteBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`${packageAddress}::blob::Blob`,
	] satisfies string[];
	const parameterNames = ['self', 'blob'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'delete_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtendBlobWithResourceArguments {
	self: RawTransactionArgument<string>;
	blob: RawTransactionArgument<string>;
	extension: RawTransactionArgument<string>;
}
export interface ExtendBlobWithResourceOptions {
	package?: string;
	arguments:
		| ExtendBlobWithResourceArguments
		| [
				self: RawTransactionArgument<string>,
				blob: RawTransactionArgument<string>,
				extension: RawTransactionArgument<string>,
		  ];
}
/**
 * Extend the period of validity of a blob with a new storage resource. The new
 * storage resource must be the same size as the storage resource used in the blob,
 * and have a longer period of validity.
 */
export function extendBlobWithResource(options: ExtendBlobWithResourceOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`${packageAddress}::blob::Blob`,
		`${packageAddress}::storage_resource::Storage`,
	] satisfies string[];
	const parameterNames = ['self', 'blob', 'extension'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'extend_blob_with_resource',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtendBlobArguments {
	self: RawTransactionArgument<string>;
	blob: RawTransactionArgument<string>;
	extendedEpochs: RawTransactionArgument<number>;
	payment: RawTransactionArgument<string>;
}
export interface ExtendBlobOptions {
	package?: string;
	arguments:
		| ExtendBlobArguments
		| [
				self: RawTransactionArgument<string>,
				blob: RawTransactionArgument<string>,
				extendedEpochs: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ];
}
/**
 * Extend the period of validity of a blob by extending its contained storage
 * resource by `extended_epochs` epochs.
 */
export function extendBlob(options: ExtendBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`${packageAddress}::blob::Blob`,
		'u32',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'blob', 'extendedEpochs', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'extend_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddSubsidyArguments {
	system: RawTransactionArgument<string>;
	subsidy: RawTransactionArgument<string>;
	epochsAhead: RawTransactionArgument<number>;
}
export interface AddSubsidyOptions {
	package?: string;
	arguments:
		| AddSubsidyArguments
		| [
				system: RawTransactionArgument<string>,
				subsidy: RawTransactionArgument<string>,
				epochsAhead: RawTransactionArgument<number>,
		  ];
}
/**
 * Adds rewards to the system for the specified number of epochs ahead. The rewards
 * are split equally across the future accounting ring buffer up to the specified
 * epoch.
 */
export function addSubsidy(options: AddSubsidyOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		'u32',
	] satisfies string[];
	const parameterNames = ['system', 'subsidy', 'epochsAhead'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'add_subsidy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RegisterDenyListUpdateArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	denyListRoot: RawTransactionArgument<number | bigint>;
	denyListSequence: RawTransactionArgument<number | bigint>;
}
export interface RegisterDenyListUpdateOptions {
	package?: string;
	arguments:
		| RegisterDenyListUpdateArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				denyListRoot: RawTransactionArgument<number | bigint>,
				denyListSequence: RawTransactionArgument<number | bigint>,
		  ];
}
/** Register a deny list update. */
export function registerDenyListUpdate(options: RegisterDenyListUpdateOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'u256',
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'denyListRoot', 'denyListSequence'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'register_deny_list_update',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateDenyListArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	signature: RawTransactionArgument<number[]>;
	membersBitmap: RawTransactionArgument<number[]>;
	message: RawTransactionArgument<number[]>;
}
export interface UpdateDenyListOptions {
	package?: string;
	arguments:
		| UpdateDenyListArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				signature: RawTransactionArgument<number[]>,
				membersBitmap: RawTransactionArgument<number[]>,
				message: RawTransactionArgument<number[]>,
		  ];
}
/** Perform the update of the deny list. */
export function updateDenyList(options: UpdateDenyListOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		`${packageAddress}::storage_node::StorageNodeCap`,
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'signature', 'membersBitmap', 'message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'update_deny_list',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeleteDenyListedBlobArguments {
	self: RawTransactionArgument<string>;
	signature: RawTransactionArgument<number[]>;
	membersBitmap: RawTransactionArgument<number[]>;
	message: RawTransactionArgument<number[]>;
}
export interface DeleteDenyListedBlobOptions {
	package?: string;
	arguments:
		| DeleteDenyListedBlobArguments
		| [
				self: RawTransactionArgument<string>,
				signature: RawTransactionArgument<number[]>,
				membersBitmap: RawTransactionArgument<number[]>,
				message: RawTransactionArgument<number[]>,
		  ];
}
/** Delete a blob that is deny listed by f+1 members. */
export function deleteDenyListedBlob(options: DeleteDenyListedBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::system::System`,
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['self', 'signature', 'membersBitmap', 'message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'delete_deny_listed_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EpochArguments {
	self: RawTransactionArgument<string>;
}
export interface EpochOptions {
	package?: string;
	arguments: EpochArguments | [self: RawTransactionArgument<string>];
}
/** Get epoch. Uses the committee to get the epoch. */
export function epoch(options: EpochOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::system::System`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TotalCapacitySizeArguments {
	self: RawTransactionArgument<string>;
}
export interface TotalCapacitySizeOptions {
	package?: string;
	arguments: TotalCapacitySizeArguments | [self: RawTransactionArgument<string>];
}
/** Accessor for total capacity size. */
export function totalCapacitySize(options: TotalCapacitySizeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::system::System`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'total_capacity_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UsedCapacitySizeArguments {
	self: RawTransactionArgument<string>;
}
export interface UsedCapacitySizeOptions {
	package?: string;
	arguments: UsedCapacitySizeArguments | [self: RawTransactionArgument<string>];
}
/** Accessor for used capacity size. */
export function usedCapacitySize(options: UsedCapacitySizeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::system::System`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'used_capacity_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NShardsArguments {
	self: RawTransactionArgument<string>;
}
export interface NShardsOptions {
	package?: string;
	arguments: NShardsArguments | [self: RawTransactionArgument<string>];
}
/** Accessor for the number of shards. */
export function nShards(options: NShardsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::system::System`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'n_shards',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
