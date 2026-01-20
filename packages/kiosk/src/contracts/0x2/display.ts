/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './vec_map.js';
const $moduleName = '0x2::display';
export const Display = new MoveStruct({
	name: `${$moduleName}::Display`,
	fields: {
		id: bcs.Address,
		fields: vec_map.VecMap(bcs.string(), bcs.string()),
		version: bcs.u16(),
	},
});
export const DisplayCreated = new MoveStruct({
	name: `${$moduleName}::DisplayCreated`,
	fields: {
		id: bcs.Address,
	},
});
export const VersionUpdated = new MoveStruct({
	name: `${$moduleName}::VersionUpdated`,
	fields: {
		id: bcs.Address,
		version: bcs.u16(),
		fields: vec_map.VecMap(bcs.string(), bcs.string()),
	},
});
export interface NewOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface NewWithFieldsOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string[]>,
		RawTransactionArgument<string[]>,
	];
	typeArguments: [string];
}
export function newWithFields(options: NewWithFieldsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		null,
		'vector<0x1::string::String>',
		'vector<0x1::string::String>',
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'new_with_fields',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface CreateAndKeepOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function createAndKeep(options: CreateAndKeepOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'create_and_keep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateVersionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function updateVersion(options: UpdateVersionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'update_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AddOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function add(options: AddOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x1::string::String', '0x1::string::String'] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface AddMultipleOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string[]>,
		RawTransactionArgument<string[]>,
	];
	typeArguments: [string];
}
export function addMultiple(options: AddMultipleOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		null,
		'vector<0x1::string::String>',
		'vector<0x1::string::String>',
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'add_multiple',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface EditOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function edit(options: EditOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x1::string::String', '0x1::string::String'] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'edit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function remove(options: RemoveOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsAuthorizedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isAuthorized(options: IsAuthorizedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'is_authorized',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface VersionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function version(options: VersionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FieldsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function fields(options: FieldsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'display',
			function: 'fields',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
