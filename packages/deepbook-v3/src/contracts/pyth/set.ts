/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table.js';
const $moduleName = '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::set';
export const Unit = new MoveStruct({
	name: `${$moduleName}::Unit`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export function Set<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return new MoveStruct({
		name: `${$moduleName}::Set<${typeParameters[0].name as T0['name']}>`,
		fields: {
			keys: bcs.vector(typeParameters[0]),
			elems: table.Table,
		},
	});
}
export interface NewOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'set',
			function: 'new',
			typeArguments: options.typeArguments,
		});
}
export interface AddOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function add<T0 extends BcsType<any>>(options: AddOptions<T0>) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::set::Set<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'set',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function contains<T0 extends BcsType<any>>(options: ContainsOptions<T0>) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::set::Set<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'set',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface EmptyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function empty(options: EmptyOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::set::Set<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'set',
			function: 'empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
