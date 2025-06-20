/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Metadata that describes a Storage Node. Attached to the `StakingPool` */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as vec_map from './deps/sui/vec_map.js';
export function NodeMetadata() {
	return bcs.struct('NodeMetadata', {
		image_url: bcs.string(),
		project_url: bcs.string(),
		description: bcs.string(),
		extra_fields: vec_map.VecMap(bcs.string(), bcs.string()),
	});
}
export function init(packageAddress: string) {
	/** Create a new `NodeMetadata` instance */
	function _new(options: {
		arguments: [
			image_url: RawTransactionArgument<string>,
			project_url: RawTransactionArgument<string>,
			description: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Set the image URL of the Validator. */
	function set_image_url(options: {
		arguments: [
			metadata: RawTransactionArgument<string>,
			image_url: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::node_metadata::NodeMetadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'set_image_url',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Set the project URL of the Validator. */
	function set_project_url(options: {
		arguments: [
			metadata: RawTransactionArgument<string>,
			project_url: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::node_metadata::NodeMetadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'set_project_url',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Set the description of the Validator. */
	function set_description(options: {
		arguments: [
			metadata: RawTransactionArgument<string>,
			description: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::node_metadata::NodeMetadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'set_description',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Set an extra field of the Validator. */
	function set_extra_fields(options: {
		arguments: [
			metadata: RawTransactionArgument<string>,
			extra_fields: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::node_metadata::NodeMetadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::vec_map::VecMap<0x0000000000000000000000000000000000000000000000000000000000000001::string::String, 0x0000000000000000000000000000000000000000000000000000000000000001::string::String>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'set_extra_fields',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the image URL of the Validator. */
	function image_url(options: { arguments: [metadata: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'image_url',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the project URL of the Validator. */
	function project_url(options: { arguments: [metadata: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'project_url',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the description of the Validator. */
	function description(options: { arguments: [metadata: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'description',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the extra fields of the Validator. */
	function extra_fields(options: { arguments: [metadata: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'node_metadata',
				function: 'extra_fields',
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
	};
}
