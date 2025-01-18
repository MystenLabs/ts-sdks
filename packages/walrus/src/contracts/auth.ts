// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function Authenticated() {
	return bcs.enum('Authenticated', {
		Sender: bcs.Address,
		Object: bcs.Address,
	});
}
export function Authorized() {
	return bcs.enum('Authorized', {
		Address: bcs.Address,
		ObjectID: bcs.Address,
	});
}
export function init(packageAddress: string) {
	function authenticate_sender(options: { arguments: [] }) {
		const argumentsTypes: string[] = [];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'authenticate_sender',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function authenticate_with_object<T0 extends BcsType<any>>(options: {
		arguments: [RawTransactionArgument<T0>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [`${options.typeArguments[0]}`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'authenticate_with_object',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	function authorized_address(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = ['address'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'authorized_address',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function authorized_object(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'authorized_object',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function matches(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::auth::Authenticated`,
			`${packageAddress}::auth::Authorized`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'auth',
				function: 'matches',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		authenticate_sender,
		authenticate_with_object,
		authorized_address,
		authorized_object,
		matches,
	};
}
