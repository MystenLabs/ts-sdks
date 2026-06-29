/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const commit: (a: bigint, b: number, c: number) => [number, number, number, number];
export const decrypt: (a: number, b: number, c: number, d: number, e: any) => [number, number, number];
export const encrypt: (a: number, b: number, c: number) => [number, number, number];
export const generate_private_key: () => [number, number, number, number];
export const pk_from_sk: (a: number, b: number) => [number, number, number, number];
export const precompute_dlog_table: () => [number, number, number];
export const prove: (a: bigint, b: number, c: number, d: number) => [number, number, number, number];
export const verify: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
export const rustsecp256k1_v0_8_1_context_create: (a: number) => number;
export const rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
export const rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
export const rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_start: () => void;
