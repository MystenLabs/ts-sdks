/* tslint:disable */
/* eslint-disable */
export function prove(value: bigint, blinding: Uint8Array, range: number): Uint8Array;
export function commit(value: bigint, blinding: Uint8Array): Uint8Array;
export function verify(proof_bytes: Uint8Array, commitment_bytes: Uint8Array, range: number): boolean;
