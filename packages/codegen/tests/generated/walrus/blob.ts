/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as storage_resource from './storage_resource.js';
export function Blob() {
	return bcs.struct('Blob', {
		id: object.UID(),
		registered_epoch: bcs.u32(),
		blob_id: bcs.u256(),
		size: bcs.u64(),
		encoding_type: bcs.u8(),
		certified_epoch: bcs.option(bcs.u32()),
		storage: storage_resource.Storage(),
		deletable: bcs.bool(),
	});
}
export function BlobIdDerivation() {
	return bcs.struct('BlobIdDerivation', {
		encoding_type: bcs.u8(),
		size: bcs.u64(),
		root_hash: bcs.u256(),
	});
}
export interface ObjectIdArguments {
	self: RawTransactionArgument<string>;
}
export interface ObjectIdOptions {
	package?: string;
	arguments: ObjectIdArguments | [self: RawTransactionArgument<string>];
}
export function objectId(options: ObjectIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'object_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RegisteredEpochArguments {
	self: RawTransactionArgument<string>;
}
export interface RegisteredEpochOptions {
	package?: string;
	arguments: RegisteredEpochArguments | [self: RawTransactionArgument<string>];
}
export function registeredEpoch(options: RegisteredEpochOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'registered_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlobIdArguments {
	self: RawTransactionArgument<string>;
}
export interface BlobIdOptions {
	package?: string;
	arguments: BlobIdArguments | [self: RawTransactionArgument<string>];
}
export function blobId(options: BlobIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'blob_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SizeArguments {
	self: RawTransactionArgument<string>;
}
export interface SizeOptions {
	package?: string;
	arguments: SizeArguments | [self: RawTransactionArgument<string>];
}
export function size(options: SizeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EncodingTypeArguments {
	self: RawTransactionArgument<string>;
}
export interface EncodingTypeOptions {
	package?: string;
	arguments: EncodingTypeArguments | [self: RawTransactionArgument<string>];
}
export function encodingType(options: EncodingTypeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'encoding_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CertifiedEpochArguments {
	self: RawTransactionArgument<string>;
}
export interface CertifiedEpochOptions {
	package?: string;
	arguments: CertifiedEpochArguments | [self: RawTransactionArgument<string>];
}
export function certifiedEpoch(options: CertifiedEpochOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'certified_epoch',
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
export function storage(options: StorageOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'storage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EncodedSizeArguments {
	self: RawTransactionArgument<string>;
	nShards: RawTransactionArgument<number>;
}
export interface EncodedSizeOptions {
	package?: string;
	arguments:
		| EncodedSizeArguments
		| [self: RawTransactionArgument<string>, nShards: RawTransactionArgument<number>];
}
export function encodedSize(options: EncodedSizeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`, 'u16'] satisfies string[];
	const parameterNames = ['self', 'nShards'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'encoded_size',
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
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'end_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DeriveBlobIdArguments {
	rootHash: RawTransactionArgument<number | bigint>;
	encodingType: RawTransactionArgument<number>;
	size: RawTransactionArgument<number | bigint>;
}
export interface DeriveBlobIdOptions {
	package?: string;
	arguments:
		| DeriveBlobIdArguments
		| [
				rootHash: RawTransactionArgument<number | bigint>,
				encodingType: RawTransactionArgument<number>,
				size: RawTransactionArgument<number | bigint>,
		  ];
}
/** Derives the blob_id for a blob given the root_hash, encoding_type and size. */
export function deriveBlobId(options: DeriveBlobIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = ['u256', 'u8', 'u64'] satisfies string[];
	const parameterNames = ['rootHash', 'encodingType', 'size'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'derive_blob_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnArguments {
	self: RawTransactionArgument<string>;
}
export interface BurnOptions {
	package?: string;
	arguments: BurnArguments | [self: RawTransactionArgument<string>];
}
/**
 * Allow the owner of a blob object to destroy it.
 *
 * This function also burns any [`Metadata`] associated with the blob, if present.
 */
export function burn(options: BurnOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddMetadataArguments {
	self: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
}
export interface AddMetadataOptions {
	package?: string;
	arguments:
		| AddMetadataArguments
		| [self: RawTransactionArgument<string>, metadata: RawTransactionArgument<string>];
}
/**
 * Adds the metadata dynamic field to the Blob.
 *
 * Aborts if the metadata is already present.
 */
export function addMetadata(options: AddMetadataOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::blob::Blob`,
		`${packageAddress}::metadata::Metadata`,
	] satisfies string[];
	const parameterNames = ['self', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'add_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddOrReplaceMetadataArguments {
	self: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
}
export interface AddOrReplaceMetadataOptions {
	package?: string;
	arguments:
		| AddOrReplaceMetadataArguments
		| [self: RawTransactionArgument<string>, metadata: RawTransactionArgument<string>];
}
/**
 * Adds the metadata dynamic field to the Blob, replacing the existing metadata if
 * present.
 *
 * Returns the replaced metadata if present.
 */
export function addOrReplaceMetadata(options: AddOrReplaceMetadataOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::blob::Blob`,
		`${packageAddress}::metadata::Metadata`,
	] satisfies string[];
	const parameterNames = ['self', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'add_or_replace_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TakeMetadataArguments {
	self: RawTransactionArgument<string>;
}
export interface TakeMetadataOptions {
	package?: string;
	arguments: TakeMetadataArguments | [self: RawTransactionArgument<string>];
}
/**
 * Removes the metadata dynamic field from the Blob, returning the contained
 * `Metadata`.
 *
 * Aborts if the metadata does not exist.
 */
export function takeMetadata(options: TakeMetadataOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'take_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InsertOrUpdateMetadataPairArguments {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface InsertOrUpdateMetadataPairOptions {
	package?: string;
	arguments:
		| InsertOrUpdateMetadataPairArguments
		| [
				self: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
}
/**
 * Inserts a key-value pair into the metadata.
 *
 * If the key is already present, the value is updated. Creates new metadata on the
 * Blob object if it does not exist already.
 */
export function insertOrUpdateMetadataPair(options: InsertOrUpdateMetadataPairOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::blob::Blob`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'key', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'insert_or_update_metadata_pair',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RemoveMetadataPairArguments {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface RemoveMetadataPairOptions {
	package?: string;
	arguments:
		| RemoveMetadataPairArguments
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>];
}
/**
 * Removes the metadata associated with the given key.
 *
 * Aborts if the metadata does not exist.
 */
export function removeMetadataPair(options: RemoveMetadataPairOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::blob::Blob`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'remove_metadata_pair',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RemoveMetadataPairIfExistsArguments {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface RemoveMetadataPairIfExistsOptions {
	package?: string;
	arguments:
		| RemoveMetadataPairIfExistsArguments
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>];
}
/** Removes and returns the metadata associated with the given key, if it exists. */
export function removeMetadataPairIfExists(options: RemoveMetadataPairIfExistsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::blob::Blob`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'blob',
			function: 'remove_metadata_pair_if_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
