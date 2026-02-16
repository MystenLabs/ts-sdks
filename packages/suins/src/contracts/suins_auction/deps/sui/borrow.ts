/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A simple library that enables hot-potato-locked borrow mechanics.
 *
 * With Programmable transactions, it is possible to borrow a value within a
 * transaction, use it and put back in the end. Hot-potato `Borrow` makes sure the
 * object is returned and was not swapped for another one.
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::borrow';
/** An object wrapping a `T` and providing the borrow API. */
export function Referent<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::Referent<${typeParameters[0].name as T['name']}>`,
		fields: {
			id: bcs.Address,
			value: bcs.option(typeParameters[0]),
		},
	});
}
export const Borrow = new MoveStruct({
	name: `${$moduleName}::Borrow`,
	fields: {
		ref: bcs.Address,
		obj: bcs.Address,
	},
});
export interface NewArguments<T extends BcsType<any>> {
	value: RawTransactionArgument<T>;
}
export interface NewOptions<T extends BcsType<any>> {
	package: string;
	arguments: NewArguments<T> | [value: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Create a new `Referent` struct */
export function _new<T extends BcsType<any>>(options: NewOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'borrow',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowOptions {
	package: string;
	arguments: BorrowArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Borrow the `T` from the `Referent`, receiving the `T` and a `Borrow` hot potato. */
export function borrow(options: BorrowOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'borrow',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PutBackArguments<T extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	value: RawTransactionArgument<T>;
	borrow: RawTransactionArgument<string>;
}
export interface PutBackOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| PutBackArguments<T>
		| [
				self: RawTransactionArgument<string>,
				value: RawTransactionArgument<T>,
				borrow: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Put an object and the `Borrow` hot potato back. */
export function putBack<T extends BcsType<any>>(options: PutBackOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`, null] satisfies (string | null)[];
	const parameterNames = ['self', 'value', 'borrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'borrow',
			function: 'put_back',
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
/** Unpack the `Referent` struct and return the value. */
export function destroy(options: DestroyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'borrow',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
