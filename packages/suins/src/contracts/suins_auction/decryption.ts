/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface GetEncryptionIdArguments {
	startTime: RawTransactionArgument<number | bigint>;
	domainName: RawTransactionArgument<number[]>;
}
export interface GetEncryptionIdOptions {
	package?: string;
	arguments:
		| GetEncryptionIdArguments
		| [
				startTime: RawTransactionArgument<number | bigint>,
				domainName: RawTransactionArgument<number[]>,
		  ];
}
export function getEncryptionId(options: GetEncryptionIdOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u64', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['startTime', 'domainName'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'decryption',
			function: 'get_encryption_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
