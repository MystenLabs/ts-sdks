import { describe, expect, it } from 'vitest';
import * as grpc from '../../../src/grpc/index.js';
import { GrpcStatusCode, RpcError } from '../../../src/grpc/index.js';
import type { GrpcWebFetchTransportOptions } from '../../../src/grpc/index.js';
import * as pullTransport from '../../../src/grpc/pull-transport/index.js';

describe('grpc error exports', () => {
	it('narrows and codes a failure without a protobuf-ts import', () => {
		const error: unknown = new RpcError('gone', GrpcStatusCode[GrpcStatusCode.NOT_FOUND]);

		expect(error).toBeInstanceOf(RpcError);
		expect((error as RpcError).code).toBe('NOT_FOUND');
	});
});

describe('on-demand stream reader', () => {
	it('exposes only the transport option, not the internal pull interface', () => {
		const options: GrpcWebFetchTransportOptions = {
			baseUrl: 'http://localhost',
			maxResponseMessageBytes: 1024,
		};
		expect(new grpc.GrpcWebFetchTransport(options)).toBeInstanceOf(grpc.GrpcWebFetchTransport);

		for (const name of [
			'hasDecodedStatusMessage',
			'normalizeGrpcError',
			'isNonRetryable',
			'markNonRetryable',
			'pullServerStreaming',
			'PULL_SERVER_STREAMING',
			'GrpcWebPullCall',
			'GrpcWebFrameDecoder',
		]) {
			expect(grpc).not.toHaveProperty(name);
		}
	});
});

describe('@mysten/sui/grpc/pull-transport', () => {
	it('exports only the interface transport implementations need', () => {
		expect(Object.keys(pullTransport).sort()).toEqual([
			'PULL_SERVER_STREAMING',
			'grpcStatusFromAbortReason',
			'markConnectionLost',
			'markNonRetryable',
		]);
	});

	it('codes an abort reason the way the default transport does', () => {
		const { grpcStatusFromAbortReason } = pullTransport;
		expect(grpcStatusFromAbortReason(new DOMException('late', 'TimeoutError'))).toBe(
			'DEADLINE_EXCEEDED',
		);
		expect(grpcStatusFromAbortReason({ code: 'UNAVAILABLE' })).toBe('UNAVAILABLE');
		expect(grpcStatusFromAbortReason({ code: 'NOPE' })).toBe('CANCELLED');
		expect(grpcStatusFromAbortReason('stop')).toBe('CANCELLED');
	});
});
