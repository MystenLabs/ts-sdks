/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
/**
 * Authentication for either a sender or an object. Unlike the `Authorized` type,
 * it cannot be stored and must be used or ignored in the same transaction.
 */
export function Authenticated() {
	return bcs.enum('Authenticated', {
		Sender: bcs.Address,
		Object: bcs.Address,
	});
}
/**
 * Defines the ways to authorize an action. It can be either an address - checked
 * with `ctx.sender()`, - or an object - checked with `object::id(..)`.
 */
export function Authorized() {
	return bcs.enum('Authorized', {
		Address: bcs.Address,
		ObjectID: bcs.Address,
	});
}
/** Authenticates the sender as the authorizer. */
export function authenticate_sender(options: { package?: string; arguments: [] }) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auth',
			function: 'authenticate_sender',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
/** Authenticates an object as the authorizer. */
export function authenticate_with_object<T extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [obj: RawTransactionArgument<T>]
		| {
				obj: RawTransactionArgument<T>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
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
/** Returns the `Authorized` as an address. */
export function authorized_address(options: {
	package?: string;
	arguments:
		| [addr: RawTransactionArgument<string>]
		| {
				addr: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = ['address'] satisfies string[];
	const parameterNames = ['addr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auth',
			function: 'authorized_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the `Authorized` as an object. */
export function authorized_object(options: {
	package?: string;
	arguments:
		| [id: RawTransactionArgument<string>]
		| {
				id: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
	] satisfies string[];
	const parameterNames = ['id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'auth',
			function: 'authorized_object',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
