/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as bytes32 from './deps/0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94/bytes32.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::contract_upgrade';
export const ContractUpgraded = new MoveStruct({
	name: `${$moduleName}::ContractUpgraded`,
	fields: {
		old_contract: bcs.Address,
		new_contract: bcs.Address,
	},
});
export const UpgradeContract = new MoveStruct({
	name: `${$moduleName}::UpgradeContract`,
	fields: {
		digest: bytes32.Bytes32,
	},
});
export interface AuthorizeUpgradeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function authorizeUpgrade(options: AuthorizeUpgradeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'contract_upgrade',
			function: 'authorize_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface CommitUpgradeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function commitUpgrade(options: CommitUpgradeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'contract_upgrade',
			function: 'commit_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
