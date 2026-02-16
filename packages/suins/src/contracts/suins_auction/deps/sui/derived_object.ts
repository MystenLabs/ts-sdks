/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Enables the creation of objects with deterministic addresses derived from a
 * parent object's UID. This module provides a way to generate objects with
 * predictable addresses based on a parent UID and a key, creating a namespace that
 * ensures uniqueness for each parent-key combination, which is usually how
 * registries are built.
 *
 * Key features:
 *
 * - Deterministic address generation based on parent object UID and key
 * - Derived objects can exist and operate independently of their parent
 *
 * The derived UIDs, once created, are independent and do not require sequencing on
 * the parent object. They can be used without affecting the parent. The parent
 * only maintains a record of which derived addresses have been claimed to prevent
 * duplicates.
 */

import {
	MoveTuple,
	MoveEnum,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::derived_object';
export const Claimed = new MoveTuple({ name: `${$moduleName}::Claimed`, fields: [bcs.Address] });
/**
 * An internal key to protect from generating the same UID twice (e.g. collide with
 * DFs)
 */
export function DerivedObjectKey<K extends BcsType<any>>(...typeParameters: [K]) {
	return new MoveTuple({
		name: `${$moduleName}::DerivedObjectKey<${typeParameters[0].name as K['name']}>`,
		fields: [typeParameters[0]],
	});
}
/**
 * The possible values of a claimed UID. We make it an enum to make upgradeability
 * easier in the future.
 */
export const ClaimedStatus = new MoveEnum({
	name: `${$moduleName}::ClaimedStatus`,
	fields: {
		/** The UID has been claimed and cannot be re-claimed or used. */
		Reserved: null,
	},
});
export interface ClaimArguments<K extends BcsType<any>> {
	parent: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface ClaimOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| ClaimArguments<K>
		| [parent: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string];
}
/** Claim a deterministic UID, using the parent's UID & any key. */
export function claim<K extends BcsType<any>>(options: ClaimOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['parent', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'derived_object',
			function: 'claim',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExistsArguments<K extends BcsType<any>> {
	parent: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface ExistsOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| ExistsArguments<K>
		| [parent: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string];
}
/**
 * Checks if a provided `key` has been claimed for the given parent. Note: If the
 * UID has been deleted through `object::delete`, this will always return true.
 */
export function exists<K extends BcsType<any>>(options: ExistsOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['parent', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'derived_object',
			function: 'exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeriveAddressArguments<K extends BcsType<any>> {
	parent: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface DeriveAddressOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| DeriveAddressArguments<K>
		| [parent: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string];
}
/** Given an ID and a Key, it calculates the derived address. */
export function deriveAddress<K extends BcsType<any>>(options: DeriveAddressOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['parent', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'derived_object',
			function: 'derive_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
