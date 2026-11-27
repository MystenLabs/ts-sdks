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
