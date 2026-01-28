/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveEnum, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/walrus::auth';
/**
 * Authentication for either a sender or an object. Unlike the `Authorized` type,
 * it cannot be stored and must be used or ignored in the same transaction.
 */
export const Authenticated = new MoveEnum({
	name: `${$moduleName}::Authenticated`,
	fields: {
		Sender: bcs.Address,
		Object: bcs.Address,
	},
});
/**
 * Defines the ways to authorize an action. It can be either an address - checked
 * with `ctx.sender()`, - or an object - checked with `object::id(..)`.
 */
export const Authorized = new MoveEnum({
	name: `${$moduleName}::Authorized`,
	fields: {
		Address: bcs.Address,
		ObjectID: bcs.Address,
	},
});
export interface AuthenticateSenderOptions {
	package?: string;
	arguments?: [];
}
/** Authenticates the sender as the authorizer. */
export function authenticateSender(options: AuthenticateSenderOptions = {}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auth',
			function: 'authenticate_sender',
		});
}
export interface AuthenticateWithObjectArguments<T extends BcsType<any>> {
	obj: RawTransactionArgument<T>;
}
export interface AuthenticateWithObjectOptions<T extends BcsType<any>> {
	package?: string;
	arguments: AuthenticateWithObjectArguments<T> | [obj: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Authenticates an object as the authorizer. */
export function authenticateWithObject<T extends BcsType<any>>(
	options: AuthenticateWithObjectOptions<T>,
) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['obj'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auth',
			function: 'authenticate_with_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AuthorizedAddressArguments {
	addr: RawTransactionArgument<string>;
}
export interface AuthorizedAddressOptions {
	package?: string;
	arguments: AuthorizedAddressArguments | [addr: RawTransactionArgument<string>];
}
/** Returns the `Authorized` as an address. */
export function authorizedAddress(options: AuthorizedAddressOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = ['address'] satisfies (string | null)[];
	const parameterNames = ['addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auth',
			function: 'authorized_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AuthorizedObjectArguments {
	id: RawTransactionArgument<string>;
}
export interface AuthorizedObjectOptions {
	package?: string;
	arguments: AuthorizedObjectArguments | [id: RawTransactionArgument<string>];
}
/** Returns the `Authorized` as an object. */
export function authorizedObject(options: AuthorizedObjectOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = ['0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auth',
			function: 'authorized_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
