import { describe, expect, it } from 'vitest';
import { GrpcStatusCode, RpcError } from '../../../src/grpc/index.js';

describe('grpc error exports', () => {
	it('narrows and codes a failure without a protobuf-ts import', () => {
		const error: unknown = new RpcError('gone', GrpcStatusCode[GrpcStatusCode.NOT_FOUND]);

		expect(error).toBeInstanceOf(RpcError);
		expect((error as RpcError).code).toBe('NOT_FOUND');
	});
});
