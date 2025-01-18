// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as uq64_64 from './deps/0x0000000000000000000000000000000000000000000000000000000000000001/uq64_64.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function ApportionmentQueue<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return bcs.struct('ApportionmentQueue', {
		entries: bcs.vector(Entry(typeParameters[0])),
	});
}
export function Entry<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return bcs.struct('Entry', {
		priority: uq64_64.UQ64_64(),
		tie_breaker: bcs.u64(),
		value: typeParameters[0],
	});
}
export function init(packageAddress: string) {
	function _new(options: { arguments: []; typeArguments: [string] }) {
		const argumentsTypes: string[] = [];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	function pop_max(options: {
		arguments: [RawTransactionArgument<string>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::apportionment_queue::ApportionmentQueue<${options.typeArguments[0]}>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'pop_max',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	function insert<T0 extends BcsType<any>>(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<T0>,
		];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::apportionment_queue::ApportionmentQueue<${options.typeArguments[0]}>`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::uq64_64::UQ64_64',
			'u64',
			`${options.typeArguments[0]}`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'insert',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	function bubble_down(options: {
		arguments: [RawTransactionArgument<string[]>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`vector<${packageAddress}::apportionment_queue::Entry<${options.typeArguments[0]}>>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'bubble_down',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	function bubble_up(options: {
		arguments: [RawTransactionArgument<string[]>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`vector<${packageAddress}::apportionment_queue::Entry<${options.typeArguments[0]}>>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'bubble_up',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	function higher_priority_than(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::apportionment_queue::Entry<${options.typeArguments[0]}>`,
			`${packageAddress}::apportionment_queue::Entry<${options.typeArguments[0]}>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'higher_priority_than',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	return { _new, pop_max, insert, bubble_down, bubble_up, higher_priority_than };
}
