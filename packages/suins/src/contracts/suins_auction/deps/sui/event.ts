/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Events module. Defines the `sui::event::emit` function which creates and sends a
 * custom MoveEvent as a part of the effects certificate of the transaction.
 *
 * Every MoveEvent has the following properties:
 *
 * - sender
 * - type signature (`T`)
 * - event data (the value of `T`)
 * - timestamp (local to a node)
 * - transaction digest
 *
 * Example:
 *
 * ```
 * module my::marketplace {
 *    use sui::event;
 *    /* ... *\/
 *    struct ItemPurchased has copy, drop {
 *      item_id: ID, buyer: address
 *    }
 *    entry fun buy(/* .... *\/) {
 *       /* ... *\/
 *       event::emit(ItemPurchased { item_id: ..., buyer: .... })
 *    }
 * }
 * ```
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
import { type BcsType } from '@mysten/sui/bcs';
export interface EmitArguments<T extends BcsType<any>> {
	event: RawTransactionArgument<T>;
}
export interface EmitOptions<T extends BcsType<any>> {
	package: string;
	arguments: EmitArguments<T> | [event: RawTransactionArgument<T>];
	typeArguments: [string];
}
/**
 * Emit a custom Move event, sending the data offchain.
 *
 * Used for creating custom indexes and tracking onchain activity in a way that
 * suits a specific application the most.
 *
 * The type `T` is the main way to index the event, and can contain phantom
 * parameters, eg `emit(MyEvent<phantom T>)`.
 */
export function emit<T extends BcsType<any>>(options: EmitOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['event'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'event',
			function: 'emit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface EmitAuthenticatedArguments<T extends BcsType<any>> {
	event: RawTransactionArgument<T>;
}
export interface EmitAuthenticatedOptions<T extends BcsType<any>> {
	package: string;
	arguments: EmitAuthenticatedArguments<T> | [event: RawTransactionArgument<T>];
	typeArguments: [string];
}
/**
 * Emits a custom Move event which can be authenticated by a light client.
 *
 * This method emits the authenticated event to the event stream for the Move
 * package that defines the event type `T`. Only the package that defines the type
 * `T` can emit authenticated events to this stream.
 */
export function emitAuthenticated<T extends BcsType<any>>(options: EmitAuthenticatedOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['event'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'event',
			function: 'emit_authenticated',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
