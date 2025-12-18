/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
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
export interface CreateOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function create<T0 extends BcsType<any>>(options: CreateOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64', `${options.typeArguments[0]}`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'create',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface VersionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function version(options: VersionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::versioned::Versioned`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface LoadValueOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function loadValue(options: LoadValueOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::versioned::Versioned`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'load_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface LoadValueMutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function loadValueMut(options: LoadValueMutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::versioned::Versioned`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'load_value_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveValueForUpgradeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function removeValueForUpgrade(options: RemoveValueForUpgradeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::versioned::Versioned`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'remove_value_for_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UpgradeOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<T0>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function upgrade<T0 extends BcsType<any>>(options: UpgradeOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::versioned::Versioned`,
		'u64',
		`${options.typeArguments[0]}`,
		`${packageAddress}::versioned::VersionChangeCap`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function destroy(options: DestroyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::versioned::Versioned`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioned',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
