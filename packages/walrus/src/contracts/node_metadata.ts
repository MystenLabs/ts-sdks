// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as vec_map from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/vec_map.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function NodeMetadata() {
	return bcs.struct('NodeMetadata', {
		image_url: bcs.string(),
		project_url: bcs.string(),
		description: bcs.string(),
		extra_fields: vec_map.VecMap(bcs.string(), bcs.string()),
	});
}
export function init(packageAddress: string) {
	function _new(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_image_url(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::node_metadata::NodeMetadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'set_image_url',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_project_url(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::node_metadata::NodeMetadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'set_project_url',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_description(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::node_metadata::NodeMetadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'set_description',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_extra_fields(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::node_metadata::NodeMetadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::vec_map::VecMap<0x0000000000000000000000000000000000000000000000000000000000000001::string::String, 0x0000000000000000000000000000000000000000000000000000000000000001::string::String>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'set_extra_fields',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function image_url(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'image_url',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function project_url(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'project_url',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function description(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'description',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function extra_fields(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'extra_fields',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function _default(options: { arguments: [] }) {
		const argumentsTypes: string[] = [];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'default',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		_new,
		set_image_url,
		set_project_url,
		set_description,
		set_extra_fields,
		image_url,
		project_url,
		description,
		extra_fields,
		_default,
	};
}
