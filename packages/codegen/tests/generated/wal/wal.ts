/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** The WAL token is the native token for the Walrus Protocol. */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function WAL() {
	return bcs.struct('WAL', {
		dummy_field: bcs.bool(),
	});
}
export function ProtectedTreasury() {
	return bcs.struct('ProtectedTreasury', {
		id: object.UID(),
	});
}
export function TreasuryCapKey() {
	return bcs.struct('TreasuryCapKey', {
		dummy_field: bcs.bool(),
	});
}
export interface TotalSupplyArguments {
	treasury: RawTransactionArgument<string>;
}
export interface TotalSupplyOptions {
	package?: string;
	arguments: TotalSupplyArguments | [treasury: RawTransactionArgument<string>];
}
/** Get the total supply of the WAL token. */
export function totalSupply(options: TotalSupplyOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal';
	const argumentsTypes = [`${packageAddress}::wal::ProtectedTreasury`] satisfies string[];
	const parameterNames = ['treasury'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal',
			function: 'total_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnArguments {
	treasury: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface BurnOptions {
	package?: string;
	arguments:
		| BurnArguments
		| [treasury: RawTransactionArgument<string>, coin: RawTransactionArgument<string>];
}
/** Burns a `Coin<WAL>` from the sender. */
export function burn(options: BurnOptions) {
	const packageAddress = options.package ?? '@local-pkg/wal';
	const argumentsTypes = [
		`${packageAddress}::wal::ProtectedTreasury`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['treasury', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'wal',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
