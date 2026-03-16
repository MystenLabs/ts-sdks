/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_set from './deps/sui/vec_set.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@mysten/pas::request';
/** A base request type. Examples: `Request<SendFunds<T>>` `Request<UnlockFunds<T>>` */
export function Request<K extends BcsType<any>>(...typeParameters: [K]) {
	return new MoveStruct({
		name: `${$moduleName}::Request<${typeParameters[0].name as K['name']}>`,
		fields: {
			/** The collected approvals for this request */
			approvals: vec_set.VecSet(type_name.TypeName),
			data: typeParameters[0],
		},
	});
}
export interface ApproveArguments<U extends BcsType<any>> {
	request: RawTransactionArgument<string>;
	Approval: RawTransactionArgument<U>;
}
export interface ApproveOptions<U extends BcsType<any>> {
	package?: string;
	arguments:
		| ApproveArguments<U>
		| [request: RawTransactionArgument<string>, Approval: RawTransactionArgument<U>];
	typeArguments: [string, string];
}
/** Adds an approval to a request. Can be called to resolve rules */
export function approve<U extends BcsType<any>>(options: ApproveOptions<U>) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, `${options.typeArguments[1]}`] satisfies (string | null)[];
	const parameterNames = ['request', 'Approval'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'request',
			function: 'approve',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DataArguments {
	request: RawTransactionArgument<string>;
}
export interface DataOptions {
	package?: string;
	arguments: DataArguments | [request: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function data(options: DataOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'request',
			function: 'data',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ApprovalsArguments {
	request: RawTransactionArgument<string>;
}
export interface ApprovalsOptions {
	package?: string;
	arguments: ApprovalsArguments | [request: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function approvals(options: ApprovalsOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'request',
			function: 'approvals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
