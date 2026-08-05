/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Canonical strike-range codec for Predict.
 *
 * Finite strikes are absolute ticks from zero: `strike = tick * tick_size`. Ranges
 * use `(lower_tick, higher_tick)` in entrypoints, events, and order IDs. Tick zero
 * and `pos_inf_tick` are the open lower and upper sentinels. This module owns
 * conversion between those ticks and raw oracle-price coordinates; `order` owns
 * range-shape validation.
 */

import { MoveTuple, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_predict::range_codec';
export const Strike = new MoveTuple({ name: `${$moduleName}::Strike`, fields: [bcs.u64()] });
export interface StrikeFromTickArguments {
	tick: RawTransactionArgument<number | bigint>;
	tickSize: RawTransactionArgument<number | bigint>;
}
export interface StrikeFromTickOptions {
	package?: string;
	arguments:
		| StrikeFromTickArguments
		| [
				tick: RawTransactionArgument<number | bigint>,
				tickSize: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Convert a boundary tick to its raw strike, including the open-end sentinels.
 * Non-sentinel ticks multiply directly by `tick_size`; public PTB and devInspect
 * callers are responsible for supplying the intended market domain.
 */
export function strikeFromTick(options: StrikeFromTickOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['tick', 'tickSize'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'range_codec',
			function: 'strike_from_tick',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
