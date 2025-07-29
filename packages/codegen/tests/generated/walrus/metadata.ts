/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Contains the metadata for Blobs on Walrus. */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/walrus::metadata';
export const Metadata = new MoveStruct({
	name: `${$moduleName}::Metadata`,
	fields: {
		metadata: vec_map.VecMap(bcs.string(), bcs.string()),
	},
});
export interface NewOptions {
	package?: string;
	arguments?: [];
}
/** Creates a new instance of Metadata. */
export function _new(options: NewOptions = {}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'metadata',
			function: 'new',
		});
}
export interface InsertOrUpdateArguments {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface InsertOrUpdateOptions {
	package?: string;
	arguments:
		| InsertOrUpdateArguments
		| [
				self: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
}
/**
 * Inserts a key-value pair into the metadata.
 *
 * If the key is already present, the value is updated.
 */
export function insertOrUpdate(options: InsertOrUpdateOptions) {
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
export interface RemoveArguments {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface RemoveOptions {
	package?: string;
	arguments:
		| RemoveArguments
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>];
}
/** Removes the metadata associated with the given key. */
export function remove(options: RemoveOptions) {
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
export interface RemoveIfExistsArguments {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface RemoveIfExistsOptions {
	package?: string;
	arguments:
		| RemoveIfExistsArguments
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>];
}
/**
 * Removes the metadata associated with the given key, if it exists.
 *
 * Optionally returns the previous value associated with the key.
 */
export function removeIfExists(options: RemoveIfExistsOptions) {
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
