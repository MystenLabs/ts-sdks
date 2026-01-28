/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A module that allows claiming names of a set length for free by presenting an
 * object T. Each `T` can have a separate configuration for a discount percentage.
 * If a `T` doesn't exist, registration will fail.
 *
 * Can be called only when promotions are active for a specific type T. Activation
 * / deactivation happens through PTBs.
 */

import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as pricing_config from './deps/suins/pricing_config.js';
import * as linked_table from './deps/sui/linked_table.js';
const $moduleName = '@suins/discounts::free_claims';
export const FreeClaimsApp = new MoveTuple({
	name: `${$moduleName}::FreeClaimsApp`,
	fields: [bcs.bool()],
});
export const FreeClaimsKey = new MoveTuple({
	name: `${$moduleName}::FreeClaimsKey`,
	fields: [bcs.bool()],
});
export const FreeClaimsConfig = new MoveStruct({
	name: `${$moduleName}::FreeClaimsConfig`,
	fields: {
		domain_length_range: pricing_config.Range,
		used_objects: linked_table.LinkedTable(bcs.Address),
	},
});
export interface FreeClaimArguments<T extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	intent: RawTransactionArgument<string>;
	object: RawTransactionArgument<T>;
}
export interface FreeClaimOptions<T extends BcsType<any>> {
	package?: string;
	arguments:
		| FreeClaimArguments<T>
		| [
				self: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				object: RawTransactionArgument<T>,
		  ];
	typeArguments: [string];
}
/** A function to register a name with a discount using type `T`. */
export function freeClaim<T extends BcsType<any>>(options: FreeClaimOptions<T>) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [null, null, null, `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'suins', 'intent', 'object'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'free_claims',
			function: 'free_claim',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FreeClaimWithDayOneArguments {
	self: RawTransactionArgument<string>;
	suins: RawTransactionArgument<string>;
	intent: RawTransactionArgument<string>;
	dayOne: RawTransactionArgument<string>;
}
export interface FreeClaimWithDayOneOptions {
	package?: string;
	arguments:
		| FreeClaimWithDayOneArguments
		| [
				self: RawTransactionArgument<string>,
				suins: RawTransactionArgument<string>,
				intent: RawTransactionArgument<string>,
				dayOne: RawTransactionArgument<string>,
		  ];
}
export function freeClaimWithDayOne(options: FreeClaimWithDayOneOptions) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [null, null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'suins', 'intent', 'dayOne'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'free_claims',
			function: 'free_claim_with_day_one',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AuthorizeTypeArguments {
	self: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	domainLengthRange: RawTransactionArgument<string>;
}
export interface AuthorizeTypeOptions {
	package?: string;
	arguments:
		| AuthorizeTypeArguments
		| [
				self: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				domainLengthRange: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * An admin action to authorize a type T for free claiming of names by presenting
 * an object of type `T`.
 */
export function authorizeType(options: AuthorizeTypeOptions) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', '_', 'domainLengthRange'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'free_claims',
			function: 'authorize_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeauthorizeTypeArguments {
	self: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
}
export interface DeauthorizeTypeOptions {
	package?: string;
	arguments:
		| DeauthorizeTypeArguments
		| [self: RawTransactionArgument<string>, _: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Force-deauthorize type T from free claims. Drops the linked_table. */
export function deauthorizeType(options: DeauthorizeTypeOptions) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'free_claims',
			function: 'deauthorize_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
