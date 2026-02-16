/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::versioned';
export const Versioned = new MoveStruct({
	name: `${$moduleName}::Versioned`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
	},
});
export const VersionChangeCap = new MoveStruct({
	name: `${$moduleName}::VersionChangeCap`,
	fields: {
		versioned_id: bcs.Address,
		old_version: bcs.u64(),
	},
});
export interface CreateArguments<T extends BcsType<any>> {
	initVersion: RawTransactionArgument<number | bigint>;
	initValue: RawTransactionArgument<T>;
}
export interface CreateOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| CreateArguments<T>
		| [initVersion: RawTransactionArgument<number | bigint>, initValue: RawTransactionArgument<T>];
	typeArguments: [string];
}
/**
 * Create a new Versioned object that contains a initial value of type `T` with an
 * initial version.
 */
export function create<T extends BcsType<any>>(options: CreateOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64', `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['initVersion', 'initValue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'create',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface VersionArguments {
	self: RawTransactionArgument<string>;
}
export interface VersionOptions {
	package: string;
	arguments: VersionArguments | [self: RawTransactionArgument<string>];
}
/** Get the current version of the inner type. */
export function version(options: VersionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LoadValueArguments {
	self: RawTransactionArgument<string>;
}
export interface LoadValueOptions {
	package: string;
	arguments: LoadValueArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Load the inner value based on the current version. Caller specifies an expected
 * type T. If the type mismatch, the load will fail.
 */
export function loadValue(options: LoadValueOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'load_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LoadValueMutArguments {
	self: RawTransactionArgument<string>;
}
export interface LoadValueMutOptions {
	package: string;
	arguments: LoadValueMutArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Similar to load_value, but return a mutable reference. */
export function loadValueMut(options: LoadValueMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'load_value_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveValueForUpgradeArguments {
	self: RawTransactionArgument<string>;
}
export interface RemoveValueForUpgradeOptions {
	package: string;
	arguments: RemoveValueForUpgradeArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Take the inner object out for upgrade. To ensure we always upgrade properly, a
 * capability object is returned and must be used when we upgrade.
 */
export function removeValueForUpgrade(options: RemoveValueForUpgradeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'remove_value_for_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpgradeArguments<T extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	newVersion: RawTransactionArgument<number | bigint>;
	newValue: RawTransactionArgument<T>;
	cap: RawTransactionArgument<string>;
}
export interface UpgradeOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| UpgradeArguments<T>
		| [
				self: RawTransactionArgument<string>,
				newVersion: RawTransactionArgument<number | bigint>,
				newValue: RawTransactionArgument<T>,
				cap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Upgrade the inner object with a new version and new value. Must use the
 * capability returned by calling remove_value_for_upgrade.
 */
export function upgrade<T extends BcsType<any>>(options: UpgradeOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64', `${options.typeArguments[0]}`, null] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'newVersion', 'newValue', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyArguments {
	self: RawTransactionArgument<string>;
}
export interface DestroyOptions {
	package: string;
	arguments: DestroyArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Destroy this Versioned container, and return the inner object. */
export function destroy(options: DestroyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
