/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Provides a way to get address length since it's a platform-specific parameter. */

import { type Transaction } from '@mysten/sui/transactions';
export interface LengthOptions {
	package?: string;
	arguments?: [];
}
/**
 * Should be converted to a native function. Current implementation only works for
 * Sui.
 */
export function length(options: LengthOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'length',
		});
}
