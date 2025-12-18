/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::object';
export const ID = new MoveStruct({
	name: `${$moduleName}::ID`,
	fields: {
		bytes: bcs.Address,
	},
});
export const UID = new MoveStruct({
	name: `${$moduleName}::UID`,
	fields: {
		id: bcs.Address,
	},
});
export interface IdToBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function idToBytes(options: IdToBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::object::ID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IdToAddressOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function idToAddress(options: IdToAddressOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::object::ID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_to_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IdFromBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function idFromBytes(options: IdFromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IdFromAddressOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function idFromAddress(options: IdFromAddressOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['address'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_from_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UidAsInnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function uidAsInner(options: UidAsInnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::object::UID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'uid_as_inner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UidToInnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function uidToInner(options: UidToInnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::object::UID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'uid_to_inner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UidToBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function uidToBytes(options: UidToBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::object::UID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'uid_to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UidToAddressOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function uidToAddress(options: UidToAddressOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::object::UID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'uid_to_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface NewOptions {
	package?: string;
	arguments?: [];
}
export function _new(options: NewOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'new',
		});
}
export interface DeleteOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function _delete(options: DeleteOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::object::UID`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'delete',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IdOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function id<T0 extends BcsType<any>>(options: IdOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowIdOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function borrowId<T0 extends BcsType<any>>(options: BorrowIdOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'borrow_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IdBytesOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function idBytes<T0 extends BcsType<any>>(options: IdBytesOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IdAddressOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function idAddress<T0 extends BcsType<any>>(options: IdAddressOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
