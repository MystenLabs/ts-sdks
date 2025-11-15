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
