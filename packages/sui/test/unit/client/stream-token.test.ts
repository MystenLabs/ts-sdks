// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/utils';
import { describe, expect, it } from 'vitest';

import { decodeToken, encodeToken, type StreamToken } from '../../../src/client/stream-token.js';

const token: StreamToken = {
	transport: 'grpc',
	family: 'events',
	chain: 'test-chain',
	filter: toBase64(new Uint8Array(32)),
	order: 'ascending',
	position: {
		cursor: toBase64(new Uint8Array([255, 0, 128, 1])),
		checkpoint: '123',
		coveredCheckpoint: '122',
		checkpointBoundary: '123',
		transactionIndex: '18446744073709551615',
		eventIndex: 4294967295,
	},
	range: { follow: true, reason: 'indexedTip' },
};

describe('stream resume token codec', () => {
	it('preserves opaque gRPC cursor bytes and recovery coordinates', () => {
		expect(decodeToken(encodeToken(token))).toEqual(token);
	});

	it.each(['genesis', 'checkpoint:18446744073709551615'])(
		'preserves the SDK-owned %s cursor',
		(cursor) => {
			const input = { ...token, position: { cursor } };
			expect(decodeToken(encodeToken(input))).toEqual(input);
		},
	);

	it('preserves arbitrary GraphQL cursors and public recovery metadata', () => {
		const input: StreamToken = {
			...token,
			transport: 'graphql',
			position: {
				cursor: 'cursor:v5/opaque?value=λ',
				checkpoint: '123',
				indexedCheckpoint: '120',
				itemId: 'digest:7',
			},
			range: {
				follow: false,
				reason: 'cursorBound',
				end: { position: { cursor: 'end/opaque', checkpoint: '124', itemId: 'digest:9' } },
			},
		};
		expect(decodeToken(encodeToken(input))).toEqual(input);
	});

	it.each<StreamToken['range']>([
		{ follow: false, reason: 'checkpointBound', end: { checkpoint: '18446744073709551616' } },
		{ follow: false, reason: 'genesis', capturedTip: '500' },
		{
			follow: false,
			reason: 'indexedTip',
			capturedTip: '18446744073709551615',
			end: { checkpoint: '18446744073709551616' },
		},
	])('preserves finite range $reason', (range) => {
		const input = { ...token, range };
		expect(decodeToken(encodeToken(input))).toEqual(input);
	});

	it('rejects truncated, trailing, and unknown-version BCS data', () => {
		const bytes = fromBase64(encodeToken(token).slice('sui-stream:'.length));
		const unknownVersion = bytes.slice();
		unknownVersion[0] = 1;
		for (const malformed of [bytes.slice(0, -1), new Uint8Array([...bytes, 0]), unknownVersion]) {
			expect(() => decodeToken(`sui-stream:${toBase64(malformed)}`)).toThrow(
				'Invalid or unsupported stream resume token',
			);
		}
	});

	it('rejects boundaries outside the supported checkpoint range', () => {
		expect(() =>
			encodeToken({
				...token,
				position: { ...token.position, checkpointBoundary: '18446744073709551617' },
			}),
		).toThrow();
	});
});
