/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Contains the metadata for Blobs on Walrus. */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as vec_map from './deps/sui/vec_map.js';
export function Metadata() {
	return bcs.struct('Metadata', {
		metadata: vec_map.VecMap(bcs.string(), bcs.string()),
	});
}
/** Creates a new instance of Metadata. */
export function _new(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'metadata',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
/**
 * Inserts a key-value pair into the metadata.
 *
 * If the key is already present, the value is updated.
 */
export function insert_or_update(options: {
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
		`${packageAddress}::metadata::Metadata`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'key', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'metadata',
			function: 'insert_or_update',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Removes the metadata associated with the given key. */
export function remove(options: {
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
		`${packageAddress}::metadata::Metadata`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'metadata',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Removes the metadata associated with the given key, if it exists.
 *
 * Optionally returns the previous value associated with the key.
 */
export function remove_if_exists(options: {
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
		`${packageAddress}::metadata::Metadata`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'metadata',
			function: 'remove_if_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
