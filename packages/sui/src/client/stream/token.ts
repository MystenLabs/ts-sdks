// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { fromBase64 } from '@mysten/utils';
import { blake2b } from '@noble/hashes/blake2.js';

import type { SuiClientTypes } from '../types.js';
import type { StreamFamily, StreamTransport } from './adapter.js';
import { SuiStreamError } from './errors.js';
import { positionSchema, type StreamPosition } from './position.js';

/** Resume token format: `sui-stream:` + base64(BCS envelope). Every enum here is append-only. */
const TOKEN_PREFIX = 'sui-stream:';

const Envelope = bcs.enum('StreamToken', {
	V1: bcs.struct('StreamTokenV1', {
		transport: bcs.enum('StreamTransport', { grpc: null, graphql: null }),
		family: bcs.enum('StreamFamily', { checkpoints: null, transactions: null, events: null }),
		chain: bcs.string(),
		/** blake2b-256 of the canonical resolved filter. */
		filter: bcs.bytes(32),
		order: bcs.enum('StreamOrder', { ascending: null, descending: null }),
		position: positionSchema,
	}),
});

/** A decoded token: the stream it belongs to, and where it resumes. */
export interface StreamToken {
	transport: StreamTransport;
	family: StreamFamily;
	chain: string;
	filter: Uint8Array;
	order: SuiClientTypes.Order;
	position: StreamPosition;
}

export function encodeToken(token: StreamToken): string {
	const envelope = {
		...token,
		transport: { [token.transport]: true } as { grpc: true } | { graphql: true },
		family: { [token.family]: true } as
			{ checkpoints: true } | { transactions: true } | { events: true },
		order: { [token.order]: true } as { ascending: true } | { descending: true },
	};
	return TOKEN_PREFIX + Envelope.serialize({ V1: envelope }).toBase64();
}

/** Rejects anything `encodeToken` would not produce byte for byte. */
export function decodeToken(value: string): StreamToken {
	let token: StreamToken;
	try {
		if (!value.startsWith(TOKEN_PREFIX)) throw new Error('missing prefix');
		const { V1 } = Envelope.parse(fromBase64(value.slice(TOKEN_PREFIX.length)));
		token = {
			transport: V1!.transport.$kind,
			family: V1!.family.$kind,
			chain: V1!.chain,
			filter: Uint8Array.from(V1!.filter),
			order: V1!.order.$kind,
			position: V1!.position,
		};
	} catch (cause) {
		throw invalidToken(cause);
	}
	// Re-encoding rejects trailing bytes and non-canonical BCS or base64.
	if (encodeToken(token) !== value) throw invalidToken();
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
