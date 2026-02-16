/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines a Display struct which defines the way an Object should be displayed.
 * The intention is to keep data as independent from its display as possible,
 * protecting the development process and keeping it separate from the ecosystem
 * agreements.
 *
 * Each of the fields of the Display object should allow for pattern substitution
 * and filling-in the pieces using the data from the object T.
 *
 * More entry functions might be added in the future depending on the use cases.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './vec_map.js';
const $moduleName = '0x2::display';
export const Display = new MoveStruct({
	name: `${$moduleName}::Display<phantom T>`,
	fields: {
		id: bcs.Address,
		/**
		 * Contains fields for display. Currently supported fields are: name, link, image
		 * and description.
		 */
		fields: vec_map.VecMap(bcs.string(), bcs.string()),
		/** Version that can only be updated manually by the Publisher. */
		version: bcs.u16(),
	},
});
export const DisplayCreated = new MoveStruct({
	name: `${$moduleName}::DisplayCreated<phantom T>`,
	fields: {
		id: bcs.Address,
	},
});
export const VersionUpdated = new MoveStruct({
	name: `${$moduleName}::VersionUpdated<phantom T>`,
	fields: {
		id: bcs.Address,
		version: bcs.u16(),
		fields: vec_map.VecMap(bcs.string(), bcs.string()),
	},
});
export interface NewArguments {
	pub: RawTransactionArgument<string>;
}
export interface NewOptions {
	package: string;
	arguments: NewArguments | [pub: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Create an empty Display object. It can either be shared empty or filled with
 * data right away via cheaper `set_owned` method.
 */
export function _new(options: NewOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pub'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewWithFieldsArguments {
	pub: RawTransactionArgument<string>;
	fields: RawTransactionArgument<string[]>;
	values: RawTransactionArgument<string[]>;
}
export interface NewWithFieldsOptions {
	package: string;
	arguments:
		| NewWithFieldsArguments
		| [
				pub: RawTransactionArgument<string>,
				fields: RawTransactionArgument<string[]>,
				values: RawTransactionArgument<string[]>,
		  ];
	typeArguments: [string];
}
/** Create a new Display<T> object with a set of fields. */
export function newWithFields(options: NewWithFieldsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		null,
		'vector<0x1::string::String>',
		'vector<0x1::string::String>',
	] satisfies (string | null)[];
	const parameterNames = ['pub', 'fields', 'values'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'new_with_fields',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateAndKeepArguments {
	pub: RawTransactionArgument<string>;
}
export interface CreateAndKeepOptions {
	package: string;
	arguments: CreateAndKeepArguments | [pub: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Create a new empty Display<T> object and keep it. */
export function createAndKeep(options: CreateAndKeepOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pub'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'create_and_keep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateVersionArguments {
	display: RawTransactionArgument<string>;
}
export interface UpdateVersionOptions {
	package: string;
	arguments: UpdateVersionArguments | [display: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Manually bump the version and emit an event with the updated version's contents. */
export function updateVersion(options: UpdateVersionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['display'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'update_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddArguments {
	self: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface AddOptions {
	package: string;
	arguments:
		| AddArguments
		| [
				self: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Sets a custom `name` field with the `value`. */
export function add(options: AddOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x1::string::String', '0x1::string::String'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'name', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddMultipleArguments {
	self: RawTransactionArgument<string>;
	fields: RawTransactionArgument<string[]>;
	values: RawTransactionArgument<string[]>;
}
export interface AddMultipleOptions {
	package: string;
	arguments:
		| AddMultipleArguments
		| [
				self: RawTransactionArgument<string>,
				fields: RawTransactionArgument<string[]>,
				values: RawTransactionArgument<string[]>,
		  ];
	typeArguments: [string];
}
/** Sets multiple `fields` with `values`. */
export function addMultiple(options: AddMultipleOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		null,
		'vector<0x1::string::String>',
		'vector<0x1::string::String>',
	] satisfies (string | null)[];
	const parameterNames = ['self', 'fields', 'values'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'add_multiple',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface EditArguments {
	self: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
	value: RawTransactionArgument<string>;
}
export interface EditOptions {
	package: string;
	arguments:
		| EditArguments
		| [
				self: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
				value: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Change the value of the field. TODO (long run): version changes; */
export function edit(options: EditOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x1::string::String', '0x1::string::String'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'name', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'edit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveArguments {
	self: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
}
export interface RemoveOptions {
	package: string;
	arguments:
		| RemoveArguments
		| [self: RawTransactionArgument<string>, name: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Remove the key from the Display. */
export function remove(options: RemoveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsAuthorizedArguments {
	pub: RawTransactionArgument<string>;
}
export interface IsAuthorizedOptions {
	package: string;
	arguments: IsAuthorizedArguments | [pub: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Authorization check; can be performed externally to implement protection rules
 * for Display.
 */
export function isAuthorized(options: IsAuthorizedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pub'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'is_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface VersionArguments {
	d: RawTransactionArgument<string>;
}
export interface VersionOptions {
	package: string;
	arguments: VersionArguments | [d: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Read the `version` field. */
export function version(options: VersionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['d'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FieldsArguments {
	d: RawTransactionArgument<string>;
}
export interface FieldsOptions {
	package: string;
	arguments: FieldsArguments | [d: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Read the `fields` field. */
export function fields(options: FieldsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['d'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'fields',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
