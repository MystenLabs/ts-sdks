// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This module defines the `Committee` struct which stores the current committee
 * with shard assignments. Additionally, it manages transitions / transfers of
 * shards between committees with the least amount of changes.
 */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as vec_map from './deps/sui/vec_map.js';
export function Committee() {
	return bcs.tuple([vec_map.VecMap(bcs.Address, bcs.vector(bcs.u16()))], { name: 'Committee' });
}
export interface ShardsArguments {
	cmt: RawTransactionArgument<string>;
	nodeId: RawTransactionArgument<string>;
}
export interface ShardsOptions {
	package?: string;
	arguments:
		| ShardsArguments
		| [cmt: RawTransactionArgument<string>, nodeId: RawTransactionArgument<string>];
}
/** Get the shards assigned to the given `node_id`. */
export function shards(options: ShardsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::committee::Committee`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
	] satisfies string[];
	const parameterNames = ['cmt', 'nodeId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'committee',
			function: 'shards',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SizeArguments {
	cmt: RawTransactionArgument<string>;
}
export interface SizeOptions {
	package?: string;
	arguments: SizeArguments | [cmt: RawTransactionArgument<string>];
}
/** Get the number of nodes in the committee. */
export function size(options: SizeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::committee::Committee`] satisfies string[];
	const parameterNames = ['cmt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'committee',
			function: 'size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InnerArguments {
	cmt: RawTransactionArgument<string>;
}
export interface InnerOptions {
	package?: string;
	arguments: InnerArguments | [cmt: RawTransactionArgument<string>];
}
/** Get the inner representation of the committee. */
export function inner(options: InnerOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::committee::Committee`] satisfies string[];
	const parameterNames = ['cmt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'committee',
			function: 'inner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToInnerArguments {
	cmt: RawTransactionArgument<string>;
}
export interface ToInnerOptions {
	package?: string;
	arguments: ToInnerArguments | [cmt: RawTransactionArgument<string>];
}
/** Copy the inner representation of the committee. */
export function toInner(options: ToInnerOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::committee::Committee`] satisfies string[];
	const parameterNames = ['cmt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'committee',
			function: 'to_inner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
