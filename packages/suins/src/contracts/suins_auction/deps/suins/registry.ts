/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as table from '../sui/table.js';
const $moduleName = 'suins::registry';
export const Registry = new MoveStruct({
	name: `${$moduleName}::Registry`,
	fields: {
		/**
		 * The `registry` table maps `Domain` to `NameRecord`. Added / replaced in the
		 * `add_record` function.
		 */
		registry: table.Table,
		/**
		 * The `reverse_registry` table maps `address` to `domain_name`. Updated in the
		 * `set_reverse_lookup` function.
		 */
		reverse_registry: table.Table,
	},
});
export interface NewArguments {
	_: RawTransactionArgument<string>;
}
export interface NewOptions {
	package: string;
	arguments: NewArguments | [_: RawTransactionArgument<string>];
}
export function _new(options: NewOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddRecordIgnoringGracePeriodArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
	noYears: RawTransactionArgument<number>;
}
export interface AddRecordIgnoringGracePeriodOptions {
	package: string;
	arguments:
		| AddRecordIgnoringGracePeriodArguments
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				noYears: RawTransactionArgument<number>,
		  ];
}
/**
 * Attempts to add a new record to the registry without looking at the grace
 * period. Currently used for subdomains where there's no grace period to respect.
 * Returns a `SuinsRegistration` upon success.
 */
export function addRecordIgnoringGracePeriod(options: AddRecordIgnoringGracePeriodOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, 'u8', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'domain', 'noYears'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'add_record_ignoring_grace_period',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddRecordArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
	noYears: RawTransactionArgument<number>;
}
export interface AddRecordOptions {
	package: string;
	arguments:
		| AddRecordArguments
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				noYears: RawTransactionArgument<number>,
		  ];
}
/**
 * Attempts to add a new record to the registry and returns a `SuinsRegistration`
 * upon success. Only use with second-level names. Enforces a `grace_period` by
 * default. Not suitable for subdomains (unless a grace period is needed).
 */
export function addRecord(options: AddRecordOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, 'u8', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'domain', 'noYears'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'add_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnRegistrationObjectArguments {
	self: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface BurnRegistrationObjectOptions {
	package: string;
	arguments:
		| BurnRegistrationObjectArguments
		| [self: RawTransactionArgument<string>, nft: RawTransactionArgument<string>];
}
/**
 * Attempts to burn an NFT and get storage rebates. Only works if the NFT has
 * expired.
 */
export function burnRegistrationObject(options: BurnRegistrationObjectOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'burn_registration_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WrapSubdomainArguments {
	_: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface WrapSubdomainOptions {
	package: string;
	arguments:
		| WrapSubdomainArguments
		| [_: RawTransactionArgument<string>, nft: RawTransactionArgument<string>];
}
/** Allow creation of subdomain wrappers only to authorized modules. */
export function wrapSubdomain(options: WrapSubdomainOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['_', 'nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'wrap_subdomain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnSubdomainObjectArguments {
	self: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface BurnSubdomainObjectOptions {
	package: string;
	arguments:
		| BurnSubdomainObjectArguments
		| [self: RawTransactionArgument<string>, nft: RawTransactionArgument<string>];
}
/**
 * Attempts to burn a subdomain registration object, and also invalidates any
 * records in the registry / reverse registry.
 */
export function burnSubdomainObject(options: BurnSubdomainObjectOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'burn_subdomain_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddLeafRecordArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
	target: RawTransactionArgument<string>;
}
export interface AddLeafRecordOptions {
	package: string;
	arguments:
		| AddLeafRecordArguments
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				target: RawTransactionArgument<string>,
		  ];
}
/**
 * Adds a `leaf` record to the registry. A `leaf` record is a record that is a
 * subdomain and doesn't have an equivalent `SuinsRegistration` object.
 *
 * Instead, the parent's `SuinsRegistration` object is used to manage
 * target_address & remove it / determine expiration.
 *
 * 1.  Leaf records can't have children. They only work as a resolving mechanism.
 * 2.  Leaf records must always have a `target` address (can't point to `none`).
 * 3.  Leaf records do not expire. Their expiration date is actually what defines
 *     their type.
 *
 * Leaf record's expiration is defined by the parent's expiration. Since the parent
 * can only be a `node`, we need to check that the parent's NFT_ID is valid &
 * hasn't expired.
 */
export function addLeafRecord(options: AddLeafRecordOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::clock::Clock', 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'domain', 'target'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'add_leaf_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RemoveLeafRecordArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
}
export interface RemoveLeafRecordOptions {
	package: string;
	arguments:
		| RemoveLeafRecordArguments
		| [self: RawTransactionArgument<string>, domain: RawTransactionArgument<string>];
}
/**
 * Can be used to remove a leaf record. Leaf records do not have any symmetrical
 * `SuinsRegistration` object. Authorization of who calls this is delegated to the
 * authorized module that calls this.
 */
export function removeLeafRecord(options: RemoveLeafRecordOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'remove_leaf_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetTargetAddressArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
	newTarget: RawTransactionArgument<string | null>;
}
export interface SetTargetAddressOptions {
	package: string;
	arguments:
		| SetTargetAddressArguments
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				newTarget: RawTransactionArgument<string | null>,
		  ];
}
export function setTargetAddress(options: SetTargetAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::option::Option<address>'] satisfies (string | null)[];
	const parameterNames = ['self', 'domain', 'newTarget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnsetReverseLookupArguments {
	self: RawTransactionArgument<string>;
	address: RawTransactionArgument<string>;
}
export interface UnsetReverseLookupOptions {
	package: string;
	arguments:
		| UnsetReverseLookupArguments
		| [self: RawTransactionArgument<string>, address: RawTransactionArgument<string>];
}
export function unsetReverseLookup(options: UnsetReverseLookupOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'address'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'unset_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetReverseLookupArguments {
	self: RawTransactionArgument<string>;
	address: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
}
export interface SetReverseLookupOptions {
	package: string;
	arguments:
		| SetReverseLookupArguments
		| [
				self: RawTransactionArgument<string>,
				address: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
		  ];
}
/** Reverse lookup can only be set for the record that has the target address. */
export function setReverseLookup(options: SetReverseLookupOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address', null] satisfies (string | null)[];
	const parameterNames = ['self', 'address', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetExpirationTimestampMsArguments {
	self: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
	expirationTimestampMs: RawTransactionArgument<number | bigint>;
}
export interface SetExpirationTimestampMsOptions {
	package: string;
	arguments:
		| SetExpirationTimestampMsArguments
		| [
				self: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				expirationTimestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Update the `expiration_timestamp_ms` of the given `SuinsRegistration` and
 * `NameRecord`. Requires the `SuinsRegistration` to make sure that both timestamps
 * are in sync.
 */
export function setExpirationTimestampMs(options: SetExpirationTimestampMsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'nft', 'domain', 'expirationTimestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_expiration_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetDataArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
	data: RawTransactionArgument<string>;
}
export interface SetDataOptions {
	package: string;
	arguments:
		| SetDataArguments
		| [
				self: RawTransactionArgument<string>,
				domain: RawTransactionArgument<string>,
				data: RawTransactionArgument<string>,
		  ];
}
/**
 * Update the `data` of the given `NameRecord` using a `SuinsRegistration`. Use
 * with caution and validate(!!) that any system fields are not removed
 * (accidentally), when building authorized packages that can write the metadata
 * field.
 */
export function setData(options: SetDataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'domain', 'data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasRecordArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
}
export interface HasRecordOptions {
	package: string;
	arguments:
		| HasRecordArguments
		| [self: RawTransactionArgument<string>, domain: RawTransactionArgument<string>];
}
/** Check whether the given `domain` is registered in the `Registry`. */
export function hasRecord(options: HasRecordOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'has_record',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LookupArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
}
export interface LookupOptions {
	package: string;
	arguments:
		| LookupArguments
		| [self: RawTransactionArgument<string>, domain: RawTransactionArgument<string>];
}
/** Returns the `NameRecord` associated with the given domain or None. */
export function lookup(options: LookupOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReverseLookupArguments {
	self: RawTransactionArgument<string>;
	address: RawTransactionArgument<string>;
}
export interface ReverseLookupOptions {
	package: string;
	arguments:
		| ReverseLookupArguments
		| [self: RawTransactionArgument<string>, address: RawTransactionArgument<string>];
}
/** Returns the `domain_name` associated with the given address or None. */
export function reverseLookup(options: ReverseLookupOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'address'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertNftIsAuthorizedArguments {
	self: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface AssertNftIsAuthorizedOptions {
	package: string;
	arguments:
		| AssertNftIsAuthorizedArguments
		| [self: RawTransactionArgument<string>, nft: RawTransactionArgument<string>];
}
/**
 * Asserts that the provided NFT:
 *
 * 1.  Matches the ID in the corresponding `Record`
 * 2.  Has not expired (does not take into account the grace period)
 */
export function assertNftIsAuthorized(options: AssertNftIsAuthorizedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'assert_nft_is_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetDataArguments {
	self: RawTransactionArgument<string>;
	domain: RawTransactionArgument<string>;
}
export interface GetDataOptions {
	package: string;
	arguments:
		| GetDataArguments
		| [self: RawTransactionArgument<string>, domain: RawTransactionArgument<string>];
}
/** Returns the `data` associated with the given `Domain`. */
export function getData(options: GetDataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'get_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
