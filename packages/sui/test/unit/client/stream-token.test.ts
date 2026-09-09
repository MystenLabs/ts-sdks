// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/utils';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { decodeToken, encodeToken, type StreamToken } from '../../../src/client/stream-token.js';

type GrpcToken = Extract<StreamToken['V1'], { $kind: 'grpc' }>['grpc'];
type GraphQLToken = Extract<StreamToken['V1'], { $kind: 'graphql' }>['graphql'];

const payload: GrpcToken = {
	family: { $kind: 'events', events: true },
	chain: 'test-chain',
	filter: new Uint8Array(32),
	order: { $kind: 'ascending', ascending: true },
	position: {
		cursor: toBase64(new Uint8Array([255, 0, 128, 1])),
		checkpoint: '123',
		coveredCheckpoint: '122',
		checkpointBoundary: '123',
		transactionIndex: '18446744073709551615',
		eventIndex: 4294967295,
	},
	range: { capturedTip: null, end: { $kind: 'Follow', Follow: true } },
};

function grpcToken(value: GrpcToken): StreamToken {
	return { $kind: 'V1', V1: { $kind: 'grpc', grpc: value } };
}

const token = grpcToken(payload);

describe('stream resume token codec', () => {
	it('preserves opaque gRPC cursor bytes and recovery coordinates', () => {
		type CursorEnd<T extends GrpcToken | GraphQLToken> = Extract<
			T['range']['end'],
			{ $kind: 'Cursor' }
		>['Cursor'];
		expectTypeOf<CursorEnd<GrpcToken>>().toEqualTypeOf<GrpcToken['position']>();
		expectTypeOf<CursorEnd<GraphQLToken>>().toEqualTypeOf<GraphQLToken['position']>();
		expectTypeOf<Extract<keyof GrpcToken['position'], 'itemId'>>().toEqualTypeOf<never>();
		expectTypeOf<
			Extract<keyof GraphQLToken['position'], 'transactionIndex'>
		>().toEqualTypeOf<never>();

		expect(decodeToken(encodeToken(token))).toEqual(token);
	});

	it.each(['genesis', 'checkpoint:18446744073709551615'])(
		'preserves the SDK-owned %s cursor',
		(cursor) => {
			const input = grpcToken({
				...payload,
				position: {
					cursor,
					checkpoint: null,
					coveredCheckpoint: null,
					checkpointBoundary: null,
					transactionIndex: null,
					eventIndex: null,
				},
			});
			expect(decodeToken(encodeToken(input))).toEqual(input);
		},
	);

	it('preserves arbitrary GraphQL cursors and public recovery metadata', () => {
		const input: StreamToken = {
			$kind: 'V1',
			V1: {
				$kind: 'graphql',
				graphql: {
					...payload,
					position: {
						cursor: 'cursor:v5/opaque?value=λ',
						checkpoint: '123',
						indexedCheckpoint: '120',
						itemId: 'digest:7',
					},
					range: {
						capturedTip: null,
						end: {
							$kind: 'Cursor',
							Cursor: {
								cursor: 'end/opaque',
								checkpoint: '124',
								itemId: 'digest:9',
								indexedCheckpoint: null,
							},
						},
					},
				},
			},
		};
		expect(decodeToken(encodeToken(input))).toEqual(input);
	});

	it.each<GrpcToken['range']>([
		{
			capturedTip: null,
			end: { $kind: 'Checkpoint', Checkpoint: '18446744073709551616' },
		},
		{ capturedTip: '500', end: { $kind: 'Genesis', Genesis: true } },
		{
			capturedTip: '18446744073709551615',
			end: { $kind: 'IndexedTip', IndexedTip: true },
		},
	])('preserves finite range $end.$kind', (range) => {
		const input = grpcToken({ ...payload, range });
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
			encodeToken(
				grpcToken({
					...payload,
					position: { ...payload.position, checkpointBoundary: '18446744073709551617' },
				}),
			),
		).toThrow();
	});
});
