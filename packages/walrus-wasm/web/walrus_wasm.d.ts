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
  constructor(n_shards: number);
  /**
   * WASM wrapper for [walrus_core::encoding::blob_encoding::BlobEncoder::encode_with_metadata].
   * Returns a tuple with a vector of [walrus_core::encoding::slivers::SliverPair]´s and a [walrus_core::metadata::VerifiedBlobMetadataWithId]`.
   */
  encode_with_metadata(data: Uint8Array): any;
  /**
   * WASM wrapper for [walrus_core::encoding::blob_encoding::BlobEncoder::compute_metadata].
   * Returns [walrus_core::metadata::VerifiedBlobMetadataWithId].
   */
  compute_metadata(data: Uint8Array): any;
  /**
   * WASM wrapper for [walrus_core::encoding::blob_encoding::BlobEncoder::decode].
   * The input `slivers` is expected to be a `Vec<SliverData<Primary>>`.
   * Returns `Vec<u8>`.
   */
  decode(blob_id: any, blob_size: bigint, slivers: any): any;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly bls12381_min_pk_verify: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
  readonly bls12381_min_pk_aggregate: (a: any) => [number, number, number, number];
  readonly bls12381_min_pk_verify_aggregate: (a: any, b: number, c: number, d: number, e: number) => [number, number, number];
  readonly __wbg_blobencoder_free: (a: number, b: number) => void;
  readonly blobencoder_new: (a: number) => [number, number, number];
  readonly blobencoder_encode_with_metadata: (a: number, b: number, c: number) => [number, number, number];
  readonly blobencoder_compute_metadata: (a: number, b: number, c: number) => [number, number, number];
  readonly blobencoder_decode: (a: number, b: any, c: bigint, d: any) => [number, number, number];
  readonly rustsecp256k1_v0_8_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
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
