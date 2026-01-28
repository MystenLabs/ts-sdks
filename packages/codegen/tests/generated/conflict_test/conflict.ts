/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Test module with struct/enum names that conflict with all SDK imports */

import {
	MoveStruct as MoveStruct_1,
	MoveEnum as MoveEnum_1,
	normalizeMoveArguments as normalizeMoveArguments_1,
	type RawTransactionArgument as RawTransactionArgument_1,
} from '../utils/index.js';
import { bcs as bcs_1, type BcsType as BcsType_1 } from '@mysten/sui/bcs';
import { type Transaction as Transaction_1 } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/conflict_test::conflict';
export const Transaction = new MoveStruct_1({
	name: `${$moduleName}::Transaction`,
	fields: {
		value: bcs_1.u64(),
	},
});
export const BcsType = new MoveStruct_1({
	name: `${$moduleName}::BcsType`,
	fields: {
		data: bcs_1.vector(bcs_1.u8()),
	},
});
export const MoveStruct = new MoveStruct_1({
	name: `${$moduleName}::MoveStruct`,
	fields: {
		field: bcs_1.u64(),
	},
});
export const MoveTuple = new MoveStruct_1({
	name: `${$moduleName}::MoveTuple`,
	fields: {
		a: bcs_1.u64(),
		b: bcs_1.u64(),
	},
});
export const RawTransactionArgument = new MoveStruct_1({
	name: `${$moduleName}::RawTransactionArgument`,
	fields: {
		arg: bcs_1.u64(),
	},
});
export function GenericStruct<T extends BcsType_1<any>>(...typeParameters: [T]) {
	return new MoveStruct_1({
		name: `${$moduleName}::GenericStruct<${typeParameters[0].name as T['name']}>`,
		fields: {
			inner: typeParameters[0],
		},
	});
}
export const MoveEnum = new MoveEnum_1({
	name: `${$moduleName}::MoveEnum`,
	fields: {
		VariantA: null,
		VariantB: new MoveStruct_1({
			name: `MoveEnum.VariantB`,
			fields: {
				value: bcs_1.u64(),
			},
		}),
	},
});
export function GenericEnum<T extends BcsType_1<any>>(...typeParameters: [T]) {
	return new MoveEnum_1({
		name: `${$moduleName}::GenericEnum<${typeParameters[0].name as T['name']}>`,
		fields: {
			Some: new MoveStruct_1({
				name: `GenericEnum.Some`,
				fields: {
					value: typeParameters[0],
				},
			}),
			None: null,
		},
	});
}
export interface CreateTransactionArguments {
	value: RawTransactionArgument_1<number | bigint>;
}
export interface CreateTransactionOptions {
	package?: string;
	arguments: CreateTransactionArguments | [value: RawTransactionArgument_1<number | bigint>];
}
export function createTransaction(options: CreateTransactionOptions) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = ['u64'] satisfies string[];
	const parameterNames = ['value'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'create_transaction',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateBcsTypeArguments {
	data: RawTransactionArgument_1<number[]>;
}
export interface CreateBcsTypeOptions {
	package?: string;
	arguments: CreateBcsTypeArguments | [data: RawTransactionArgument_1<number[]>];
}
export function createBcsType(options: CreateBcsTypeOptions) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = ['vector<u8>'] satisfies string[];
	const parameterNames = ['data'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'create_bcs_type',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateMoveStructArguments {
	field: RawTransactionArgument_1<number | bigint>;
}
export interface CreateMoveStructOptions {
	package?: string;
	arguments: CreateMoveStructArguments | [field: RawTransactionArgument_1<number | bigint>];
}
export function createMoveStruct(options: CreateMoveStructOptions) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = ['u64'] satisfies string[];
	const parameterNames = ['field'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'create_move_struct',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateMoveTupleArguments {
	a: RawTransactionArgument_1<number | bigint>;
	b: RawTransactionArgument_1<number | bigint>;
}
export interface CreateMoveTupleOptions {
	package?: string;
	arguments:
		| CreateMoveTupleArguments
		| [a: RawTransactionArgument_1<number | bigint>, b: RawTransactionArgument_1<number | bigint>];
}
export function createMoveTuple(options: CreateMoveTupleOptions) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = ['u64', 'u64'] satisfies string[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'create_move_tuple',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetTransactionValueArguments {
	tx: RawTransactionArgument_1<string>;
}
export interface GetTransactionValueOptions {
	package?: string;
	arguments: GetTransactionValueArguments | [tx: RawTransactionArgument_1<string>];
}
export function getTransactionValue(options: GetTransactionValueOptions) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = [`${packageAddress}::conflict::Transaction`] satisfies string[];
	const parameterNames = ['tx'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'get_transaction_value',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateRawTxArgArguments {
	arg: RawTransactionArgument_1<number | bigint>;
}
export interface CreateRawTxArgOptions {
	package?: string;
	arguments: CreateRawTxArgArguments | [arg: RawTransactionArgument_1<number | bigint>];
}
export function createRawTxArg(options: CreateRawTxArgOptions) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = ['u64'] satisfies string[];
	const parameterNames = ['arg'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'create_raw_tx_arg',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WrapInGenericArguments<T extends BcsType_1<any>> {
	item: RawTransactionArgument_1<T>;
}
export interface WrapInGenericOptions<T extends BcsType_1<any>> {
	package?: string;
	arguments: WrapInGenericArguments<T> | [item: RawTransactionArgument_1<T>];
	typeArguments: [string];
}
export function wrapInGeneric<T extends BcsType_1<any>>(options: WrapInGenericOptions<T>) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies string[];
	const parameterNames = ['item'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'wrap_in_generic',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BcsArguments {
	value: RawTransactionArgument_1<number | bigint>;
}
export interface BcsOptions {
	package?: string;
	arguments: BcsArguments | [value: RawTransactionArgument_1<number | bigint>];
}
export function bcs(options: BcsOptions) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = ['u64'] satisfies string[];
	const parameterNames = ['value'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'bcs',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NormalizeMoveArgumentsArguments {
	value: RawTransactionArgument_1<number | bigint>;
}
export interface NormalizeMoveArgumentsOptions {
	package?: string;
	arguments: NormalizeMoveArgumentsArguments | [value: RawTransactionArgument_1<number | bigint>];
}
export function normalizeMoveArguments(options: NormalizeMoveArgumentsOptions) {
	const packageAddress = options.package ?? '@local-pkg/conflict_test';
	const argumentsTypes = ['u64'] satisfies string[];
	const parameterNames = ['value'];
	return (tx: Transaction_1) =>
		tx.moveCall({
			package: packageAddress,
			module: 'conflict',
			function: 'normalize_move_arguments',
			arguments: normalizeMoveArguments_1(options.arguments, argumentsTypes, parameterNames),
		});
}
