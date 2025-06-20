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
export function init(packageAddress: string) {
	/** Get the total supply of the WAL token. */
	function total_supply(options: { arguments: [treasury: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::wal::ProtectedTreasury`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal',
				function: 'total_supply',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Burns a `Coin<WAL>` from the sender. */
	function burn(options: {
		arguments: [treasury: RawTransactionArgument<string>, coin: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::wal::ProtectedTreasury`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'wal',
				function: 'burn',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { total_supply, burn };
}
