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
/** Create a new `NodeMetadata` instance */
export function _new(options: {
	package?: string;
	arguments:
		| [
				imageUrl: RawTransactionArgument<string>,
				projectUrl: RawTransactionArgument<string>,
				description: RawTransactionArgument<string>,
		  ]
		| {
				imageUrl: RawTransactionArgument<string>;
				projectUrl: RawTransactionArgument<string>;
				description: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['imageUrl', 'projectUrl', 'description'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Set the image URL of the Validator. */
export function set_image_url(options: {
	package?: string;
	arguments:
		| [metadata: RawTransactionArgument<string>, imageUrl: RawTransactionArgument<string>]
		| {
				metadata: RawTransactionArgument<string>;
				imageUrl: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::node_metadata::NodeMetadata`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['metadata', 'imageUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'set_image_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Set the project URL of the Validator. */
export function set_project_url(options: {
	package?: string;
	arguments:
		| [metadata: RawTransactionArgument<string>, projectUrl: RawTransactionArgument<string>]
		| {
				metadata: RawTransactionArgument<string>;
				projectUrl: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::node_metadata::NodeMetadata`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['metadata', 'projectUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'set_project_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Set the description of the Validator. */
export function set_description(options: {
	package?: string;
	arguments:
		| [metadata: RawTransactionArgument<string>, description: RawTransactionArgument<string>]
		| {
				metadata: RawTransactionArgument<string>;
				description: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::node_metadata::NodeMetadata`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
	] satisfies string[];
	const parameterNames = ['metadata', 'description'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'set_description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Set an extra field of the Validator. */
export function set_extra_fields(options: {
	package?: string;
	arguments:
		| [metadata: RawTransactionArgument<string>, extraFields: RawTransactionArgument<string>]
		| {
				metadata: RawTransactionArgument<string>;
				extraFields: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::node_metadata::NodeMetadata`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::vec_map::VecMap<0x0000000000000000000000000000000000000000000000000000000000000001::string::String, 0x0000000000000000000000000000000000000000000000000000000000000001::string::String>',
	] satisfies string[];
	const parameterNames = ['metadata', 'extraFields'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'set_extra_fields',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the image URL of the Validator. */
export function image_url(options: {
	package?: string;
	arguments:
		| [metadata: RawTransactionArgument<string>]
		| {
				metadata: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`] satisfies string[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'image_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the project URL of the Validator. */
export function project_url(options: {
	package?: string;
	arguments:
		| [metadata: RawTransactionArgument<string>]
		| {
				metadata: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`] satisfies string[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'project_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the description of the Validator. */
export function description(options: {
	package?: string;
	arguments:
		| [metadata: RawTransactionArgument<string>]
		| {
				metadata: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`] satisfies string[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Returns the extra fields of the Validator. */
export function extra_fields(options: {
	package?: string;
	arguments:
		| [metadata: RawTransactionArgument<string>]
		| {
				metadata: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::node_metadata::NodeMetadata`] satisfies string[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'node_metadata',
			function: 'extra_fields',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
