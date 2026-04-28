/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as domain from './domain.js';
const $moduleName = '@suins/core::controller';
export const SubnamePrunedEvent = new MoveStruct({
	name: `${$moduleName}::SubnamePrunedEvent`,
	fields: {
		subdomain: domain.Domain,
		parent_domain: domain.Domain,
	},
});
export const ControllerV2 = new MoveTuple({
	name: `${$moduleName}::ControllerV2`,
	fields: [bcs.bool()],
});
export const Controller = new MoveStruct({
	name: `${$moduleName}::Controller`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface SetTargetAddressArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
	newTarget: RawTransactionArgument<string | null>;
}
export interface SetTargetAddressOptions {
	package?: string;
	arguments:
		| SetTargetAddressArguments
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				newTarget: RawTransactionArgument<string | null>,
		  ];
}
/** Set the target address of a domain. */
export function setTargetAddress(options: SetTargetAddressOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		null,
		null,
		'0x1::option::Option<address>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'nft', 'newTarget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_target_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetReverseLookupArguments {
	suins: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface SetReverseLookupOptions {
	package?: string;
	arguments:
		| SetReverseLookupArguments
		| [suins: RawTransactionArgument<string>, domainName: RawTransactionArgument<string>];
}
/** Set the reverse lookup address for the domain */
export function setReverseLookup(options: SetReverseLookupOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['suins', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnsetReverseLookupArguments {
	suins: RawTransactionArgument<string>;
}
export interface UnsetReverseLookupOptions {
	package?: string;
	arguments: UnsetReverseLookupArguments | [suins: RawTransactionArgument<string>];
}
/** User-facing function - unset the reverse lookup address for the domain. */
export function unsetReverseLookup(options: UnsetReverseLookupOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['suins'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'unset_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetObjectReverseLookupArguments {
	suins: RawTransactionArgument<string>;
	obj: RawTransactionArgument<string>;
	domainName: RawTransactionArgument<string>;
}
export interface SetObjectReverseLookupOptions {
	package?: string;
	arguments:
		| SetObjectReverseLookupArguments
		| [
				suins: RawTransactionArgument<string>,
				obj: RawTransactionArgument<string>,
				domainName: RawTransactionArgument<string>,
		  ];
}
/**
 * Allows setting the reverse lookup address for an object. Expects a mutable
 * reference of the object.
 */
export function setObjectReverseLookup(options: SetObjectReverseLookupOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, '0x2::object::ID', '0x1::string::String'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['suins', 'obj', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_object_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnsetObjectReverseLookupArguments {
	suins: RawTransactionArgument<string>;
	obj: RawTransactionArgument<string>;
}
export interface UnsetObjectReverseLookupOptions {
	package?: string;
	arguments:
		| UnsetObjectReverseLookupArguments
		| [suins: RawTransactionArgument<string>, obj: RawTransactionArgument<string>];
}
/**
 * Allows unsetting the reverse lookup address for an object. Expects a mutable
 * reference of the object.
 */
export function unsetObjectReverseLookup(options: UnsetObjectReverseLookupOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['suins', 'obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'unset_object_reverse_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetUserDataArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface SetUserDataOptions {
	package?: string;
	arguments:
		| SetUserDataArguments
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
}
/** User-facing function - add a new key-value pair to the name record's data. */
export function setUserData(options: SetUserDataOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		null,
		null,
		'0x1::string::String',
		'0x1::string::String',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'nft', 'key', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'set_user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnsetUserDataArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
	key: RawTransactionArgument<string>;
}
export interface UnsetUserDataOptions {
	package?: string;
	arguments:
		| UnsetUserDataArguments
		| [
				suins: RawTransactionArgument<string>,
				nft: RawTransactionArgument<string>,
				key: RawTransactionArgument<string>,
		  ];
}
/** User-facing function - remove a key from the name record's data. */
export function unsetUserData(options: UnsetUserDataOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, null, '0x1::string::String', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['suins', 'nft', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'unset_user_data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnExpiredArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface BurnExpiredOptions {
	package?: string;
	arguments:
		| BurnExpiredArguments
		| [suins: RawTransactionArgument<string>, nft: RawTransactionArgument<string>];
}
export function burnExpired(options: BurnExpiredOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['suins', 'nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'burn_expired',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnExpiredSubnameArguments {
	suins: RawTransactionArgument<string>;
	nft: RawTransactionArgument<string>;
}
export interface BurnExpiredSubnameOptions {
	package?: string;
	arguments:
		| BurnExpiredSubnameArguments
		| [suins: RawTransactionArgument<string>, nft: RawTransactionArgument<string>];
}
export function burnExpiredSubname(options: BurnExpiredSubnameOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['suins', 'nft'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'burn_expired_subname',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PruneExpiredSubnameArguments {
	suins: RawTransactionArgument<string>;
	parent: RawTransactionArgument<string>;
	subdomainName: RawTransactionArgument<string>;
}
export interface PruneExpiredSubnameOptions {
	package?: string;
	arguments:
		| PruneExpiredSubnameArguments
		| [
				suins: RawTransactionArgument<string>,
				parent: RawTransactionArgument<string>,
				subdomainName: RawTransactionArgument<string>,
		  ];
}
/**
 * Prunes an expired subdomain record from the registry by name, gated by ownership
 * of the parent. This allows the parent holder to clean up expired subdomain
 * records even when they don't possess the SubDomainRegistration object. After
 * pruning, the subdomain name becomes available for re-registration. The orphaned
 * SubDomainRegistration object (if it still exists) becomes useless.
 *
 * Use this when you control the parent domain but someone else holds the expired
 * subdomain NFT.
 */
export function pruneExpiredSubname(options: PruneExpiredSubnameOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, null, '0x1::string::String', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['suins', 'parent', 'subdomainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'prune_expired_subname',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PruneExpiredSubnamesArguments {
	suins: RawTransactionArgument<string>;
	parent: RawTransactionArgument<string>;
	subdomainNames: RawTransactionArgument<Array<string>>;
}
export interface PruneExpiredSubnamesOptions {
	package?: string;
	arguments:
		| PruneExpiredSubnamesArguments
		| [
				suins: RawTransactionArgument<string>,
				parent: RawTransactionArgument<string>,
				subdomainNames: RawTransactionArgument<Array<string>>,
		  ];
}
/**
 * Best-effort pruning of multiple expired subdomain records for a given parent.
 *
 * This function does **not** abort if individual entries are:
 *
 * - not subdomains,
 * - not direct children of the parent,
 * - missing from the registry,
 * - not expired,
 * - leaf records.
 *
 * It prunes what it can, emitting `SubnamePrunedEvent` for each successfully
 * pruned record, and returns the total count of pruned entries.
 */
export function pruneExpiredSubnames(options: PruneExpiredSubnamesOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [
		null,
		null,
		'vector<0x1::string::String>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['suins', 'parent', 'subdomainNames'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'controller',
			function: 'prune_expired_subnames',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
