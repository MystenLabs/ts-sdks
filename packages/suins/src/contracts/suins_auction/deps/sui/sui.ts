/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Coin<SUI> is the token used to pay for gas in Sui. It has 9 decimals, and the
 * smallest unit (10^-9) is called "mist".
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::sui';
export const SUI = new MoveStruct({
	name: `${$moduleName}::SUI`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface TransferArguments {
	c: RawTransactionArgument<string>;
	recipient: RawTransactionArgument<string>;
}
export interface TransferOptions {
	package: string;
	arguments:
		| TransferArguments
		| [c: RawTransactionArgument<string>, recipient: RawTransactionArgument<string>];
}
export function transfer(options: TransferOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['c', 'recipient'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui',
			function: 'transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
