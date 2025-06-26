/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: extended_field */

import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function ExtendedField() {
	return bcs.struct('ExtendedField', {
		id: object.UID(),
	});
}
export function Key() {
	return bcs.tuple([bcs.bool()], { name: 'Key' });
}
/** Creates a new extended field with the given value. */
export function _new<T extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [value: RawTransactionArgument<T>]
		| {
				value: RawTransactionArgument<T>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
	const parameterNames = ['value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'extended_field',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Borrows the value stored in the extended field. */
export function borrow(options: {
	package?: string;
	arguments:
		| [field: RawTransactionArgument<string>]
		| {
				field: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::extended_field::ExtendedField<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['field'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'extended_field',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Borrows the value stored in the extended field mutably. */
export function borrow_mut(options: {
	package?: string;
	arguments:
		| [field: RawTransactionArgument<string>]
		| {
				field: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::extended_field::ExtendedField<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['field'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'extended_field',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Swaps the value stored in the extended field with the given value. */
export function swap<T extends BcsType<any>>(options: {
	package?: string;
	arguments:
		| [field: RawTransactionArgument<string>, value: RawTransactionArgument<T>]
		| {
				field: RawTransactionArgument<string>;
				value: RawTransactionArgument<T>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::extended_field::ExtendedField<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	const parameterNames = ['field', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'extended_field',
			function: 'swap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
/** Destroys the extended field and returns the value stored in it. */
export function destroy(options: {
	package?: string;
	arguments:
		| [field: RawTransactionArgument<string>]
		| {
				field: RawTransactionArgument<string>;
		  };
	typeArguments: [string];
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::extended_field::ExtendedField<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['field'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'extended_field',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
