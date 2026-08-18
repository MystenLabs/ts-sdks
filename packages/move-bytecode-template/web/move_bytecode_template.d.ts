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

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_constant_free: (a: number, b: number) => void;
  readonly deserialize: (a: number, b: number) => [number, number, number];
  readonly get_constants: (a: number, b: number) => [number, number, number];
  readonly serialize: (a: any) => [number, number, number, number];
  readonly update_constants: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
  readonly update_identifiers: (a: number, b: number, c: any) => [number, number, number, number];
  readonly version: () => [number, number];
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_4: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
