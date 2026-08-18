/* tslint:disable */
/* eslint-disable */
/**
 * Convenience method to analyze the constant pool; returns all constants in order
 * with their type and BCS value.
 *
 * ```javascript
 * import * as template from '@mysten/move-binary-template';
 *
 * let consts = template.get_constants(binary);
 * ```
 */
export function get_constants(binary: Uint8Array): any;
/**
 * Deserialize the `Uint8Array`` bytecode into a JSON object.
 * The JSON object contains the ABI (Application Binary Interface) of the module.
 *
 * ```javascript
 * import * as template from '@mysten/move-binary-template';
 *
 * const json = template.deserialize( binary );
 * console.log( json, json.identifiers );
 * ```
 */
export function deserialize(binary: Uint8Array): any;
/**
 * Serialize the JSON module into a `Uint8Array` (bytecode).
 */
export function serialize(json_module: any): Uint8Array;
/**
 * Updates a constant in the constant pool. Because constants don't have names,
 * the only way to identify them is by their type and value.
 *
 * The value of a constant is BCS-encoded and the type is a string representation
 * of the `SignatureToken` enum. String identifier for `SignatureToken` is a
 * capitalized version of the type: U8, Address, Vector(Bool), Vector(U8), etc.
 *
 * ```javascript
 * import * as template from '@mysten/move-binary-template';
 * import { bcs } from '@mysten/bcs';
 *
 * let binary = template.update_constants(
 *     binary, // Uint8Array
 *     bcs.u64().serialize(0).toBytes(),      // new value
 *     bcs.u64().serialize(100000).toBytes(), // old value
 *     'U64'                                  // type
 * );
 * ```
 */
export function update_constants(binary: Uint8Array, new_value: Uint8Array, expected_value: Uint8Array, expected_type: string): Uint8Array;
/**
 * Get the version of the crate (useful for testing the package).
 */
export function version(): string;
/**
 * Update the identifiers in the module bytecode, given a map of old -> new identifiers.
 * Returns the updated bytecode.
 *
 * ```javascript
 * import * as template from '@mysten/move-binary-template';
 *
 * const updated = template.update_identifiers( binary, {
 *     'TEMPLATE': 'NEW_VALUE',
 *     'template': 'new_value',
 *     'Name':     'NewName'
 * });
 * ```
 */
export function update_identifiers(binary: Uint8Array, map: any): Uint8Array;
/**
 * A transformed constant from the constant pool.
 */
export class Constant {
  private constructor();
  free(): void;
}
