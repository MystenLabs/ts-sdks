/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Sui object identifiers */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
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
export interface IdToBytesArguments {
	id: RawTransactionArgument<string>;
}
export interface IdToBytesOptions {
	package: string;
	arguments: IdToBytesArguments | [id: RawTransactionArgument<string>];
}
/** Get the raw bytes of a `ID` */
export function idToBytes(options: IdToBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdToAddressArguments {
	id: RawTransactionArgument<string>;
}
export interface IdToAddressOptions {
	package: string;
	arguments: IdToAddressArguments | [id: RawTransactionArgument<string>];
}
/** Get the inner bytes of `id` as an address. */
export function idToAddress(options: IdToAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_to_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdFromBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface IdFromBytesOptions {
	package: string;
	arguments: IdFromBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
/** Make an `ID` from raw bytes. */
export function idFromBytes(options: IdFromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdFromAddressArguments {
	bytes: RawTransactionArgument<string>;
}
export interface IdFromAddressOptions {
	package: string;
	arguments: IdFromAddressArguments | [bytes: RawTransactionArgument<string>];
}
/** Make an `ID` from an address. */
export function idFromAddress(options: IdFromAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['address'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_from_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UidAsInnerArguments {
	uid: RawTransactionArgument<string>;
}
export interface UidAsInnerOptions {
	package: string;
	arguments: UidAsInnerArguments | [uid: RawTransactionArgument<string>];
}
/** Get the inner `ID` of `uid` */
export function uidAsInner(options: UidAsInnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['uid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'uid_as_inner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UidToInnerArguments {
	uid: RawTransactionArgument<string>;
}
export interface UidToInnerOptions {
	package: string;
	arguments: UidToInnerArguments | [uid: RawTransactionArgument<string>];
}
/** Get the raw bytes of a `uid`'s inner `ID` */
export function uidToInner(options: UidToInnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['uid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'uid_to_inner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UidToBytesArguments {
	uid: RawTransactionArgument<string>;
}
export interface UidToBytesOptions {
	package: string;
	arguments: UidToBytesArguments | [uid: RawTransactionArgument<string>];
}
/** Get the raw bytes of a `UID` */
export function uidToBytes(options: UidToBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['uid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'uid_to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UidToAddressArguments {
	uid: RawTransactionArgument<string>;
}
export interface UidToAddressOptions {
	package: string;
	arguments: UidToAddressArguments | [uid: RawTransactionArgument<string>];
}
/** Get the inner bytes of `id` as an address. */
export function uidToAddress(options: UidToAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['uid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'uid_to_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewOptions {
	package: string;
	arguments?: [];
}
/**
 * Create a new object. Returns the `UID` that must be stored in a Sui object. This
 * is the only way to create `UID`s.
 */
export function _new(options: NewOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'new',
		});
}
export interface DeleteArguments {
	id: RawTransactionArgument<string>;
}
export interface DeleteOptions {
	package: string;
	arguments: DeleteArguments | [id: RawTransactionArgument<string>];
}
/**
 * Delete the object and its `UID`. This is the only way to eliminate a `UID`. This
 * exists to inform Sui of object deletions. When an object gets unpacked, the
 * programmer will have to do something with its `UID`. The implementation of this
 * function emits a deleted system event so Sui knows to process the object
 * deletion
 */
export function _delete(options: DeleteOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'delete',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface IdOptions<T extends BcsType<any>> {
	package: string;
	arguments: IdArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Get the underlying `ID` of `obj` */
export function id<T extends BcsType<any>>(options: IdOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowIdArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface BorrowIdOptions<T extends BcsType<any>> {
	package: string;
	arguments: BorrowIdArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Borrow the underlying `ID` of `obj` */
export function borrowId<T extends BcsType<any>>(options: BorrowIdOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'borrow_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IdBytesArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface IdBytesOptions<T extends BcsType<any>> {
	package: string;
	arguments: IdBytesArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Get the raw bytes for the underlying `ID` of `obj` */
export function idBytes<T extends BcsType<any>>(options: IdBytesOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IdAddressArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface IdAddressOptions<T extends BcsType<any>> {
	package: string;
	arguments: IdAddressArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Get the inner bytes for the underlying `ID` of `obj` */
export function idAddress<T extends BcsType<any>>(options: IdAddressOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object',
			function: 'id_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
