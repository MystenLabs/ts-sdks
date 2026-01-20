/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The `NameRecord` is a struct that represents a single record in the registry.
 * Can be replaced by any other data structure due to the way `NameRecord`s are
 * stored and managed. SuiNS has no direct and permanent dependency on this module.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@suins/core::name_record';
export const NameRecord = new MoveStruct({
	name: `${$moduleName}::NameRecord`,
	fields: {
		/**
		 * The ID of the `SuinsRegistration` assigned to this record.
		 *
		 * The owner of the corresponding `SuinsRegistration` has the rights to be able to
		 * change and adjust the `target_address` of this domain.
		 *
		 * It is possible that the ID changes if the record expires and is purchased by
		 * someone else.
		 */
		nft_id: bcs.Address,
		/** Timestamp in milliseconds when the record expires. */
		expiration_timestamp_ms: bcs.u64(),
		/** The target address that this domain points to */
		target_address: bcs.option(bcs.Address),
		/** Additional data which may be stored in a record */
		data: vec_map.VecMap(bcs.string(), bcs.string()),
	},
});
export interface NewArguments {
	nftId: RawTransactionArgument<string>;
	expirationTimestampMs: RawTransactionArgument<number | bigint>;
}
export interface NewOptions {
	package?: string;
	arguments:
		| NewArguments
		| [
				nftId: RawTransactionArgument<string>,
				expirationTimestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
/** Create a new NameRecord. */
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = ['0x2::object::ID', 'u64'] satisfies (string | null)[];
	const parameterNames = ['nftId', 'expirationTimestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewLeafArguments {
	parentId: RawTransactionArgument<string>;
	targetAddress: RawTransactionArgument<string | null>;
}
export interface NewLeafOptions {
	package?: string;
	arguments:
		| NewLeafArguments
		| [
				parentId: RawTransactionArgument<string>,
				targetAddress: RawTransactionArgument<string | null>,
		  ];
}
/** Create a `leaf` NameRecord. */
export function newLeaf(options: NewLeafOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = ['0x2::object::ID', '0x1::option::Option<address>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['parentId', 'targetAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'new_leaf',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetDataArguments {
	self: RawTransactionArgument<string>;
	data: RawTransactionArgument<string>;
}
export interface SetDataOptions {
	package?: string;
	arguments:
		| SetDataArguments
		| [self: RawTransactionArgument<string>, data: RawTransactionArgument<string>];
}
/**
 * Set data as a vec_map directly overriding the data set in the registration self.
 * This simplifies the editing flow and gives the user and clients a fine-grained
 * control over custom data.
 *
 * Here's a meta example of how a PTB would look like:
 *
 * ```
 * let record = moveCall('data', [domain_name]);
 * moveCall('vec_map::insert', [record.data, key, value]);
 * moveCall('vec_map::remove', [record.data, other_key]);
 * moveCall('set_data', [domain_name, record.data]);
 * ```
 */
export function setData(options: SetDataOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'set_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTargetAddressArguments {
	self: RawTransactionArgument<string>;
	newAddress: RawTransactionArgument<string | null>;
}
export interface SetTargetAddressOptions {
	package?: string;
	arguments:
		| SetTargetAddressArguments
		| [self: RawTransactionArgument<string>, newAddress: RawTransactionArgument<string | null>];
}
/** Set the `target_address` field of the `NameRecord`. */
export function setTargetAddress(options: SetTargetAddressOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, '0x1::option::Option<address>'] satisfies (string | null)[];
	const parameterNames = ['self', 'newAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'set_target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetExpirationTimestampMsArguments {
	self: RawTransactionArgument<string>;
	expirationTimestampMs: RawTransactionArgument<number | bigint>;
}
export interface SetExpirationTimestampMsOptions {
	package?: string;
	arguments:
		| SetExpirationTimestampMsArguments
		| [
				self: RawTransactionArgument<string>,
				expirationTimestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
export function setExpirationTimestampMs(options: SetExpirationTimestampMsOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'expirationTimestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'set_expiration_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasExpiredArguments {
	self: RawTransactionArgument<string>;
}
export interface HasExpiredOptions {
	package?: string;
	arguments: HasExpiredArguments | [self: RawTransactionArgument<string>];
}
/** Check if the record has expired. */
export function hasExpired(options: HasExpiredOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'has_expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasExpiredPastGracePeriodArguments {
	self: RawTransactionArgument<string>;
}
export interface HasExpiredPastGracePeriodOptions {
	package?: string;
	arguments: HasExpiredPastGracePeriodArguments | [self: RawTransactionArgument<string>];
}
/** Check if the record has expired, taking into account the grace period. */
export function hasExpiredPastGracePeriod(options: HasExpiredPastGracePeriodOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'has_expired_past_grace_period',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsLeafRecordArguments {
	self: RawTransactionArgument<string>;
}
export interface IsLeafRecordOptions {
	package?: string;
	arguments: IsLeafRecordArguments | [self: RawTransactionArgument<string>];
}
/** Checks whether a name_record is a `leaf` record. */
export function isLeafRecord(options: IsLeafRecordOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'is_leaf_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DataArguments {
	self: RawTransactionArgument<string>;
}
export interface DataOptions {
	package?: string;
	arguments: DataArguments | [self: RawTransactionArgument<string>];
}
/** Read the `data` field from the `NameRecord`. */
export function data(options: DataOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TargetAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface TargetAddressOptions {
	package?: string;
	arguments: TargetAddressArguments | [self: RawTransactionArgument<string>];
}
/** Read the `target_address` field from the `NameRecord`. */
export function targetAddress(options: TargetAddressOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NftIdArguments {
	self: RawTransactionArgument<string>;
}
export interface NftIdOptions {
	package?: string;
	arguments: NftIdArguments | [self: RawTransactionArgument<string>];
}
/** Read the `nft_id` field from the `NameRecord`. */
export function nftId(options: NftIdOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'nft_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpirationTimestampMsArguments {
	self: RawTransactionArgument<string>;
}
export interface ExpirationTimestampMsOptions {
	package?: string;
	arguments: ExpirationTimestampMsArguments | [self: RawTransactionArgument<string>];
}
/** Read the `expiration_timestamp_ms` field from the `NameRecord`. */
export function expirationTimestampMs(options: ExpirationTimestampMsOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'name_record',
			function: 'expiration_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
