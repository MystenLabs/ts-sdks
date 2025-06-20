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
export function init(packageAddress: string) {
	/** Creates a new extended field with the given value. */
	function _new<T extends BcsType<any>>(options: {
		arguments: [value: RawTransactionArgument<T>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'extended_field',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	/** Borrows the value stored in the extended field. */
	function borrow(options: {
		arguments: [field: RawTransactionArgument<string>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::extended_field::ExtendedField<${options.typeArguments[0]}>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'extended_field',
				function: 'borrow',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	/** Borrows the value stored in the extended field mutably. */
	function borrow_mut(options: {
		arguments: [field: RawTransactionArgument<string>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::extended_field::ExtendedField<${options.typeArguments[0]}>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'extended_field',
				function: 'borrow_mut',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	/** Swaps the value stored in the extended field with the given value. */
	function swap<T extends BcsType<any>>(options: {
		arguments: [field: RawTransactionArgument<string>, value: RawTransactionArgument<T>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::extended_field::ExtendedField<${options.typeArguments[0]}>`,
			`${options.typeArguments[0]}`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'extended_field',
				function: 'swap',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	/** Destroys the extended field and returns the value stored in it. */
	function destroy(options: {
		arguments: [field: RawTransactionArgument<string>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::extended_field::ExtendedField<${options.typeArguments[0]}>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'extended_field',
				function: 'destroy',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	return { _new, borrow, borrow_mut, swap, destroy };
}
