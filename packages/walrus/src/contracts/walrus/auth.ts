// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
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
export function init(packageAddress: string) {
	/** Authenticates the sender as the authorizer. */
	function authenticate_sender(options: { arguments: [] }) {
		const argumentsTypes = [] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'authenticate_sender',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Authenticates an object as the authorizer. */
	function authenticate_with_object<T extends BcsType<any>>(options: {
		arguments: [obj: RawTransactionArgument<T>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'authenticate_with_object',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	/** Returns the `Authorized` as an address. */
	function authorized_address(options: { arguments: [addr: RawTransactionArgument<string>] }) {
		const argumentsTypes = ['address'] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'authorized_address',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the `Authorized` as an object. */
	function authorized_object(options: { arguments: [id: RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'authorized_object',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { authenticate_sender, authenticate_with_object, authorized_address, authorized_object };
}
