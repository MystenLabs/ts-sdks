/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Bitcoin UTXO value types shared by the deposit and withdrawal flows. A `UtxoId`
 * identifies an outpoint (txid:vout) and a `Utxo` pairs it with its satoshi amount
 * and an optional derivation path (the Sui address a deposit mints to). The
 * constructors are `public` so PTBs can assemble UTXOs when calling into the
 * bridge; everything else is package-only.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/hashi::utxo';
export const UtxoId = new MoveStruct({
	name: `${$moduleName}::UtxoId`,
	fields: {
		txid: bcs.Address,
		vout: bcs.u32(),
	},
});
export const Utxo = new MoveStruct({
	name: `${$moduleName}::Utxo`,
	fields: {
		id: UtxoId,
		amount: bcs.u64(),
		derivation_path: bcs.option(bcs.Address),
	},
});
export interface UtxoIdArguments {
	txid: RawTransactionArgument<string>;
	vout: RawTransactionArgument<number>;
}
export interface UtxoIdOptions {
	package?: string;
	arguments:
		| UtxoIdArguments
		| [txid: RawTransactionArgument<string>, vout: RawTransactionArgument<number>];
	config?: {
		packageId?: string;
	};
}
export function utxoId(options: UtxoIdOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = ['address', 'u32'] satisfies (string | null)[];
	const parameterNames = ['txid', 'vout'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'utxo',
			function: 'utxo_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UtxoArguments {
	utxoId: TransactionArgument;
	amount: RawTransactionArgument<number | bigint>;
	derivationPath: RawTransactionArgument<string | null>;
}
export interface UtxoOptions {
	package?: string;
	arguments:
		| UtxoArguments
		| [
				utxoId: TransactionArgument,
				amount: RawTransactionArgument<number | bigint>,
				derivationPath: RawTransactionArgument<string | null>,
		  ];
	config?: {
		packageId?: string;
	};
}
export function utxo(options: UtxoOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', '0x1::option::Option<address>'] satisfies (string | null)[];
	const parameterNames = ['utxoId', 'amount', 'derivationPath'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'utxo',
			function: 'utxo',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
