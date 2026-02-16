/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = 'seal::key_server';
export const KeyServer = new MoveStruct({
	name: `${$moduleName}::KeyServer`,
	fields: {
		id: bcs.Address,
		first_version: bcs.u64(),
		last_version: bcs.u64(),
	},
});
export const KeyServerV1 = new MoveStruct({
	name: `${$moduleName}::KeyServerV1`,
	fields: {
		name: bcs.string(),
		url: bcs.string(),
		key_type: bcs.u8(),
		pk: bcs.vector(bcs.u8()),
	},
});
export interface CreateAndTransferV1Arguments {
	name: RawTransactionArgument<string>;
	url: RawTransactionArgument<string>;
	keyType: RawTransactionArgument<number>;
	pk: RawTransactionArgument<number[]>;
}
export interface CreateAndTransferV1Options {
	package: string;
	arguments:
		| CreateAndTransferV1Arguments
		| [
				name: RawTransactionArgument<string>,
				url: RawTransactionArgument<string>,
				keyType: RawTransactionArgument<number>,
				pk: RawTransactionArgument<number[]>,
		  ];
}
export function createAndTransferV1(options: CreateAndTransferV1Options) {
	const packageAddress = options.package;
	const argumentsTypes = [
		'0x1::string::String',
		'0x1::string::String',
		'u8',
		'vector<u8>',
	] satisfies (string | null)[];
	const parameterNames = ['name', 'url', 'keyType', 'pk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'create_and_transfer_v1',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface V1Arguments {
	s: RawTransactionArgument<string>;
}
export interface V1Options {
	package: string;
	arguments: V1Arguments | [s: RawTransactionArgument<string>];
}
export function v1(options: V1Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'v1',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NameArguments {
	s: RawTransactionArgument<string>;
}
export interface NameOptions {
	package: string;
	arguments: NameArguments | [s: RawTransactionArgument<string>];
}
export function name(options: NameOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UrlArguments {
	s: RawTransactionArgument<string>;
}
export interface UrlOptions {
	package: string;
	arguments: UrlArguments | [s: RawTransactionArgument<string>];
}
export function url(options: UrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface KeyTypeArguments {
	s: RawTransactionArgument<string>;
}
export interface KeyTypeOptions {
	package: string;
	arguments: KeyTypeArguments | [s: RawTransactionArgument<string>];
}
export function keyType(options: KeyTypeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'key_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PkArguments {
	s: RawTransactionArgument<string>;
}
export interface PkOptions {
	package: string;
	arguments: PkArguments | [s: RawTransactionArgument<string>];
}
export function pk(options: PkOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'pk',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdArguments {
	s: RawTransactionArgument<string>;
}
export interface IdOptions {
	package: string;
	arguments: IdArguments | [s: RawTransactionArgument<string>];
}
export function id(options: IdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PkAsBfBls12381Arguments {
	s: RawTransactionArgument<string>;
}
export interface PkAsBfBls12381Options {
	package: string;
	arguments: PkAsBfBls12381Arguments | [s: RawTransactionArgument<string>];
}
export function pkAsBfBls12381(options: PkAsBfBls12381Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'pk_as_bf_bls12381',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateArguments {
	s: RawTransactionArgument<string>;
	url: RawTransactionArgument<string>;
}
export interface UpdateOptions {
	package: string;
	arguments:
		| UpdateArguments
		| [s: RawTransactionArgument<string>, url: RawTransactionArgument<string>];
}
export function update(options: UpdateOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['s', 'url'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'key_server',
			function: 'update',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
