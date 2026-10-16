// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { fromBase64, toBase64 } from '@mysten/utils';
import { describe, expect, it } from 'vitest';

import { SuiStreamError } from '../../../../src/client/stream/errors.js';
import {
	decodePosition,
	decodeToken,
	encodeToken,
	filterHash,
	type StreamToken,
	type TokenRange,
} from '../../../../src/client/stream/token.js';

const PREFIX = 'sui-stream:';
const token: StreamToken = {
	transport: 'grpc',
	family: 'events',
	chain: 'test-chain',
	filter: filterHash({ sender: '0x1' }),
	coverage: { $kind: 'Through', checkpoint: 122n },
	position: new Uint8Array([255, 0, 128, 1]),
	range: { $kind: 'Follow' },
};

const bytesOf = (value: string) => fromBase64(value.slice(PREFIX.length));
const withBytes = (bytes: Uint8Array) => PREFIX + toBase64(bytes);

function expectInvalid(value: string) {
	expect(() => decodeToken(value)).toThrow(
		expect.objectContaining({ name: 'SuiStreamError', code: 'InvalidToken' }),
	);
}

describe('resume token format', () => {
	it.each<[string, Partial<StreamToken>]>([
		['a follow range', {}],
		['GraphQL with unknown coverage', { transport: 'graphql', coverage: { $kind: 'Unknown' } }],
		['coverage before genesis', { coverage: { $kind: 'None' } }],
		['an empty position', { position: new Uint8Array() }],
	])('round-trips %s', (_, overrides) => {
		const input = { ...token, ...overrides };
		expect(decodeToken(encodeToken(input))).toEqual(input);
	});

	it.each<TokenRange<Uint8Array>>([
		{ $kind: 'Finite', order: 'ascending', end: { $kind: 'Checkpoint', checkpoint: 1n << 64n } },
		{ $kind: 'Finite', order: 'descending', capturedTip: 500n, end: { $kind: 'Genesis' } },
		{
			$kind: 'Finite',
			order: 'ascending',
			end: { $kind: 'IndexedTip', checkpoint: (1n << 64n) - 1n },
		},
		{
			$kind: 'Finite',
			order: 'ascending',
			capturedTip: 9n,
			end: { $kind: 'Cursor', position: new Uint8Array([1, 2, 3]) },
		},
	])('round-trips a finite range ending at $end.$kind', (range) => {
		const input = { ...token, range };
		expect(decodeToken(encodeToken(input))).toEqual(input);
	});

	it('keeps token size independent of the filter', () => {
		const small = encodeToken({ ...token, filter: filterHash('x') });
		const large = encodeToken({ ...token, filter: filterHash('x'.repeat(10_000)) });
		expect(large.length).toBe(small.length);
		expect(small.length).toBeLessThan(120);
	});

	it('hashes filters independently of key order and undefined fields', () => {
		expect(filterHash({ a: 1, b: { c: 2n, d: undefined } })).toEqual(
			filterHash({ b: { c: 2n }, a: 1 }),
		);
		expect(filterHash({ a: 1 })).not.toEqual(filterHash({ a: '1' }));
	});

	it('rejects a checkpoint end beyond the exclusive end of the u64 range', () => {
		const range: TokenRange<Uint8Array> = {
			$kind: 'Finite',
			order: 'ascending',
			end: { $kind: 'Checkpoint', checkpoint: (1n << 64n) + 1n },
		};
		expect(() => encodeToken({ ...token, range })).toThrow();
		// The same bytes forged by hand still fail to decode.
		const valid = bytesOf(
			encodeToken({ ...token, range: { ...range, end: { $kind: 'Checkpoint', checkpoint: 1n } } }),
		);
		const forged = valid.slice();
		forged.set(
			bcs
				.u128()
				.serialize((1n << 64n) + 1n)
				.toBytes(),
			valid.length - 16,
		);
		expectInvalid(withBytes(forged));
	});
});

describe('rejecting tokens this SDK did not produce', () => {
	const valid = encodeToken(token);

	it.each([
		['an empty string', ''],
		['a missing prefix', valid.slice(PREFIX.length)],
		['an empty payload', PREFIX],
		['malformed base64', `${PREFIX}%%%`],
		['a truncated payload', withBytes(bytesOf(valid).slice(0, -1))],
		['trailing bytes', withBytes(new Uint8Array([...bytesOf(valid), 0]))],
		['an unknown version', withBytes(new Uint8Array([1, ...bytesOf(valid).slice(1)]))],
		['an unknown transport', withBytes(new Uint8Array([0, 2, ...bytesOf(valid).slice(2)]))],
		['whitespace inside the base64', `${valid.slice(0, 20)}\n${valid.slice(20)}`],
	])('rejects %s', (_, value) => {
		if (value === valid) throw new Error('fixture is not malformed');
		expectInvalid(value);
	});

	it('rejects a finite IndexedTip range missing its checkpoint', () => {
		const finite = encodeToken({
			...token,
			range: {
				$kind: 'Finite',
				order: 'ascending',
				end: { $kind: 'IndexedTip', checkpoint: 500n },
			},
		});
		expectInvalid(withBytes(bytesOf(finite).slice(0, -8)));
	});

	it('rejects position bytes the transport codec would not produce', () => {
		const codec = { schema: bcs.u16(), validate: () => {} };
		expect(decodePosition(codec, new Uint8Array([1, 0]))).toBe(1);
		for (const bytes of [new Uint8Array([1]), new Uint8Array([1, 0, 0])]) {
			expect(() => decodePosition(codec, bytes)).toThrow(SuiStreamError);
		}
	});
});
