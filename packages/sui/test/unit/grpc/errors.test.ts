// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { GrpcStatusCode, SuiGrpcRequestError } from '../../../src/grpc/errors.js';
import { SuiClientError } from '../../../src/client/errors.js';

describe('SuiGrpcRequestError', () => {
	it('extends SuiClientError and Error', () => {
		const err = new SuiGrpcRequestError({ code: 5, message: 'not found', details: [] });
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(SuiClientError);
		expect(err).toBeInstanceOf(SuiGrpcRequestError);
		expect(err.name).toBe('SuiGrpcRequestError');
	});

	it('preserves message, code, and details from google.rpc.Status', () => {
		const err = new SuiGrpcRequestError({
			code: GrpcStatusCode.NOT_FOUND,
			message: 'Object 0x123 does not exist',
			details: [],
		});
		expect(err.message).toBe('Object 0x123 does not exist');
		expect(err.code).toBe(5);
		expect(err.details).toEqual([]);
	});

	it('exposes details array for structured error context', () => {
		const detail = {
			typeUrl: 'type.googleapis.com/google.rpc.BadRequest',
			value: new Uint8Array(),
		};
		const err = new SuiGrpcRequestError({
			code: GrpcStatusCode.INVALID_ARGUMENT,
			message: 'invalid field',
			details: [detail],
		});
		expect(err.details).toHaveLength(1);
		expect(err.details[0]).toBe(detail);
	});

	it('allows branching on specific gRPC status codes', () => {
		const notFound = new SuiGrpcRequestError({ code: 5, message: 'not found', details: [] });
		const permDenied = new SuiGrpcRequestError({
			code: 7,
			message: 'permission denied',
			details: [],
		});

		expect(notFound.code === GrpcStatusCode.NOT_FOUND).toBe(true);
		expect(permDenied.code === GrpcStatusCode.PERMISSION_DENIED).toBe(true);
		expect(notFound.code === GrpcStatusCode.PERMISSION_DENIED).toBe(false);
	});
});

describe('GrpcStatusCode', () => {
	it('exposes common gRPC status codes as named constants', () => {
		expect(GrpcStatusCode.OK).toBe(0);
		expect(GrpcStatusCode.NOT_FOUND).toBe(5);
		expect(GrpcStatusCode.PERMISSION_DENIED).toBe(7);
		expect(GrpcStatusCode.INVALID_ARGUMENT).toBe(3);
		expect(GrpcStatusCode.UNAUTHENTICATED).toBe(16);
	});
});
