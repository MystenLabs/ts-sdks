// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/utils';
import { describe, expect, it } from 'vitest';

import {
	boundaryPosition,
	itemPosition,
	progressPosition,
} from '../../../../src/client/stream/position.js';
import {
	decodeToken,
	encodeToken,
	filterHash,
	type StreamToken,
} from '../../../../src/client/stream/token.js';

const PREFIX = 'sui-stream:';
const token: StreamToken = {
	transport: 'grpc',
	family: 'events',
	chain: 'test-chain',
	filter: filterHash({ sender: '0x1' }),
	order: 'ascending',
	position: boundaryPosition(123n, {
		cursor: new Uint8Array([255, 0, 128, 1]),
		transactionIndex: 2n,
		eventIndex: 0,
		nextUncovered: 123n,
	}),
};

function expectInvalid(value: string) {
	expect(() => decodeToken(value)).toThrow(
		expect.objectContaining({ name: 'SuiStreamError', code: 'InvalidToken' }),
	);
}

describe('resume tokens', () => {
	it.each<[string, Partial<StreamToken>]>([
		['a boundary inside a checkpoint', {}],
		['an item', { position: itemPosition(7n, { cursor: new Uint8Array([1]), itemId: 'a' }) }],
		[
			'GraphQL progress, descending',
			{
				transport: 'graphql',
				order: 'descending',
				position: progressPosition(new Uint8Array([255, 0, 128, 1])),
			},
		],
		['the largest checkpoint', { position: boundaryPosition((1n << 64n) - 1n) }],
	])('round-trips %s', (_, overrides) => {
		const input = { ...token, ...overrides };
		expect(decodeToken(encodeToken(input))).toEqual(input);
	});

	it('rejects strings this SDK would not produce', () => {
		const encoded = encodeToken(token);
		const bytes = fromBase64(encoded.slice(PREFIX.length));
		expectInvalid('');
		expectInvalid(encoded.slice(PREFIX.length));
		expectInvalid(PREFIX + 'not base64!');
		expectInvalid(PREFIX + toBase64(bytes.slice(0, -1)));
		expectInvalid(PREFIX + toBase64(new Uint8Array([...bytes, 0])));
		expectInvalid(PREFIX + toBase64(new Uint8Array([9, ...bytes.slice(1)])));
	});

	it('hashes filters independently of key order and undefined fields', () => {
		expect(filterHash({ a: 1, b: { c: 2n } })).toEqual(
			filterHash({ b: { c: 2n, d: undefined }, a: 1 }),
		);
		expect(filterHash({ a: 1 })).not.toEqual(filterHash({ a: 2 }));
	});
});
