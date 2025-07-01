// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Module: extended_field */

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function ExtendedField() {
	return bcs.struct('ExtendedField', {
		id: object.UID(),
	});
}
export function Key() {
	return bcs.tuple([bcs.bool()], { name: 'Key' });
}
export interface NewArguments<T extends BcsType<any>> {
	value: RawTransactionArgument<T>;
}
export interface NewOptions<T extends BcsType<any>> {
	package?: string;
	arguments: NewArguments<T> | [value: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Creates a new extended field with the given value. */
export function _new<T extends BcsType<any>>(options: NewOptions<T>) {
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
export interface BorrowArguments {
	field: RawTransactionArgument<string>;
}
export interface BorrowOptions {
	package?: string;
	arguments: BorrowArguments | [field: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Borrows the value stored in the extended field. */
export function borrow(options: BorrowOptions) {
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
export interface BorrowMutArguments {
	field: RawTransactionArgument<string>;
}
export interface BorrowMutOptions {
	package?: string;
	arguments: BorrowMutArguments | [field: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Borrows the value stored in the extended field mutably. */
export function borrowMut(options: BorrowMutOptions) {
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
export interface SwapArguments<T extends BcsType<any>> {
	field: RawTransactionArgument<string>;
	value: RawTransactionArgument<T>;
}
export interface SwapOptions<T extends BcsType<any>> {
	package?: string;
	arguments:
		| SwapArguments<T>
		| [field: RawTransactionArgument<string>, value: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Swaps the value stored in the extended field with the given value. */
export function swap<T extends BcsType<any>>(options: SwapOptions<T>) {
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
export interface DestroyArguments {
	field: RawTransactionArgument<string>;
}
export interface DestroyOptions {
	package?: string;
	arguments: DestroyArguments | [field: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Destroys the extended field and returns the value stored in it. */
export function destroy(options: DestroyOptions) {
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
