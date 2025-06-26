/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: system */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function System() {
	return bcs.struct('System', {
		id: object.UID(),
		version: bcs.u64(),
		package_id: bcs.Address,
		new_package_id: bcs.option(bcs.Address),
	});
}
/** Marks blob as invalid given an invalid blob certificate. */
export function invalidate_blob_id(options: {
	package?: string;
	arguments:
		| [
				system: RawTransactionArgument<string>,
				signature: RawTransactionArgument<number[]>,
				membersBitmap: RawTransactionArgument<number[]>,
				message: RawTransactionArgument<number[]>,
		  ]
		| {
				system: RawTransactionArgument<string>;
				signature: RawTransactionArgument<number[]>;
				membersBitmap: RawTransactionArgument<number[]>;
				message: RawTransactionArgument<number[]>;
		  };
}) {
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
/** Certifies a blob containing Walrus events. */
export function certify_event_blob(options: {
	package?: string;
	arguments:
		| [
				system: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				rootHash: RawTransactionArgument<number | bigint>,
				size: RawTransactionArgument<number | bigint>,
				encodingType: RawTransactionArgument<number>,
				endingCheckpointSequenceNum: RawTransactionArgument<number | bigint>,
				epoch: RawTransactionArgument<number>,
		  ]
		| {
				system: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				blobId: RawTransactionArgument<number | bigint>;
				rootHash: RawTransactionArgument<number | bigint>;
				size: RawTransactionArgument<number | bigint>;
				encodingType: RawTransactionArgument<number>;
				endingCheckpointSequenceNum: RawTransactionArgument<number | bigint>;
				epoch: RawTransactionArgument<number>;
		  };
}) {
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
/** Allows buying a storage reservation for a given period of epochs. */
export function reserve_space(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				storageAmount: RawTransactionArgument<number | bigint>,
				epochsAhead: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				storageAmount: RawTransactionArgument<number | bigint>;
				epochsAhead: RawTransactionArgument<number>;
				payment: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Registers a new blob in the system. `size` is the size of the unencoded blob.
 * The reserved space in `storage` must be at least the size of the encoded blob.
 */
export function register_blob(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				storage: RawTransactionArgument<string>,
				blobId: RawTransactionArgument<number | bigint>,
				rootHash: RawTransactionArgument<number | bigint>,
				size: RawTransactionArgument<number | bigint>,
				encodingType: RawTransactionArgument<number>,
				deletable: RawTransactionArgument<boolean>,
				writePayment: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				storage: RawTransactionArgument<string>;
				blobId: RawTransactionArgument<number | bigint>;
				rootHash: RawTransactionArgument<number | bigint>;
				size: RawTransactionArgument<number | bigint>;
				encodingType: RawTransactionArgument<number>;
				deletable: RawTransactionArgument<boolean>;
				writePayment: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Certify that a blob will be available in the storage system until the end epoch
 * of the storage associated with it.
 */
export function certify_blob(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				blob: RawTransactionArgument<string>,
				signature: RawTransactionArgument<number[]>,
				signersBitmap: RawTransactionArgument<number[]>,
				message: RawTransactionArgument<number[]>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				blob: RawTransactionArgument<string>;
				signature: RawTransactionArgument<number[]>;
				signersBitmap: RawTransactionArgument<number[]>;
				message: RawTransactionArgument<number[]>;
		  };
}) {
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
/** Deletes a deletable blob and returns the contained storage resource. */
export function delete_blob(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, blob: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				blob: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Extend the period of validity of a blob with a new storage resource. The new
 * storage resource must be the same size as the storage resource used in the blob,
 * and have a longer period of validity.
 */
export function extend_blob_with_resource(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				blob: RawTransactionArgument<string>,
				extension: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				blob: RawTransactionArgument<string>;
				extension: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Extend the period of validity of a blob by extending its contained storage
 * resource by `extended_epochs` epochs.
 */
export function extend_blob(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				blob: RawTransactionArgument<string>,
				extendedEpochs: RawTransactionArgument<number>,
				payment: RawTransactionArgument<string>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				blob: RawTransactionArgument<string>;
				extendedEpochs: RawTransactionArgument<number>;
				payment: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Adds rewards to the system for the specified number of epochs ahead. The rewards
 * are split equally across the future accounting ring buffer up to the specified
 * epoch.
 */
export function add_subsidy(options: {
	package?: string;
	arguments:
		| [
				system: RawTransactionArgument<string>,
				subsidy: RawTransactionArgument<string>,
				epochsAhead: RawTransactionArgument<number>,
		  ]
		| {
				system: RawTransactionArgument<string>;
				subsidy: RawTransactionArgument<string>;
				epochsAhead: RawTransactionArgument<number>;
		  };
}) {
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
/** Register a deny list update. */
export function register_deny_list_update(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				denyListRoot: RawTransactionArgument<number | bigint>,
				denyListSequence: RawTransactionArgument<number | bigint>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				denyListRoot: RawTransactionArgument<number | bigint>;
				denyListSequence: RawTransactionArgument<number | bigint>;
		  };
}) {
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
/** Perform the update of the deny list. */
export function update_deny_list(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				signature: RawTransactionArgument<number[]>,
				membersBitmap: RawTransactionArgument<number[]>,
				message: RawTransactionArgument<number[]>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				cap: RawTransactionArgument<string>;
				signature: RawTransactionArgument<number[]>;
				membersBitmap: RawTransactionArgument<number[]>;
				message: RawTransactionArgument<number[]>;
		  };
}) {
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
/** Delete a blob that is deny listed by f+1 members. */
export function delete_deny_listed_blob(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				signature: RawTransactionArgument<number[]>,
				membersBitmap: RawTransactionArgument<number[]>,
				message: RawTransactionArgument<number[]>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				signature: RawTransactionArgument<number[]>;
				membersBitmap: RawTransactionArgument<number[]>;
				message: RawTransactionArgument<number[]>;
		  };
}) {
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
/** Get epoch. Uses the committee to get the epoch. */
export function epoch(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
/** Accessor for total capacity size. */
export function total_capacity_size(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
/** Accessor for used capacity size. */
export function used_capacity_size(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
/** Accessor for the number of shards. */
export function n_shards(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
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
