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
export function object_id(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
export function registered_epoch(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
export function blob_id(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
export function size(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
export function encoding_type(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
export function certified_epoch(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
export function storage(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
export function encoded_size(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, nShards: RawTransactionArgument<number>]
		| {
				self: RawTransactionArgument<string>;
				nShards: RawTransactionArgument<number>;
		  };
}) {
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
export function end_epoch(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
/** Derives the blob_id for a blob given the root_hash, encoding_type and size. */
export function derive_blob_id(options: {
	package?: string;
	arguments:
		| [
				rootHash: RawTransactionArgument<number | bigint>,
				encodingType: RawTransactionArgument<number>,
				size: RawTransactionArgument<number | bigint>,
		  ]
		| {
				rootHash: RawTransactionArgument<number | bigint>;
				encodingType: RawTransactionArgument<number>;
				size: RawTransactionArgument<number | bigint>;
		  };
}) {
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
/**
 * Allow the owner of a blob object to destroy it.
 *
 * This function also burns any [`Metadata`] associated with the blob, if present.
 */
export function burn(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Adds the metadata dynamic field to the Blob.
 *
 * Aborts if the metadata is already present.
 */
export function add_metadata(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, metadata: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				metadata: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Adds the metadata dynamic field to the Blob, replacing the existing metadata if
 * present.
 *
 * Returns the replaced metadata if present.
 */
export function add_or_replace_metadata(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, metadata: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				metadata: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Removes the metadata dynamic field from the Blob, returning the contained
 * `Metadata`.
 *
 * Aborts if the metadata does not exist.
 */
export function take_metadata(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Inserts a key-value pair into the metadata.
 *
 * If the key is already present, the value is updated. Creates new metadata on the
 * Blob object if it does not exist already.
 */
export function insert_or_update_metadata_pair(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				key: RawTransactionArgument<string>;
				value: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Removes the metadata associated with the given key.
 *
 * Aborts if the metadata does not exist.
 */
export function remove_metadata_pair(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				key: RawTransactionArgument<string>;
		  };
}) {
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
/** Removes and returns the metadata associated with the given key, if it exists. */
export function remove_metadata_pair_if_exists(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				key: RawTransactionArgument<string>;
		  };
}) {
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
