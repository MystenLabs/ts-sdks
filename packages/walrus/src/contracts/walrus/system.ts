/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: system */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/walrus::system';
export const System = new MoveStruct({
	name: `${$moduleName}::System`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
		package_id: bcs.Address,
		new_package_id: bcs.option(bcs.Address),
	},
});
export interface InvalidateBlobIdArguments {
	system: RawTransactionArgument<string>;
	signature: RawTransactionArgument<Array<number>>;
	membersBitmap: RawTransactionArgument<Array<number>>;
	message: RawTransactionArgument<Array<number>>;
}
export interface InvalidateBlobIdOptions {
	package?: string;
	arguments:
		| InvalidateBlobIdArguments
		| [
				system: RawTransactionArgument<string>,
				signature: RawTransactionArgument<Array<number>>,
				membersBitmap: RawTransactionArgument<Array<number>>,
				message: RawTransactionArgument<Array<number>>,
		  ];
}
/**
 * === Public Functions === Marks blob as invalid given an invalid blob
 * certificate.
 */
export function invalidateBlobId(options: InvalidateBlobIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
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
	const argumentsTypes = [null, null, 'u256', 'u256', 'u64', 'u8', 'u64', 'u32'] satisfies (
		| string
		| null
	)[];
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
	const argumentsTypes = [null, 'u64', 'u32', null] satisfies (string | null)[];
	const parameterNames = ['self', 'storageAmount', 'epochsAhead', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'reserve_space',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReserveSpaceForEpochsArguments {
	self: RawTransactionArgument<string>;
	storageAmount: RawTransactionArgument<number | bigint>;
	startEpoch: RawTransactionArgument<number>;
	endEpoch: RawTransactionArgument<number>;
	payment: RawTransactionArgument<string>;
}
export interface ReserveSpaceForEpochsOptions {
	package?: string;
	arguments:
		| ReserveSpaceForEpochsArguments
		| [
				self: RawTransactionArgument<string>,
				storageAmount: RawTransactionArgument<number | bigint>,
				startEpoch: RawTransactionArgument<number>,
				endEpoch: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ];
}
/**
 * Allows buying a storage reservation for a given period of epochs.
 *
 * Returns a storage resource for the period between `start_epoch` (inclusive) and
 * `end_epoch` (exclusive). If `start_epoch` has already passed, reserves space
 * starting from the current epoch.
 */
export function reserveSpaceForEpochs(options: ReserveSpaceForEpochsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u64', 'u32', 'u32', null] satisfies (string | null)[];
	const parameterNames = ['self', 'storageAmount', 'startEpoch', 'endEpoch', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'reserve_space_for_epochs',
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
	const argumentsTypes = [null, null, 'u256', 'u256', 'u64', 'u8', 'bool', null] satisfies (
		| string
		| null
	)[];
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
	signature: RawTransactionArgument<Array<number>>;
	signersBitmap: RawTransactionArgument<Array<number>>;
	message: RawTransactionArgument<Array<number>>;
}
export interface CertifyBlobOptions {
	package?: string;
	arguments:
		| CertifyBlobArguments
		| [
				self: RawTransactionArgument<string>,
				blob: RawTransactionArgument<string>,
				signature: RawTransactionArgument<Array<number>>,
				signersBitmap: RawTransactionArgument<Array<number>>,
				message: RawTransactionArgument<Array<number>>,
		  ];
}
/**
 * Certify that a blob will be available in the storage system until the end epoch
 * of the storage associated with it.
 */
export function certifyBlob(options: CertifyBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
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
	const argumentsTypes = [null, null] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
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
	const argumentsTypes = [null, null, 'u32', null] satisfies (string | null)[];
	const parameterNames = ['self', 'blob', 'extendedEpochs', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'extend_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateStoragePoolArguments {
	self: RawTransactionArgument<string>;
	reservedEncodedCapacityBytes: RawTransactionArgument<number | bigint>;
	epochsAhead: RawTransactionArgument<number>;
	payment: RawTransactionArgument<string>;
}
export interface CreateStoragePoolOptions {
	package?: string;
	arguments:
		| CreateStoragePoolArguments
		| [
				self: RawTransactionArgument<string>,
				reservedEncodedCapacityBytes: RawTransactionArgument<number | bigint>,
				epochsAhead: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ];
}
/** Creates a new storage pool with the given capacity and epoch range. */
export function createStoragePool(options: CreateStoragePoolOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u64', 'u32', null] satisfies (string | null)[];
	const parameterNames = ['self', 'reservedEncodedCapacityBytes', 'epochsAhead', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'create_storage_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateStoragePoolWithStorageArguments {
	self: RawTransactionArgument<string>;
	storage: RawTransactionArgument<string>;
}
export interface CreateStoragePoolWithStorageOptions {
	package?: string;
	arguments:
		| CreateStoragePoolWithStorageArguments
		| [self: RawTransactionArgument<string>, storage: RawTransactionArgument<string>];
}
/** Creates a new storage pool backed by an existing `Storage` reservation. */
export function createStoragePoolWithStorage(options: CreateStoragePoolWithStorageOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'storage'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'create_storage_pool_with_storage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RegisterPooledBlobArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	rootHash: RawTransactionArgument<number | bigint>;
	unencodedSize: RawTransactionArgument<number | bigint>;
	encodingType: RawTransactionArgument<number>;
	deletable: RawTransactionArgument<boolean>;
	writePayment: RawTransactionArgument<string>;
}
export interface RegisterPooledBlobOptions {
	package?: string;
	arguments:
		| RegisterPooledBlobArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				rootHash: RawTransactionArgument<number | bigint>,
				unencodedSize: RawTransactionArgument<number | bigint>,
				encodingType: RawTransactionArgument<number>,
				deletable: RawTransactionArgument<boolean>,
				writePayment: RawTransactionArgument<string>,
		  ];
}
/** Registers a new blob against a storage pool. */
export function registerPooledBlob(options: RegisterPooledBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u256', 'u256', 'u64', 'u8', 'bool', null] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'self',
		'storagePool',
		'blobId',
		'rootHash',
		'unencodedSize',
		'encodingType',
		'deletable',
		'writePayment',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'register_pooled_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeletePooledBlobArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
}
export interface DeletePooledBlobOptions {
	package?: string;
	arguments:
		| DeletePooledBlobArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
		  ];
}
/** Deletes a blob from a storage pool and frees its capacity. */
export function deletePooledBlob(options: DeletePooledBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['self', 'storagePool', 'blobId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'delete_pooled_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnExpiredPooledBlobArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
}
export interface BurnExpiredPooledBlobOptions {
	package?: string;
	arguments:
		| BurnExpiredPooledBlobArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Burns a blob from an expired storage pool, regardless of the `deletable` flag.
 * The pool must have expired (`end_epoch <= current_epoch`).
 */
export function burnExpiredPooledBlob(options: BurnExpiredPooledBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u256'] satisfies (string | null)[];
	const parameterNames = ['self', 'storagePool', 'blobId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'burn_expired_pooled_blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtendStoragePoolArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	extendedEpochs: RawTransactionArgument<number>;
	payment: RawTransactionArgument<string>;
}
export interface ExtendStoragePoolOptions {
	package?: string;
	arguments:
		| ExtendStoragePoolArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				extendedEpochs: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ];
}
/** Extends the lifetime of a storage pool by `extended_epochs`. */
export function extendStoragePool(options: ExtendStoragePoolOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u32', null] satisfies (string | null)[];
	const parameterNames = ['self', 'storagePool', 'extendedEpochs', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'extend_storage_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IncreaseStoragePoolCapacityArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	additionalEncodedCapacityBytes: RawTransactionArgument<number | bigint>;
	payment: RawTransactionArgument<string>;
}
export interface IncreaseStoragePoolCapacityOptions {
	package?: string;
	arguments:
		| IncreaseStoragePoolCapacityArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				additionalEncodedCapacityBytes: RawTransactionArgument<number | bigint>,
				payment: RawTransactionArgument<string>,
		  ];
}
/**
 * Increases the reserved capacity of a storage pool for the remainder of its
 * lifetime.
 */
export function increaseStoragePoolCapacity(options: IncreaseStoragePoolCapacityOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['self', 'storagePool', 'additionalEncodedCapacityBytes', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'increase_storage_pool_capacity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IncreaseStoragePoolCapacityWithStorageArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	storage: RawTransactionArgument<string>;
}
export interface IncreaseStoragePoolCapacityWithStorageOptions {
	package?: string;
	arguments:
		| IncreaseStoragePoolCapacityWithStorageArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				storage: RawTransactionArgument<string>,
		  ];
}
/** Increases the pool's capacity by absorbing an existing `Storage` object. */
export function increaseStoragePoolCapacityWithStorage(
	options: IncreaseStoragePoolCapacityWithStorageOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'storagePool', 'storage'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'increase_storage_pool_capacity_with_storage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DecreaseStoragePoolCapacityBySizeArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	size: RawTransactionArgument<number | bigint>;
}
export interface DecreaseStoragePoolCapacityBySizeOptions {
	package?: string;
	arguments:
		| DecreaseStoragePoolCapacityBySizeArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				size: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Reduces the pool's capacity by extracting a `Storage` object of the given size.
 * Aborts with `EZeroExtractSize` if `size` is zero.
 */
export function decreaseStoragePoolCapacityBySize(
	options: DecreaseStoragePoolCapacityBySizeOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'storagePool', 'size'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'decrease_storage_pool_capacity_by_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DecreaseStoragePoolUnusedCapacityByPercentArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	percent: RawTransactionArgument<number>;
}
export interface DecreaseStoragePoolUnusedCapacityByPercentOptions {
	package?: string;
	arguments:
		| DecreaseStoragePoolUnusedCapacityByPercentArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				percent: RawTransactionArgument<number>,
		  ];
}
/**
 * Reduces the pool's capacity by extracting `percent` of the unused capacity as a
 * `Storage` object. Aborts with `EZeroExtractSize` if the computed extract size is
 * zero (for example from rounding or zero unused capacity).
 */
export function decreaseStoragePoolUnusedCapacityByPercent(
	options: DecreaseStoragePoolUnusedCapacityByPercentOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u8'] satisfies (string | null)[];
	const parameterNames = ['self', 'storagePool', 'percent'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'decrease_storage_pool_unused_capacity_by_percent',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CertifyPooledBlobArguments {
	self: RawTransactionArgument<string>;
	storagePool: RawTransactionArgument<string>;
	blobId: RawTransactionArgument<number | bigint>;
	signature: RawTransactionArgument<Array<number>>;
	signersBitmap: RawTransactionArgument<Array<number>>;
	message: RawTransactionArgument<Array<number>>;
}
export interface CertifyPooledBlobOptions {
	package?: string;
	arguments:
		| CertifyPooledBlobArguments
		| [
				self: RawTransactionArgument<string>,
				storagePool: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				signature: RawTransactionArgument<Array<number>>,
				signersBitmap: RawTransactionArgument<Array<number>>,
				message: RawTransactionArgument<Array<number>>,
		  ];
}
/** Certifies a blob within a storage pool. */
export function certifyPooledBlob(options: CertifyPooledBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u256', 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'storagePool', 'blobId', 'signature', 'signersBitmap', 'message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'certify_pooled_blob',
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
	const argumentsTypes = [null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['system', 'subsidy', 'epochsAhead'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'add_subsidy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddPerEpochSubsidiesArguments {
	system: RawTransactionArgument<string>;
	subsidies: TransactionArgument;
}
export interface AddPerEpochSubsidiesOptions {
	package?: string;
	arguments:
		| AddPerEpochSubsidiesArguments
		| [system: RawTransactionArgument<string>, subsidies: TransactionArgument];
}
/**
 * Adds rewards to the system for future epochs, where `subsidies[i]` is added to
 * the rewards of epoch `system.epoch() + i`.
 */
export function addPerEpochSubsidies(options: AddPerEpochSubsidiesOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['system', 'subsidies'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'add_per_epoch_subsidies',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateProtocolVersionArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	signature: RawTransactionArgument<Array<number>>;
	membersBitmap: RawTransactionArgument<Array<number>>;
	message: RawTransactionArgument<Array<number>>;
}
export interface UpdateProtocolVersionOptions {
	package?: string;
	arguments:
		| UpdateProtocolVersionArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				signature: RawTransactionArgument<Array<number>>,
				membersBitmap: RawTransactionArgument<Array<number>>,
				message: RawTransactionArgument<Array<number>>,
		  ];
}
/** Node collects signatures on the protocol version event and emits it. */
export function updateProtocolVersion(options: UpdateProtocolVersionOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'cap', 'signature', 'membersBitmap', 'message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'update_protocol_version',
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
	const argumentsTypes = [null, null, 'u256', 'u64'] satisfies (string | null)[];
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
	signature: RawTransactionArgument<Array<number>>;
	membersBitmap: RawTransactionArgument<Array<number>>;
	message: RawTransactionArgument<Array<number>>;
}
export interface UpdateDenyListOptions {
	package?: string;
	arguments:
		| UpdateDenyListArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				signature: RawTransactionArgument<Array<number>>,
				membersBitmap: RawTransactionArgument<Array<number>>,
				message: RawTransactionArgument<Array<number>>,
		  ];
}
/** Perform the update of the deny list. */
export function updateDenyList(options: UpdateDenyListOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
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
	signature: RawTransactionArgument<Array<number>>;
	membersBitmap: RawTransactionArgument<Array<number>>;
	message: RawTransactionArgument<Array<number>>;
}
export interface DeleteDenyListedBlobOptions {
	package?: string;
	arguments:
		| DeleteDenyListedBlobArguments
		| [
				self: RawTransactionArgument<string>,
				signature: RawTransactionArgument<Array<number>>,
				membersBitmap: RawTransactionArgument<Array<number>>,
				message: RawTransactionArgument<Array<number>>,
		  ];
}
/** Delete a blob that is deny listed by f+1 members. */
export function deleteDenyListedBlob(options: DeleteDenyListedBlobOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
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
	const argumentsTypes = [null] satisfies (string | null)[];
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
	const argumentsTypes = [null] satisfies (string | null)[];
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
	const argumentsTypes = [null] satisfies (string | null)[];
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
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'n_shards',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FutureAccountingArguments {
	self: RawTransactionArgument<string>;
}
export interface FutureAccountingOptions {
	package?: string;
	arguments: FutureAccountingArguments | [self: RawTransactionArgument<string>];
}
/** Read-only access to the accounting ring buffer. */
export function futureAccounting(options: FutureAccountingOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'future_accounting',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VersionArguments {
	system: RawTransactionArgument<string>;
}
export interface VersionOptions {
	package?: string;
	arguments: VersionArguments | [system: RawTransactionArgument<string>];
}
export function version(options: VersionOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['system'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'system',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
