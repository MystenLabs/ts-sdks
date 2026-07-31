/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Derives the Block Scholes series id identifying one feed slot. A signed update
 * carries its own series id, so deriving the expected id from the slot's own
 * identity — rather than reading routing fields out of the payload — is what stops
 * a valid update for one series being applied to another: a mismatch finds no slot
 * instead of the wrong one. Block Scholes reproduces this layout when assigning
 * series ids, so a change here is a coordinated break;
 * `tests/block_scholes/block_scholes_sid_tests.move` holds the shared vectors.
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface SpotArguments {
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface SpotOptions {
	package?: string;
	arguments: SpotArguments | [propbookUnderlyingId: RawTransactionArgument<number>];
}
/**
 * Returns the series id of the spot feed for `propbook_underlying_id`. Spot is not
 * expiry-scoped, so its expiry field is zero rather than caller-supplied.
 */
export function spot(options: SpotOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = ['u32'] satisfies (string | null)[];
	const parameterNames = ['propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_sid',
			function: 'spot',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ForwardArguments {
	propbookUnderlyingId: RawTransactionArgument<number>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface ForwardOptions {
	package?: string;
	arguments:
		| ForwardArguments
		| [
				propbookUnderlyingId: RawTransactionArgument<number>,
				expiryMs: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Returns the series id of the forward feed for `propbook_underlying_id` at
 * `expiry_ms`.
 */
export function forward(options: ForwardOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = ['u32', 'u64'] satisfies (string | null)[];
	const parameterNames = ['propbookUnderlyingId', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_sid',
			function: 'forward',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviArguments {
	propbookUnderlyingId: RawTransactionArgument<number>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface SviOptions {
	package?: string;
	arguments:
		| SviArguments
		| [
				propbookUnderlyingId: RawTransactionArgument<number>,
				expiryMs: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Returns the series id of the SVI feed for `propbook_underlying_id` at
 * `expiry_ms`.
 */
export function svi(options: SviOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = ['u32', 'u64'] satisfies (string | null)[];
	const parameterNames = ['propbookUnderlyingId', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_sid',
			function: 'svi',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnderlyingArguments {
	sid: RawTransactionArgument<number | bigint>;
}
export interface UnderlyingOptions {
	package?: string;
	arguments: UnderlyingArguments | [sid: RawTransactionArgument<number | bigint>];
}
/**
 * Returns the underlying a series id was assigned to. Reads derive whole ids
 * rather than decoding them; this exists so a store holding one underlying's
 * series can recognize an id that belongs to another and leave it alone.
 */
export function underlying(options: UnderlyingOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = ['u256'] satisfies (string | null)[];
	const parameterNames = ['sid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_sid',
			function: 'underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
