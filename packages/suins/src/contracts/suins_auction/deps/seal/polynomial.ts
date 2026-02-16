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
const $moduleName = 'seal::polynomial';
export const Polynomial = new MoveStruct({
	name: `${$moduleName}::Polynomial`,
	fields: {
		coefficients: bcs.vector(bcs.u8()),
	},
});
export interface EvaluateArguments {
	p: RawTransactionArgument<string>;
	x: RawTransactionArgument<number>;
}
export interface EvaluateOptions {
	package: string;
	arguments:
		| EvaluateArguments
		| [p: RawTransactionArgument<string>, x: RawTransactionArgument<number>];
}
/** Evaluate a polynomial at a given point. */
export function evaluate(options: EvaluateOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u8'] satisfies (string | null)[];
	const parameterNames = ['p', 'x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'polynomial',
			function: 'evaluate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
