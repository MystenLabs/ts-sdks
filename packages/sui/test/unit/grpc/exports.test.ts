import { describe, expect, it } from 'vitest';
import {
	GrpcStatusCode,
	GrpcWebFetchTransport,
	RpcError,
	grpcStatusFromAbortReason,
	hasDecodedStatusMessage,
	markGrpcStatusMessageDecoded,
	normalizeGrpcError,
	supportsServerStreamingIterable,
} from '../../../src/grpc/index.js';

describe('grpc error exports', () => {
	it('narrows and codes a failure without a protobuf-ts import', () => {
		const error: unknown = new RpcError('gone', GrpcStatusCode[GrpcStatusCode.NOT_FOUND]);

		expect(error).toBeInstanceOf(RpcError);
		expect((error as RpcError).code).toBe('NOT_FOUND');
	});

	it('lets another transport code errors as the gRPC client does', () => {
		expect(grpcStatusFromAbortReason(new DOMException('slow', 'TimeoutError'))).toBe(
			'DEADLINE_EXCEEDED',
		);
		expect(grpcStatusFromAbortReason({ code: 'RESOURCE_EXHAUSTED' })).toBe('RESOURCE_EXHAUSTED');
		expect(grpcStatusFromAbortReason('stop')).toBe('CANCELLED');

		const encoded = new RpcError('a%20b', 'NOT_FOUND');
		normalizeGrpcError(encoded, undefined);
		expect(encoded.message).toBe('a b');
		expect(hasDecodedStatusMessage(encoded)).toBe(true);

		const local = new RpcError('100%', 'INTERNAL');
		expect(markGrpcStatusMessageDecoded(local)).toBe(true);
		normalizeGrpcError(local, undefined);
		expect(local.message).toBe('100%');

		const controller = new AbortController();
		controller.abort(new DOMException('slow', 'TimeoutError'));
		const aborted = new RpcError('slow', 'CANCELLED');
		normalizeGrpcError(aborted, controller.signal);
		expect(aborted.code).toBe('DEADLINE_EXCEEDED');
	});

	it('detects the pull capability', () => {
		expect(
			supportsServerStreamingIterable(new GrpcWebFetchTransport({ baseUrl: 'http://localhost' })),
		).toBe(true);
	});
});
