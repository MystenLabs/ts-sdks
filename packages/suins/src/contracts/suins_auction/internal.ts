/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines the `Permit` type, which can be used to constrain the logic of a generic
 * function to be authorized only by the module that defines the type parameter.
 *
 * ```move
 * module example::use_permit;
 *
 * public struct MyType { /* ... *\/ }
 *
 * public fun test_permit() {
 *    let permit = internal::permit<MyType>();
 *    /* external_module::call_with_permit(permit); *\/
 * }
 * ```
 *
 * To write a function that is guarded by a `Permit`, require it as an argument.
 *
 * ```move
 * // Silly mockup of a type registry where a type can be registered only by
 * // the module that defines the type.
 * module example::type_registry;
 *
 * public fun register_type<T>(_: internal::Permit<T> /* ... *\/) {
 *   /* ... *\/
 * }
 * ```
 */

import { MoveTuple } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/auction::internal';
export const Permit = new MoveTuple({
	name: `${$moduleName}::Permit<phantom T>`,
	fields: [bcs.bool()],
});
export interface PermitOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
/**
 * Construct a new `Permit` for the type `T`. Can only be called by the module that
 * defines the type `T`.
 */
export function permit(options: PermitOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'internal',
			function: 'permit',
			typeArguments: options.typeArguments,
		});
}
