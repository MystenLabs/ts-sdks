/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Description: This module provides a wrapper for the KioskOwnerCap that makes the
 * Kiosk non-transferable and "owned".
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as kiosk from './deps/sui/kiosk.js';
const $moduleName = '@local-pkg/kiosk::personal_kiosk';
export const PersonalKioskCap = new MoveStruct({
	name: `${$moduleName}::PersonalKioskCap`,
	fields: {
		id: bcs.Address,
		cap: bcs.option(kiosk.KioskOwnerCap),
	},
});
export const Borrow = new MoveStruct({
	name: `${$moduleName}::Borrow`,
	fields: {
		cap_id: bcs.Address,
		owned_id: bcs.Address,
	},
});
export const OwnerMarker = new MoveStruct({
	name: `${$moduleName}::OwnerMarker`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const NewPersonalKiosk = new MoveStruct({
	name: `${$moduleName}::NewPersonalKiosk`,
	fields: {
		kiosk_id: bcs.Address,
	},
});
export interface DefaultArguments {
	kiosk: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface DefaultOptions {
	package?: string;
	arguments:
		| DefaultArguments
		| [kiosk: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/** The default setup for the PersonalKioskCap. */
export function _default(options: DefaultOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Kiosk',
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap',
	] satisfies string[];
	const parameterNames = ['kiosk', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'default',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewArguments {
	kiosk: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface NewOptions {
	package?: string;
	arguments:
		| NewArguments
		| [kiosk: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/**
 * Wrap the KioskOwnerCap making the Kiosk "owned" and non-transferable. The
 * `PersonalKioskCap` is returned to allow chaining within a PTB, but the value
 * must be consumed by the `transfer_to_sender` call in any case.
 */
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Kiosk',
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap',
	] satisfies string[];
	const parameterNames = ['kiosk', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateForArguments {
	kiosk: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	recipient: RawTransactionArgument<string>;
}
export interface CreateForOptions {
	package?: string;
	arguments:
		| CreateForArguments
		| [
				kiosk: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				recipient: RawTransactionArgument<string>,
		  ];
}
/**
 * Create a `PersonalKiosk` for `recipient`. This is useful when (e.g.) an admin
 * account wants to mint an asset with royalty enforcement on behalf of a user.
 */
export function createFor(options: CreateForOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Kiosk',
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap',
		'address',
	] satisfies string[];
	const parameterNames = ['kiosk', 'cap', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'create_for',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BorrowArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowOptions {
	package?: string;
	arguments: BorrowArguments | [self: RawTransactionArgument<string>];
}
/** Borrow the `KioskOwnerCap` from the `PersonalKioskCap` object. */
export function borrow(options: BorrowOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [`${packageAddress}::personal_kiosk::PersonalKioskCap`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BorrowMutArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowMutOptions {
	package?: string;
	arguments: BorrowMutArguments | [self: RawTransactionArgument<string>];
}
/** Mutably borrow the `KioskOwnerCap` from the `PersonalKioskCap` object. */
export function borrowMut(options: BorrowMutOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [`${packageAddress}::personal_kiosk::PersonalKioskCap`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BorrowValArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowValOptions {
	package?: string;
	arguments: BorrowValArguments | [self: RawTransactionArgument<string>];
}
/**
 * Borrow the `KioskOwnerCap` from the `PersonalKioskCap` object; `Borrow`
 * hot-potato makes sure that the Cap is returned via `return_val` call.
 */
export function borrowVal(options: BorrowValOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [`${packageAddress}::personal_kiosk::PersonalKioskCap`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'borrow_val',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReturnValArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	borrow: RawTransactionArgument<string>;
}
export interface ReturnValOptions {
	package?: string;
	arguments:
		| ReturnValArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				borrow: RawTransactionArgument<string>,
		  ];
}
/** Return the Cap to the PersonalKioskCap object. */
export function returnVal(options: ReturnValOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		`${packageAddress}::personal_kiosk::PersonalKioskCap`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::KioskOwnerCap',
		`${packageAddress}::personal_kiosk::Borrow`,
	] satisfies string[];
	const parameterNames = ['self', 'cap', 'borrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'return_val',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsPersonalArguments {
	kiosk: RawTransactionArgument<string>;
}
export interface IsPersonalOptions {
	package?: string;
	arguments: IsPersonalArguments | [kiosk: RawTransactionArgument<string>];
}
/** Check if the Kiosk is "personal". */
export function isPersonal(options: IsPersonalOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Kiosk',
	] satisfies string[];
	const parameterNames = ['kiosk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'is_personal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OwnerArguments {
	kiosk: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [kiosk: RawTransactionArgument<string>];
}
/** Get the owner of the Kiosk if the Kiosk is "personal". Aborts otherwise. */
export function owner(options: OwnerOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Kiosk',
	] satisfies string[];
	const parameterNames = ['kiosk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TryOwnerArguments {
	kiosk: RawTransactionArgument<string>;
}
export interface TryOwnerOptions {
	package?: string;
	arguments: TryOwnerArguments | [kiosk: RawTransactionArgument<string>];
}
/**
 * Try to get the owner of the Kiosk if the Kiosk is "personal". Returns None
 * otherwise.
 */
export function tryOwner(options: TryOwnerOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Kiosk',
	] satisfies string[];
	const parameterNames = ['kiosk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'try_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TransferToSenderArguments {
	self: RawTransactionArgument<string>;
}
export interface TransferToSenderOptions {
	package?: string;
	arguments: TransferToSenderArguments | [self: RawTransactionArgument<string>];
}
/** Transfer the `PersonalKioskCap` to the transaction sender. */
export function transferToSender(options: TransferToSenderOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [`${packageAddress}::personal_kiosk::PersonalKioskCap`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'personal_kiosk',
			function: 'transfer_to_sender',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
