/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines the `Domain` type and helper functions.
 *
 * Domains are structured similar to their web2 counterpart and the rules
 * determining what a valid domain is can be found here:
 * https://en.wikipedia.org/wiki/Domain_name#Domain_name_syntax
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@suins/core::domain';
export const Domain = new MoveStruct({
	name: `${$moduleName}::Domain`,
	fields: {
		/**
		 * Vector of labels that make up a domain.
		 *
		 * Labels are stored in reverse order such that the TLD is always in position `0`.
		 * e.g. domain "pay.name.sui" will be stored in the vector as ["sui", "name",
		 * "pay"].
		 */
		labels: bcs.vector(bcs.string()),
	},
});
export interface NewArguments {
	domain: RawTransactionArgument<string>;
}
export interface NewOptions {
	package?: string;
	arguments: NewArguments | [domain: RawTransactionArgument<string>];
}
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToStringArguments {
	self: TransactionArgument;
}
export interface ToStringOptions {
	package?: string;
	arguments: ToStringArguments | [self: TransactionArgument];
}
/** Converts a domain into a fully-qualified string representation. */
export function toString(options: ToStringOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'to_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LabelArguments {
	self: TransactionArgument;
	level: RawTransactionArgument<number | bigint>;
}
export interface LabelOptions {
	package?: string;
	arguments:
		| LabelArguments
		| [self: TransactionArgument, level: RawTransactionArgument<number | bigint>];
}
/**
 * Returns the `label` in a domain specified by `level`.
 *
 * Given the domain "pay.name.sui" the individual labels have the following levels:
 *
 * - "pay" - `2`
 * - "name" - `1`
 * - "sui" - `0`
 *
 * This means that the TLD will always be at level `0`.
 */
export function label(options: LabelOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'level'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'label',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TldArguments {
	self: TransactionArgument;
}
export interface TldOptions {
	package?: string;
	arguments: TldArguments | [self: TransactionArgument];
}
/**
 * Returns the TLD (Top-Level Domain) of a `Domain`.
 *
 * "name.sui" -> "sui"
 */
export function tld(options: TldOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'tld',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SldArguments {
	self: TransactionArgument;
}
export interface SldOptions {
	package?: string;
	arguments: SldArguments | [self: TransactionArgument];
}
/**
 * Returns the SLD (Second-Level Domain) of a `Domain`.
 *
 * "name.sui" -> "sui"
 */
export function sld(options: SldOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'sld',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NumberOfLevelsArguments {
	self: TransactionArgument;
}
export interface NumberOfLevelsOptions {
	package?: string;
	arguments: NumberOfLevelsArguments | [self: TransactionArgument];
}
export function numberOfLevels(options: NumberOfLevelsOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'number_of_levels',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsSubdomainArguments {
	domain: TransactionArgument;
}
export interface IsSubdomainOptions {
	package?: string;
	arguments: IsSubdomainArguments | [domain: TransactionArgument];
}
export function isSubdomain(options: IsSubdomainOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'is_subdomain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ParentArguments {
	domain: TransactionArgument;
}
export interface ParentOptions {
	package?: string;
	arguments: ParentArguments | [domain: TransactionArgument];
}
/** Derive the parent of a subdomain. e.g. `subdomain.example.sui` -> `example.sui` */
export function parent(options: ParentOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['domain'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'parent',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsParentOfArguments {
	parent: TransactionArgument;
	child: TransactionArgument;
}
export interface IsParentOfOptions {
	package?: string;
	arguments: IsParentOfArguments | [parent: TransactionArgument, child: TransactionArgument];
}
/** Checks if `parent` domain is a valid parent for `child`. */
export function isParentOf(options: IsParentOfOptions) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['parent', 'child'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'domain',
			function: 'is_parent_of',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
