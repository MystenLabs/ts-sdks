/* tslint:disable */
/* eslint-disable */
export function commit(value: bigint, blinding: Uint8Array): Uint8Array;
export function decrypt(secret_key: Uint8Array, ciphertext_bytes: Uint8Array, dlog_table: any): number;
export function generate_private_key(): Uint8Array;
export function encrypt(public_key: Uint8Array, value: number): any;
export function pk_from_sk(sk_bytes: Uint8Array): Uint8Array;
export function precompute_dlog_table(): any;
export function verify(proof_bytes: Uint8Array, commitment_bytes: Uint8Array, range: number): boolean;
export function prove(value: bigint, blinding: Uint8Array, range: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly commit: (a: bigint, b: number, c: number) => [number, number, number, number];
  readonly decrypt: (a: number, b: number, c: number, d: number, e: any) => [number, number, number];
  readonly encrypt: (a: number, b: number, c: number) => [number, number, number];
  readonly generate_private_key: () => [number, number, number, number];
  readonly pk_from_sk: (a: number, b: number) => [number, number, number, number];
  readonly precompute_dlog_table: () => [number, number, number];
  readonly prove: (a: bigint, b: number, c: number, d: number) => [number, number, number, number];
  readonly verify: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
  readonly rustsecp256k1_v0_8_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
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
