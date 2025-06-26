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
/** Get the total supply of the WAL token. */
export function total_supply(options: {
	package?: string;
	arguments:
		| [treasury: RawTransactionArgument<string>]
		| {
				treasury: RawTransactionArgument<string>;
		  };
}) {
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
/** Burns a `Coin<WAL>` from the sender. */
export function burn(options: {
	package?: string;
	arguments:
		| [treasury: RawTransactionArgument<string>, coin: RawTransactionArgument<string>]
		| {
				treasury: RawTransactionArgument<string>;
				coin: RawTransactionArgument<string>;
		  };
}) {
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
