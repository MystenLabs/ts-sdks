/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Generic Move and native functions for group operations. */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::group_ops';
export const Element = new MoveStruct({
	name: `${$moduleName}::Element<phantom T>`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
export interface BytesArguments {
	e: RawTransactionArgument<string>;
}
export interface BytesOptions {
	package: string;
	arguments: BytesArguments | [e: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function bytes(options: BytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'group_ops',
			function: 'bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface EqualArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface EqualOptions {
	package: string;
	arguments:
		| EqualArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function equal(options: EqualOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'group_ops',
			function: 'equal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
