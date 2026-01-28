/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as bag from './bag.js';
const $moduleName = '0x2::kiosk_extension';
export const Extension = new MoveStruct({
	name: `${$moduleName}::Extension`,
	fields: {
		storage: bag.Bag,
		permissions: bcs.u128(),
		is_enabled: bcs.bool(),
	},
});
export const ExtensionKey = new MoveStruct({
	name: `${$moduleName}::ExtensionKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface AddOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T0>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
	];
	typeArguments: [string];
}
export function add<T0 extends BcsType<any>>(options: AddOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`, null, null, 'u128'] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DisableOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function disable(options: DisableOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'disable',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface EnableOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function enable(options: EnableOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'enable',
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
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface StorageOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function storage<T0 extends BcsType<any>>(options: StorageOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'storage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface StorageMutOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function storageMut<T0 extends BcsType<any>>(options: StorageMutOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'storage_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceOptions<T0 extends BcsType<any>, T1 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T0>,
		RawTransactionArgument<string>,
		RawTransactionArgument<T1>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string, string];
}
export function place<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	options: PlaceOptions<T0, T1>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		null,
		`${options.typeArguments[1]}`,
		null,
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'place',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface LockOptions<T0 extends BcsType<any>, T1 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T0>,
		RawTransactionArgument<string>,
		RawTransactionArgument<T1>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string, string];
}
export function lock<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	options: LockOptions<T0, T1>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		null,
		`${options.typeArguments[1]}`,
		null,
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'lock',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsInstalledOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isInstalled(options: IsInstalledOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'is_installed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsEnabledOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isEnabled(options: IsEnabledOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'is_enabled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface CanPlaceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function canPlace(options: CanPlaceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'can_place',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface CanLockOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function canLock(options: CanLockOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'can_lock',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
