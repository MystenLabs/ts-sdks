/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Functionality for converting Move types into values. Use with care! */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/auction::type_name';
export const TypeName = new MoveStruct({
	name: `${$moduleName}::TypeName`,
	fields: {
		/**
		 * String representation of the type. All types are represented using their source
		 * syntax: "u8", "u64", "bool", "address", "vector", and so on for primitive types.
		 * Struct types are represented as fully qualified type names; e.g.
		 * `00000000000000000000000000000001::string::String` or
		 * `0000000000000000000000000000000a::module_name1::type_name1<0000000000000000000000000000000a::module_name2::type_name2<u64>>`
		 * Addresses are hex-encoded lowercase values of length ADDRESS_LENGTH (16, 20, or
		 * 32 depending on the Move platform)
		 */
		name: bcs.string(),
	},
});
export interface WithDefiningIdsOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
/**
 * Return a value representation of the type `T`. Package IDs that appear in fully
 * qualified type names in the output from this function are defining IDs (the ID
 * of the package in storage that first introduced the type).
 */
export function withDefiningIds(options: WithDefiningIdsOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'with_defining_ids',
			typeArguments: options.typeArguments,
		});
}
export interface WithOriginalIdsOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
/**
 * Return a value representation of the type `T`. Package IDs that appear in fully
 * qualified type names in the output from this function are original IDs (the ID
 * of the first version of the package, even if the type in question was introduced
 * in a later upgrade).
 */
export function withOriginalIds(options: WithOriginalIdsOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'with_original_ids',
			typeArguments: options.typeArguments,
		});
}
export interface DefiningIdOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
/**
 * Like `with_defining_ids`, this accesses the package ID that original defined the
 * type `T`.
 */
export function definingId(options: DefiningIdOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'defining_id',
			typeArguments: options.typeArguments,
		});
}
export interface OriginalIdOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
/**
 * Like `with_original_ids`, this accesses the original ID of the package that
 * defines type `T`, even if the type was introduced in a later version of the
 * package.
 */
export function originalId(options: OriginalIdOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'original_id',
			typeArguments: options.typeArguments,
		});
}
export interface IsPrimitiveArguments {
	self: RawTransactionArgument<string>;
}
export interface IsPrimitiveOptions {
	package?: string;
	arguments: IsPrimitiveArguments | [self: RawTransactionArgument<string>];
}
/**
 * Returns true iff the TypeName represents a primitive type, i.e. one of u8, u16,
 * u32, u64, u128, u256, bool, address, vector.
 */
export function isPrimitive(options: IsPrimitiveOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'is_primitive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AsStringArguments {
	self: RawTransactionArgument<string>;
}
export interface AsStringOptions {
	package?: string;
	arguments: AsStringArguments | [self: RawTransactionArgument<string>];
}
/** Get the String representation of `self` */
export function asString(options: AsStringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'as_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddressStringArguments {
	self: RawTransactionArgument<string>;
}
export interface AddressStringOptions {
	package?: string;
	arguments: AddressStringArguments | [self: RawTransactionArgument<string>];
}
/**
 * Get Address string (Base16 encoded), first part of the TypeName. Aborts if given
 * a primitive type.
 */
export function addressString(options: AddressStringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'address_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ModuleStringArguments {
	self: RawTransactionArgument<string>;
}
export interface ModuleStringOptions {
	package?: string;
	arguments: ModuleStringArguments | [self: RawTransactionArgument<string>];
}
/** Get name of the module. Aborts if given a primitive type. */
export function moduleString(options: ModuleStringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'module_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IntoStringArguments {
	self: RawTransactionArgument<string>;
}
export interface IntoStringOptions {
	package?: string;
	arguments: IntoStringArguments | [self: RawTransactionArgument<string>];
}
/** Convert `self` into its inner String */
export function intoString(options: IntoStringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'into_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
export function get(options: GetOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'get',
			typeArguments: options.typeArguments,
		});
}
export interface GetWithOriginalIdsOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
export function getWithOriginalIds(options: GetWithOriginalIdsOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'get_with_original_ids',
			typeArguments: options.typeArguments,
		});
}
export interface BorrowStringArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowStringOptions {
	package?: string;
	arguments: BorrowStringArguments | [self: RawTransactionArgument<string>];
}
export function borrowString(options: BorrowStringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'borrow_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetAddressArguments {
	self: RawTransactionArgument<string>;
}
export interface GetAddressOptions {
	package?: string;
	arguments: GetAddressArguments | [self: RawTransactionArgument<string>];
}
export function getAddress(options: GetAddressOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'get_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetModuleArguments {
	self: RawTransactionArgument<string>;
}
export interface GetModuleOptions {
	package?: string;
	arguments: GetModuleArguments | [self: RawTransactionArgument<string>];
}
export function getModule(options: GetModuleOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'type_name',
			function: 'get_module',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
