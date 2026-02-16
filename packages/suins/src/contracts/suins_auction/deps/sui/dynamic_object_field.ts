/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Similar to `sui::dynamic_field`, this module allows for the access of dynamic
 * fields. But unlike, `sui::dynamic_field` the values bound to these dynamic
 * fields _must_ be objects themselves. This allows for the objects to still exist
 * within in storage, which may be important for external tools. The difference is
 * otherwise not observable from within Move.
 */

import { type BcsType } from '@mysten/sui/bcs';
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::dynamic_object_field';
export function Wrapper<Name extends BcsType<any>>(...typeParameters: [Name]) {
	return new MoveStruct({
		name: `${$moduleName}::Wrapper<${typeParameters[0].name as Name['name']}>`,
		fields: {
			name: typeParameters[0],
		},
	});
}
export interface AddArguments<Name extends BcsType<any>, Value extends BcsType<any>> {
	object: RawTransactionArgument<string>;
	name: RawTransactionArgument<Name>;
	value: RawTransactionArgument<Value>;
}
export interface AddOptions<Name extends BcsType<any>, Value extends BcsType<any>> {
	package: string;
	arguments:
		| AddArguments<Name, Value>
		| [
				object: RawTransactionArgument<string>,
				name: RawTransactionArgument<Name>,
				value: RawTransactionArgument<Value>,
		  ];
	typeArguments: [string, string];
}
/**
 * Adds a dynamic object field to the object `object: &mut UID` at field specified
 * by `name: Name`. Aborts with `EFieldAlreadyExists` if the object already has
 * that field with that name.
 */
export function add<Name extends BcsType<any>, Value extends BcsType<any>>(
	options: AddOptions<Name, Value>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		'0x2::object::ID',
		`${options.typeArguments[0]}`,
		`${options.typeArguments[1]}`,
	] satisfies (string | null)[];
	const parameterNames = ['object', 'name', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'dynamic_object_field',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowArguments<Name extends BcsType<any>> {
	object: RawTransactionArgument<string>;
	name: RawTransactionArgument<Name>;
}
export interface BorrowOptions<Name extends BcsType<any>> {
	package: string;
	arguments:
		| BorrowArguments<Name>
		| [object: RawTransactionArgument<string>, name: RawTransactionArgument<Name>];
	typeArguments: [string, string];
}
/**
 * Immutably borrows the `object`s dynamic object field with the name specified by
 * `name: Name`. Aborts with `EFieldDoesNotExist` if the object does not have a
 * field with that name. Aborts with `EFieldTypeMismatch` if the field exists, but
 * the value object does not have the specified type.
 */
export function borrow<Name extends BcsType<any>>(options: BorrowOptions<Name>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['object', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'dynamic_object_field',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutArguments<Name extends BcsType<any>> {
	object: RawTransactionArgument<string>;
	name: RawTransactionArgument<Name>;
}
export interface BorrowMutOptions<Name extends BcsType<any>> {
	package: string;
	arguments:
		| BorrowMutArguments<Name>
		| [object: RawTransactionArgument<string>, name: RawTransactionArgument<Name>];
	typeArguments: [string, string];
}
/**
 * Mutably borrows the `object`s dynamic object field with the name specified by
 * `name: Name`. Aborts with `EFieldDoesNotExist` if the object does not have a
 * field with that name. Aborts with `EFieldTypeMismatch` if the field exists, but
 * the value object does not have the specified type.
 */
export function borrowMut<Name extends BcsType<any>>(options: BorrowMutOptions<Name>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['object', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'dynamic_object_field',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveArguments<Name extends BcsType<any>> {
	object: RawTransactionArgument<string>;
	name: RawTransactionArgument<Name>;
}
export interface RemoveOptions<Name extends BcsType<any>> {
	package: string;
	arguments:
		| RemoveArguments<Name>
		| [object: RawTransactionArgument<string>, name: RawTransactionArgument<Name>];
	typeArguments: [string, string];
}
/**
 * Removes the `object`s dynamic object field with the name specified by
 * `name: Name` and returns the bound object. Aborts with `EFieldDoesNotExist` if
 * the object does not have a field with that name. Aborts with
 * `EFieldTypeMismatch` if the field exists, but the value object does not have the
 * specified type.
 */
export function remove<Name extends BcsType<any>>(options: RemoveOptions<Name>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['object', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'dynamic_object_field',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface Exists_Arguments<Name extends BcsType<any>> {
	object: RawTransactionArgument<string>;
	name: RawTransactionArgument<Name>;
}
export interface Exists_Options<Name extends BcsType<any>> {
	package: string;
	arguments:
		| Exists_Arguments<Name>
		| [object: RawTransactionArgument<string>, name: RawTransactionArgument<Name>];
	typeArguments: [string];
}
/**
 * Returns true if and only if the `object` has a dynamic object field with the
 * name specified by `name: Name`.
 */
export function exists_<Name extends BcsType<any>>(options: Exists_Options<Name>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['object', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'dynamic_object_field',
			function: 'exists_',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExistsWithTypeArguments<Name extends BcsType<any>> {
	object: RawTransactionArgument<string>;
	name: RawTransactionArgument<Name>;
}
export interface ExistsWithTypeOptions<Name extends BcsType<any>> {
	package: string;
	arguments:
		| ExistsWithTypeArguments<Name>
		| [object: RawTransactionArgument<string>, name: RawTransactionArgument<Name>];
	typeArguments: [string, string];
}
/**
 * Returns true if and only if the `object` has a dynamic field with the name
 * specified by `name: Name` with an assigned value of type `Value`.
 */
export function existsWithType<Name extends BcsType<any>>(options: ExistsWithTypeOptions<Name>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['object', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'dynamic_object_field',
			function: 'exists_with_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IdArguments<Name extends BcsType<any>> {
	object: RawTransactionArgument<string>;
	name: RawTransactionArgument<Name>;
}
export interface IdOptions<Name extends BcsType<any>> {
	package: string;
	arguments:
		| IdArguments<Name>
		| [object: RawTransactionArgument<string>, name: RawTransactionArgument<Name>];
	typeArguments: [string];
}
/**
 * Returns the ID of the object associated with the dynamic object field Returns
 * none otherwise
 */
export function id<Name extends BcsType<any>>(options: IdOptions<Name>) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID', `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['object', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'dynamic_object_field',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
