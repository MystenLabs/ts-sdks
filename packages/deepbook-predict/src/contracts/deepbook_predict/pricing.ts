/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pricing for Predict markets.
 *
 * This module is the app-facing read layer for oracle data. It reads the
 * standalone propbook Pyth and Block Scholes feeds on demand and computes SVI
 * range prices. It does not mutate feed, pool, expiry, or position state, and it
 * owns the live pricing boundary: current Propbook feed binding, pre-expiry market
 * liveness, feed freshness, and Predict's pricing-safe BS input envelope.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as block_scholes_svi_feed from './deps/propbook/block_scholes_svi_feed.js';
const $moduleName = '@local-pkg/deepbook_predict::pricing';
export const Pricer = new MoveStruct({
	name: `${$moduleName}::Pricer`,
	fields: {
		/** Expiry market this snapshot was loaded for. */
		expiry_market_id: bcs.Address,
		forward: bcs.u64(),
		svi: block_scholes_svi_feed.SVIParams,
	},
});
export interface ExpiryMarketIdArguments {
	pricer: RawTransactionArgument<string>;
}
export interface ExpiryMarketIdOptions {
	package?: string;
	arguments: ExpiryMarketIdArguments | [pricer: RawTransactionArgument<string>];
}
/** Return the expiry market this pricer was loaded for. */
export function expiryMarketId(options: ExpiryMarketIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pricer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pricing',
			function: 'expiry_market_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
