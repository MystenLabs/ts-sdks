// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs, type InferBcsType } from '@mysten/bcs';
import { fromBase64 } from '@mysten/utils';
import { blake2b } from '@noble/hashes/blake2.js';

import type { SuiClientTypes } from '../types.js';
import type { Coverage, StreamFamily, StreamTransport } from './adapter.js';
import { SuiStreamError } from './errors.js';
import {
	coverageFromBcs,
	coverageToBcs,
	positionSchema,
	validatePosition,
	type StreamPosition,
} from './position.js';

/**
 * Resume token format: `sui-stream:` + base64(BCS envelope). Every enum here is append-only.
 * Positions use the shared encoding, so the envelope can carry any transport's.
 */
const TOKEN_PREFIX = 'sui-stream:';
/** The exclusive end after the largest checkpoint is one more than a u64. */
const MAX_CHECKPOINT_END = 1n << 64n;

const Order = bcs.enum('StreamOrder', { ascending: null, descending: null });
const Envelope = bcs.enum('StreamToken', {
	V1: bcs.struct('StreamTokenV1', {
		transport: bcs.enum('StreamTransport', { grpc: null, graphql: null }),
		family: bcs.enum('StreamFamily', { checkpoints: null, transactions: null, events: null }),
		chain: bcs.string(),
		/** blake2b-256 of the canonical resolved filter. */
		filter: bcs.bytes(32),
		/** Absent when unknown. */
		coverage: bcs.option(bcs.enum('StreamCoverage', { None: null, Through: bcs.u64() })),
		position: positionSchema,
		range: bcs.enum('StreamRange', {
			Follow: null,
			Finite: bcs.struct('FiniteStreamRange', {
				order: Order,
				capturedTip: bcs.option(bcs.u64()),
				end: bcs.enum('StreamEnd', {
					Checkpoint: bcs.u128(),
					Cursor: positionSchema,
					IndexedTip: bcs.u64(),
					Genesis: null,
				}),
			}),
		}),
	}),
});
type EnvelopeV1 = InferBcsType<typeof Envelope>['V1'] & {};

/** Where a finite range ends. `IndexedTip` ends after the captured indexed checkpoint. */
export type RangeEnd =
	| { $kind: 'Checkpoint'; checkpoint: bigint }
	| { $kind: 'Cursor'; position: StreamPosition }
	| { $kind: 'IndexedTip'; checkpoint: bigint }
	| { $kind: 'Genesis' };

export type TokenRange =
	| { $kind: 'Follow' }
	| { $kind: 'Finite'; order: SuiClientTypes.Order; capturedTip?: bigint; end: RangeEnd };

/** A decoded token. */
export interface StreamToken {
	transport: StreamTransport;
	family: StreamFamily;
	chain: string;
	filter: Uint8Array;
	coverage: Coverage;
	position: StreamPosition;
	range: TokenRange;
}

export function encodeToken(token: StreamToken): string {
	return TOKEN_PREFIX + Envelope.serialize({ V1: toEnvelope(token) }).toBase64();
}

/** Rejects anything `encodeToken` would not produce byte for byte. */
export function decodeToken(value: string): StreamToken {
	let token: StreamToken;
	try {
		if (!value.startsWith(TOKEN_PREFIX)) throw new Error('missing prefix');
		const envelope = Envelope.parse(fromBase64(value.slice(TOKEN_PREFIX.length)));
		token = fromEnvelope(envelope.V1!);
	} catch (cause) {
		throw invalidToken(cause);
	}
	// Re-encoding rejects trailing bytes and non-canonical BCS or base64.
	if (encodeToken(token) !== value) throw invalidToken();
	validatePosition(token.position);
	if (token.range.$kind === 'Finite' && token.range.end.$kind === 'Cursor') {
		validatePosition(token.range.end.position);
	}
	return token;
}

export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
	return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

/** Binds tokens to the resolved filter without growing with it. */
export function filterHash(filter: unknown): Uint8Array {
	return blake2b(new TextEncoder().encode(canonical(filter)), { dkLen: 32 });
}

/** JSON with sorted keys, so equal filters hash equally regardless of property order. */
function canonical(value: unknown): string {
	if (value === undefined) return 'null';
	if (typeof value === 'bigint') return JSON.stringify(value.toString());
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value)
			.filter(([, item]) => item !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}

function invalidToken(cause?: unknown) {
	return new SuiStreamError('InvalidToken', 'Invalid or unsupported stream resume token', {
		cause,
	});
}

function toEnvelope(token: StreamToken) {
	return {
		transport: { [token.transport]: true } as { grpc: true } | { graphql: true },
		family: { [token.family]: true } as
			{ checkpoints: true } | { transactions: true } | { events: true },
		chain: token.chain,
		filter: token.filter,
		coverage: coverageToBcs(token.coverage),
		position: token.position,
		range:
			token.range.$kind === 'Follow'
				? { Follow: true as const }
				: {
						Finite: {
							order: { [token.range.order]: true } as { ascending: true } | { descending: true },
							capturedTip: token.range.capturedTip ?? null,
							end: rangeEndToEnvelope(token.range.end),
						},
					},
	};
}

function rangeEndToEnvelope(end: RangeEnd) {
	switch (end.$kind) {
		case 'Checkpoint':
			if (end.checkpoint > MAX_CHECKPOINT_END) throw new Error('Checkpoint end out of range');
			return { Checkpoint: end.checkpoint };
		case 'Cursor':
			return { Cursor: end.position };
		case 'IndexedTip':
			return { IndexedTip: end.checkpoint };
		case 'Genesis':
			return { Genesis: true as const };
	}
}

function fromEnvelope(token: EnvelopeV1): StreamToken {
	return {
		transport: token.transport.$kind,
		family: token.family.$kind,
		chain: token.chain,
		filter: Uint8Array.from(token.filter),
		coverage: coverageFromBcs(token.coverage),
		position: token.position,
		range:
			token.range.$kind === 'Follow' ? { $kind: 'Follow' } : finiteFromEnvelope(token.range.Finite),
	};
}

function finiteFromEnvelope(
	finite: Extract<EnvelopeV1['range'], { $kind: 'Finite' }>['Finite'],
): TokenRange {
	let end: RangeEnd;
	switch (finite.end.$kind) {
		case 'Checkpoint': {
			const checkpoint = BigInt(finite.end.Checkpoint);
			if (checkpoint > MAX_CHECKPOINT_END) throw new Error('checkpoint end out of range');
			end = { $kind: 'Checkpoint', checkpoint };
			break;
		}
		case 'Cursor':
			end = { $kind: 'Cursor', position: finite.end.Cursor };
			break;
		case 'IndexedTip':
			end = { $kind: 'IndexedTip', checkpoint: BigInt(finite.end.IndexedTip) };
			break;
		case 'Genesis':
			end = { $kind: 'Genesis' };
			break;
	}
	return {
		$kind: 'Finite',
		order: finite.order.$kind,
		capturedTip: finite.capturedTip == null ? undefined : BigInt(finite.capturedTip),
		end,
	};
}
