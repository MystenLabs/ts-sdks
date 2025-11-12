/* tslint:disable */
/* eslint-disable */
export function bls12381_min_pk_verify(signature: Uint8Array, public_key: Uint8Array, msg: Uint8Array): boolean;
/**
 * Aggregate a list of signatures.
 * The signatures must be of the type Vec<Vec<u8>> with each signature being a 96 bytes long serialized signature.
 */
export function bls12381_min_pk_aggregate(signatures: any): Uint8Array;
/**
 * Verify an aggregate signature.
 */
export function bls12381_min_pk_verify_aggregate(public_keys: any, msg: Uint8Array, signature: Uint8Array): boolean;
export class BlobEncoder {
  free(): void;
  [Symbol.dispose](): void;
  constructor(n_shards: number);
  /**
   * Encode data and write BCS-encoded SliverData directly into pre-allocated buffers.
   *
   * Arguments:
   * - data: Input data to encode
   * - primary_buffers: Array of Uint8Array buffers (one per shard) for primary slivers
   * - secondary_buffers: Array of Uint8Array buffers (one per shard) for secondary slivers
   *
   * Each buffer will be written with BCS-encoded SliverData.
   *
   * Returns: JsValue with (metadata, root_hash)
   */
  encode(data: Uint8Array, primary_buffers: Array<any>, secondary_buffers: Array<any>): any;
  /**
   * Compute metadata for data without encoding it.
   * Returns (metadata, root_hash)
   */
  compute_metadata(data: Uint8Array): any;
  /**
   * Decode blob from BCS-encoded SliverData buffers.
   *
   * Arguments:
   * - blob_id: The blob identifier
   * - blob_size: The original unencoded blob size in bytes
   * - bcs_buffers: Vec<Uint8Array>, each containing BCS-encoded SliverData<Primary>
   * - output_buffer: Uint8Array to write decoded data into (must be exactly blob_size bytes)
   */
  decode(blob_id: any, blob_size: bigint, bcs_buffers: Uint8Array[], output_buffer: Uint8Array): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_blobencoder_free: (a: number, b: number) => void;
  readonly blobencoder_new: (a: number) => [number, number, number];
  readonly blobencoder_encode: (a: number, b: any, c: any, d: any) => [number, number, number];
  readonly blobencoder_compute_metadata: (a: number, b: any) => [number, number, number];
  readonly blobencoder_decode: (a: number, b: any, c: bigint, d: number, e: number, f: any) => [number, number];
  readonly bls12381_min_pk_verify: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
  readonly bls12381_min_pk_aggregate: (a: any) => [number, number, number, number];
  readonly bls12381_min_pk_verify_aggregate: (a: any, b: number, c: number, d: number, e: number) => [number, number, number];
  readonly rustsecp256k1_v0_8_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
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
