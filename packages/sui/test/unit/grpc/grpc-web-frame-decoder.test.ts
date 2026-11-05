// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it } from 'vitest';

import { GrpcWebFrameDecoder } from '../../../src/grpc/grpc-web-pull.js';
import type { GrpcWebResponseFrame } from '../../../src/grpc/grpc-web-pull.js';
import { isNonRetryable } from '../../../src/grpc/pull-call.js';

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
const okTrailer = { type: 'trailer', status: { code: 'OK', detail: 'OK' }, meta: {} };

/** Feeds `body` in chunks of `size` bytes, draining frames after each. */
function decode(body: Uint8Array, size = body.length, max = 1024): GrpcWebResponseFrame[] {
	const decoder = new GrpcWebFrameDecoder(max);
	const out: GrpcWebResponseFrame[] = [];
	for (let i = 0; i < body.length; i += size) {
		decoder.push(body.subarray(i, i + size));
		for (let f = decoder.next(); f; f = decoder.next()) out.push(f);
	}
	expect(decoder.buffered).toBe(0);
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

describe('GrpcWebFrameDecoder', () => {
	it.each([1, 2, 3, 5, 7, 100])('splits frames across %i-byte chunks', (size) => {
		const body = new Uint8Array([...data(1, 2, 3), ...data(), ...data(4), ...ok]);
		expect(decode(body, size)).toEqual([
			{ type: 'data', data: new Uint8Array([1, 2, 3]) },
			{ type: 'data', data: new Uint8Array([]) },
			{ type: 'data', data: new Uint8Array([4]) },
			okTrailer,
		]);
	});

	it('decodes an error trailer with metadata', () => {
		expect(decode(trailer('grpc-status:14\r\ngrpc-message:try%20again\r\nx-retry:1\r\n'))).toEqual([
			{
				type: 'trailer',
				status: { code: 'UNAVAILABLE', detail: 'try%20again' },
				meta: { 'x-retry': '1' },
			},
		]);
	});

	it('rejects a frame over the limit once its prefix arrives, as non-retryable', () => {
		const decoder = new GrpcWebFrameDecoder(4);
		decoder.push(data(1, 2, 3, 4, 5).subarray(0, 5));
		const error = failure(() => decoder.next());
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
		expect(error.message).toBe('grpc-web frame of 5 bytes exceeds the 4 byte limit');
		expect(isNonRetryable(error)).toBe(true);
		expect(decode(data(1, 2, 3, 4), undefined, 4)).toHaveLength(1);
	});

	it.each([
		['a compressed frame', 1],
		['an unknown frame type', 2],
	])('rejects %s', (_, flag) => {
		const decoder = new GrpcWebFrameDecoder(1024);
		decoder.push(frame(flag, new Uint8Array([1])));
		const error = failure(() => decoder.next());
		expect(error.code).toBe('INTERNAL');
		expect(isNonRetryable(error)).toBe(false);
	});
});
