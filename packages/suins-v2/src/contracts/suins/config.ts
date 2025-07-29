// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/core::config';
export const Config = new MoveStruct({
	name: `${$moduleName}::Config`,
	fields: {
		public_key: bcs.vector(bcs.u8()),
		three_char_price: bcs.u64(),
		four_char_price: bcs.u64(),
		five_plus_char_price: bcs.u64(),
	},
});
export interface NewArguments {
	PublicKey: RawTransactionArgument<number[]>;
	ThreeCharPrice: RawTransactionArgument<number | bigint>;
	FourCharPrice: RawTransactionArgument<number | bigint>;
	FivePlusCharPrice: RawTransactionArgument<number | bigint>;
}
export interface NewOptions {
	package?: string;
	arguments:
		| NewArguments
		| [
				PublicKey: RawTransactionArgument<number[]>,
				ThreeCharPrice: RawTransactionArgument<number | bigint>,
				FourCharPrice: RawTransactionArgument<number | bigint>,
				FivePlusCharPrice: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Create a new instance of the configuration object. Define all properties from
 * the start.
 */
export function _new(options: NewOptions) {
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
export interface SetPublicKeyOptions {
	package?: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<number[]>];
}
export function setPublicKey(options: SetPublicKeyOptions) {
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
export interface SetThreeCharPriceOptions {
	package?: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<number | bigint>];
}
export function setThreeCharPrice(options: SetThreeCharPriceOptions) {
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
export interface SetFourCharPriceOptions {
	package?: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<number | bigint>];
}
export function setFourCharPrice(options: SetFourCharPriceOptions) {
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
export interface SetFivePlusCharPriceOptions {
	package?: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<number | bigint>];
}
export function setFivePlusCharPrice(options: SetFivePlusCharPriceOptions) {
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
export interface CalculatePriceOptions {
	package?: string;
	arguments: [
		_: RawTransactionArgument<string>,
		_: RawTransactionArgument<number>,
		_: RawTransactionArgument<number>,
	];
}
export function calculatePrice(options: CalculatePriceOptions) {
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
export interface PublicKeyArguments {
	_: RawTransactionArgument<string>;
}
export interface PublicKeyOptions {
	package?: string;
	arguments: PublicKeyArguments | [_: RawTransactionArgument<string>];
}
export function publicKey(options: PublicKeyOptions) {
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
export interface ThreeCharPriceArguments {
	_: RawTransactionArgument<string>;
}
export interface ThreeCharPriceOptions {
	package?: string;
	arguments: ThreeCharPriceArguments | [_: RawTransactionArgument<string>];
}
export function threeCharPrice(options: ThreeCharPriceOptions) {
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
export interface FourCharPriceArguments {
	_: RawTransactionArgument<string>;
}
export interface FourCharPriceOptions {
	package?: string;
	arguments: FourCharPriceArguments | [_: RawTransactionArgument<string>];
}
export function fourCharPrice(options: FourCharPriceOptions) {
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
export interface FivePlusCharPriceArguments {
	_: RawTransactionArgument<string>;
}
export interface FivePlusCharPriceOptions {
	package?: string;
	arguments: FivePlusCharPriceArguments | [_: RawTransactionArgument<string>];
}
export function fivePlusCharPrice(options: FivePlusCharPriceOptions) {
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
export interface AssertValidUserRegisterableDomainArguments {
	_: RawTransactionArgument<string>;
}
export interface AssertValidUserRegisterableDomainOptions {
	package?: string;
	arguments: AssertValidUserRegisterableDomainArguments | [_: RawTransactionArgument<string>];
}
export function assertValidUserRegisterableDomain(
	options: AssertValidUserRegisterableDomainOptions,
) {
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
