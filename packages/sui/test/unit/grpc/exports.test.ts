import { describe, expect, it } from 'vitest';
import * as grpc from '../../../src/grpc/index.js';
import { GrpcStatusCode, RpcError } from '../../../src/grpc/index.js';
import type { GrpcWebFetchTransportOptions } from '../../../src/grpc/index.js';

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
