// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it } from 'vitest';

import { GrpcWebFrameDecoder } from '../../../src/grpc/grpc-web-pull.js';
import type { GrpcWebResponseFrame } from '../../../src/grpc/grpc-web-pull.js';
import { isNonRetryable } from '../../../src/grpc/pull-call.js';

const BINARY = 'application/grpc-web+proto';
const TEXT = 'application/grpc-web-text';

function frame(flag: number, payload: Uint8Array): Uint8Array {
	const out = new Uint8Array(5 + payload.length);
	out[0] = flag;
	new DataView(out.buffer).setUint32(1, payload.length);
	out.set(payload, 5);
	return out;
}

const data = (...bytes: number[]) => frame(0, new Uint8Array(bytes));
const trailer = (text: string) => frame(0x80, new TextEncoder().encode(text));
const ok = trailer('grpc-status:0\r\n');

function concat(parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}

/** Cuts `bytes` into chunks of `size` bytes. */
function chunks(bytes: Uint8Array, size: number): Uint8Array[] {
	const out: Uint8Array[] = [];
	for (let i = 0; i < bytes.length; i += size) out.push(bytes.subarray(i, i + size));
	return out;
}

const base64 = (bytes: Uint8Array) =>
	new TextEncoder().encode(Buffer.from(bytes).toString('base64'));

/** Feeds `input` one chunk at a time, draining frames after each, then ends the body. */
function decode(
	input: Uint8Array[],
	{ contentType = BINARY, max = 1024 } = {},
): GrpcWebResponseFrame[] {
	const decoder = new GrpcWebFrameDecoder(contentType, max);
	const out: GrpcWebResponseFrame[] = [];
	for (const chunk of input) {
		decoder.push(chunk);
		for (let f = decoder.next(); f; f = decoder.next()) out.push(f);
	}
	decoder.end();
	return out;
}

function failure(run: () => unknown): RpcError {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(RpcError);
		return error as RpcError;
	}
	throw new Error('expected an error');
}

const okTrailer = { type: 'trailer', status: { code: 'OK', detail: 'OK' }, meta: {} };

describe('GrpcWebFrameDecoder', () => {
	const body = concat([data(1, 2, 3), data(), data(4), ok]);
	const expected = [
		{ type: 'data', data: new Uint8Array([1, 2, 3]) },
		{ type: 'data', data: new Uint8Array([]) },
		{ type: 'data', data: new Uint8Array([4]) },
		okTrailer,
	];

	it.each([1, 2, 3, 5, 7, body.length])('splits binary frames across %i-byte chunks', (size) => {
		expect(decode(chunks(body, size))).toEqual(expected);
	});

	it.each([1, 3, 4, 5, 997])('carries partial base64 quanta across %i-byte chunks', (size) => {
		expect(decode(chunks(base64(body), size), { contentType: TEXT })).toEqual(expected);
	});

	it('drains thousands of buffered one-byte chunks in order', () => {
		const frames = Array.from({ length: 600 }, (_, i) => data(i % 256, 7));
		const decoder = new GrpcWebFrameDecoder(BINARY, 1024);
		for (const chunk of chunks(concat([...frames, ok]), 1)) decoder.push(chunk);
		const out: GrpcWebResponseFrame[] = [];
		for (let f = decoder.next(); f; f = decoder.next()) out.push(f);
		decoder.end();
		expect(out.slice(0, -1)).toEqual(
			frames.map((_, i) => ({ type: 'data', data: new Uint8Array([i % 256, 7]) })),
		);
		expect(out.at(-1)).toEqual(okTrailer);
	});

	it('decodes text bodies that pad every frame separately', () => {
		const padded = concat([base64(data(1)), base64(data(2, 3)), base64(ok)]);
		expect(decode(chunks(padded, 3), { contentType: TEXT })).toEqual([
			{ type: 'data', data: new Uint8Array([1]) },
			{ type: 'data', data: new Uint8Array([2, 3]) },
			okTrailer,
		]);
	});

	it('lines up base64 quanta across chunks when the body contains whitespace', () => {
		const text = new TextDecoder().decode(base64(concat([data(42), ok])));
		const spaced = new TextEncoder().encode('\n' + text.replace(/(.{3})/g, '$1\r\n\t '));
		for (const size of [1, 2, 3, 4, 5, 7]) {
			expect(decode(chunks(spaced, size), { contentType: TEXT })).toEqual([
				{ type: 'data', data: new Uint8Array([42]) },
				okTrailer,
			]);
		}
	});

	it('queues decoded text without retaining buffers larger than their bytes', () => {
		const padded = concat([base64(data(1)), base64(data(2, 3))]);
		const spaced = concat([padded, new TextEncoder().encode(' '.repeat(4096))]);
		const decoder = new GrpcWebFrameDecoder(TEXT, 1024);
		decoder.push(spaced);
		for (const expected of [[1], [2, 3]]) {
			const next = decoder.next();
			expect(next).toEqual({ type: 'data', data: new Uint8Array(expected) });
			if (next?.type !== 'data') throw new Error('expected a data frame');
			// Both frames came in one chunk of 6 + 7 bytes.
			expect(next.data.buffer.byteLength).toBe(13);
		}
	});

	it('returns undefined until a frame is complete', () => {
		const decoder = new GrpcWebFrameDecoder(BINARY, 1024);
		decoder.push(data(1, 2).subarray(0, 6));
		expect(decoder.next()).toBeUndefined();
		decoder.push(data(1, 2).subarray(6));
		expect(decoder.next()).toEqual({ type: 'data', data: new Uint8Array([1, 2]) });
		expect(decoder.next()).toBeUndefined();
	});

	it.each([
		['an empty body', [], []],
		['a trailer only', [ok], [okTrailer]],
		[
			'an error trailer with metadata',
			[trailer('grpc-status:14\r\ngrpc-message:try%20again\r\nx-retry:1\r\n')],
			[
				{
					type: 'trailer',
					status: { code: 'UNAVAILABLE', detail: 'try%20again' },
					meta: { 'x-retry': '1' },
				},
			],
		],
		[
			'a malformed trailer status',
			[trailer('grpc-status:banana\r\n')],
			[
				{
					type: 'trailer',
					status: { code: 'INTERNAL', detail: 'invalid grpc-web status' },
					meta: {},
				},
			],
		],
		[
			'a repeated trailer status',
			[trailer('grpc-status:0\r\ngrpc-status:0\r\n')],
			[
				{
					type: 'trailer',
					status: { code: 'INTERNAL', detail: 'invalid grpc-web status' },
					meta: {},
				},
			],
		],
	])('decodes %s', (_, input, frames) => {
		expect(decode(input)).toEqual(frames);
	});

	it('rejects a declared size over the limit once the prefix is buffered, as non-retryable', () => {
		const decoder = new GrpcWebFrameDecoder(BINARY, 4);
		decoder.push(frame(0, new Uint8Array(5)).subarray(0, 5));
		const error = failure(() => decoder.next());
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
		expect(error.message).toBe('grpc-web frame of 5 bytes exceeds the 4 byte limit');
		expect(isNonRetryable(error)).toBe(true);
	});

	it('does not apply the message limit to trailers', () => {
		// A 2-byte message at an 8-byte limit, followed by the standard 15-byte OK trailer.
		expect(decode([data(1, 2), ok], { max: 8 })).toEqual([
			{ type: 'data', data: new Uint8Array([1, 2]) },
			{ type: 'trailer', status: { code: 'OK', detail: 'OK' }, meta: {} },
		]);
	});

	it('bounds trailers by their own limit, as non-retryable', () => {
		const decoder = new GrpcWebFrameDecoder(BINARY, 1024, ok.length - 6);
		decoder.push(ok);
		const error = failure(() => decoder.next());
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
		expect(error.message).toBe(
			`grpc-web trailer of ${ok.length - 5} bytes exceeds the ${ok.length - 6} byte limit`,
		);
		expect(isNonRetryable(error)).toBe(true);
		expect(decode([ok], { max: 0 })).toHaveLength(1);
	});

	it('accepts a frame exactly at the limit', () => {
		expect(
			decode([data(...new Array(ok.length - 5).fill(1)), ok], { max: ok.length - 5 }),
		).toHaveLength(2);
	});

	it.each([
		['a truncated frame', [data(1, 2).subarray(0, 6)], 'DATA_LOSS', 'premature EOF'],
		['a truncated prefix', [data(1).subarray(0, 3)], 'DATA_LOSS', 'premature EOF'],
		['messages without a trailer', [data(1)], 'DATA_LOSS', 'missing trailers'],
		[
			'a compressed frame',
			[frame(1, new Uint8Array([1]))],
			'INTERNAL',
			'compressed grpc-web frames are not supported',
		],
		[
			'an unknown frame type',
			[frame(2, new Uint8Array([1]))],
			'INTERNAL',
			'unknown grpc-web frame 2',
		],
	])('rejects %s', (_, input, code, message) => {
		const error = failure(() => decode(input));
		expect(error.code).toBe(code);
		expect(error.message).toBe(message);
		expect(isNonRetryable(error)).toBe(false);
	});

	it.each([
		['a lone high byte', [0x80]],
		['a UTF-8 sequence', [0xc3, 0x81]],
	])('rejects %s in a text body, whole or split', (_, bytes) => {
		const text = base64(concat([data(1), ok]));
		const body = concat([text.subarray(0, 4), new Uint8Array(bytes), new Uint8Array([65, 65, 65])]);
		for (const size of [1, body.length]) {
			expect(() => decode(chunks(body, size), { contentType: TEXT })).toThrow(
				'invalid base64 string',
			);
		}
	});

	it('rejects leftover base64 characters at EOF', () => {
		const text = base64(concat([data(1), ok]));
		const error = failure(() =>
			decode([text, new TextEncoder().encode('AA')], { contentType: TEXT }),
		);
		expect(error.message).toBe('premature EOF');
	});

	it.each([
		[null, 'missing response content type'],
		['text/html', 'unexpected response content type: text/html'],
	])('rejects the content type %s', (contentType, message) => {
		const error = failure(() => new GrpcWebFrameDecoder(contentType, 1024));
		expect(error.code).toBe('INTERNAL');
		expect(error.message).toBe(message);
	});
});
