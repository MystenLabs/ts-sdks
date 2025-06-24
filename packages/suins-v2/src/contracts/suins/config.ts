// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
export function Config() {
	return bcs.struct('Config', {
		public_key: bcs.vector(bcs.u8()),
		three_char_price: bcs.u64(),
		four_char_price: bcs.u64(),
		five_plus_char_price: bcs.u64(),
	});
}
/**
 * Create a new instance of the configuration object. Define all properties from
 * the start.
 */
export function _new(options: {
	package?: string;
	arguments:
		| [
				PublicKey: RawTransactionArgument<number[]>,
				ThreeCharPrice: RawTransactionArgument<number | bigint>,
				FourCharPrice: RawTransactionArgument<number | bigint>,
				FivePlusCharPrice: RawTransactionArgument<number | bigint>,
		  ]
		| {
				PublicKey: RawTransactionArgument<number[]>;
				ThreeCharPrice: RawTransactionArgument<number | bigint>;
				FourCharPrice: RawTransactionArgument<number | bigint>;
				FivePlusCharPrice: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = ['vector<u8>', 'u64', 'u64', 'u64'] satisfies string[];
	const parameterNames = ['PublicKey', 'ThreeCharPrice', 'FourCharPrice', 'FivePlusCharPrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function set_public_key(options: {
	package?: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<number[]>];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`, 'vector<u8>'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'set_public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export function set_three_char_price(options: {
	package?: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<number | bigint>];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`, 'u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'set_three_char_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export function set_four_char_price(options: {
	package?: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<number | bigint>];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`, 'u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'set_four_char_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export function set_five_plus_char_price(options: {
	package?: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<number | bigint>];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`, 'u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'set_five_plus_char_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export function calculate_price(options: {
	package?: string;
	arguments: [
		_: RawTransactionArgument<string>,
		_: RawTransactionArgument<number>,
		_: RawTransactionArgument<number>,
	];
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`, 'u8', 'u8'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'calculate_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export function public_key(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`] satisfies string[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'public_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function three_char_price(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`] satisfies string[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'three_char_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function four_char_price(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`] satisfies string[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'four_char_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function five_plus_char_price(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::config::Config`] satisfies string[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'five_plus_char_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function assert_valid_user_registerable_domain(options: {
	package?: string;
	arguments:
		| [_: RawTransactionArgument<string>]
		| {
				_: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@suins/core';
	const argumentsTypes = [`${packageAddress}::domain::Domain`] satisfies string[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'config',
			function: 'assert_valid_user_registerable_domain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
