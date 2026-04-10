// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import type { TransportDetails } from '../../../src/client/errors.js';
import { ObjectError, SimulationError, SuiClientError } from '../../../src/client/errors.js';
import { JSONRpcCoreClient } from '../../../src/jsonRpc/core.js';
import type { SuiJsonRpcClient } from '../../../src/jsonRpc/client.js';
import type {
	ObjectResponseError,
	PaginatedObjectsResponse,
} from '../../../src/jsonRpc/types/generated.js';
import { GrpcCoreClient } from '../../../src/grpc/core.js';
import type { SuiGrpcClient } from '../../../src/grpc/client.js';
import { GraphQLCoreClient } from '../../../src/graphql/core.js';
import type { SuiGraphQLClient } from '../../../src/graphql/client.js';

// `transportDetails` is required on every `ObjectError` in practice; tests that
// don't care which transport produced the error use this minimal graphql tag.
const ANY_TRANSPORT: TransportDetails = { $kind: 'graphql' };

describe('ObjectError', () => {
	it('extends SuiClientError and Error', () => {
		const err = new ObjectError('notFound', '0x123', { transportDetails: ANY_TRANSPORT });
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(SuiClientError);
		expect(err).toBeInstanceOf(ObjectError);
	});

	it('sets code and objectId from constructor', () => {
		const err = new ObjectError('notFound', '0xabc', { transportDetails: ANY_TRANSPORT });
		expect(err.code).toBe('notFound');
		expect(err.objectId).toBe('0xabc');
	});

	it.each([
		['notFound', '0x1', 'Object not found: 0x1'],
		['unknown', '0x2', 'Unknown object error: 0x2'],
	] as const)('generates canonical message for code=%s', (code, id, expected) => {
		expect(new ObjectError(code, id, { transportDetails: ANY_TRANSPORT }).message).toBe(expected);
	});

	it('preserves cause', () => {
		const rawError = { code: 'notExists', object_id: '0x123' };
		const err = new ObjectError('notFound', '0x123', {
			cause: rawError,
			transportDetails: ANY_TRANSPORT,
		});
		expect(err.cause).toBe(rawError);
	});

	it('carries transportDetails for JSON-RPC payloads', () => {
		const response = { code: 'notExists', object_id: '0x1' };
		const err = new ObjectError('notFound', '0x1', {
			transportDetails: { $kind: 'jsonRpc', response },
		});
		expect(err.transportDetails?.$kind).toBe('jsonRpc');
		if (err.transportDetails?.$kind === 'jsonRpc') {
			expect(err.transportDetails.response).toBe(response);
		}
	});

	it('carries transportDetails for gRPC status payloads', () => {
		const status = { code: 5, message: 'not found', details: [] };
		const err = new ObjectError('notFound', '0x1', {
			transportDetails: { $kind: 'grpc', status },
		});
		expect(err.transportDetails?.$kind).toBe('grpc');
		if (err.transportDetails?.$kind === 'grpc') {
			expect(err.transportDetails.status.code).toBe(5);
		}
	});

	it('carries transportDetails for GraphQL payloads', () => {
		const err = new ObjectError('notFound', '0x1', {
			transportDetails: { $kind: 'graphql' },
		});
		expect(err.transportDetails?.$kind).toBe('graphql');
	});

	it('is distinguishable from SimulationError', () => {
		const objErr = new ObjectError('notFound', '0x1', { transportDetails: ANY_TRANSPORT });
		const simErr = new SimulationError('sim failed');
		expect(objErr).not.toBeInstanceOf(SimulationError);
		expect(simErr).not.toBeInstanceOf(ObjectError);
	});
});

describe('SuiClientError', () => {
	it('carries transportDetails on the base class', () => {
		const err = new SuiClientError('boom', {
			transportDetails: { $kind: 'graphql' },
		});
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(SuiClientError);
		expect(err.transportDetails?.$kind).toBe('graphql');
	});

	it('preserves cause independently of transportDetails', () => {
		const rawError = new Error('wire failure');
		const err = new SuiClientError('boom', {
			cause: rawError,
			transportDetails: { $kind: 'jsonRpc', response: { code: 'unknown' } },
		});
		expect(err.cause).toBe(rawError);
		expect(err.transportDetails?.$kind).toBe('jsonRpc');
	});
});

describe('JSONRpcCoreClient.listOwnedObjects error escalation', () => {
	const owner = '0x' + '1'.repeat(64);

	function createMockCore(response: PaginatedObjectsResponse) {
		const mockJsonRpcClient = {
			network: 'testnet' as const,
			getOwnedObjects: vi.fn().mockResolvedValue(response),
		};
		return new JSONRpcCoreClient({
			jsonRpcClient: mockJsonRpcClient as unknown as SuiJsonRpcClient,
		});
	}

	async function captureThrow(core: JSONRpcCoreClient): Promise<SuiClientError> {
		try {
			await core.listOwnedObjects({ owner });
		} catch (e) {
			return e as SuiClientError;
		}
		throw new Error('expected listOwnedObjects to throw');
	}

	it('escalates displayError (no object id in wire) to base SuiClientError', async () => {
		const wireError: ObjectResponseError = { code: 'displayError', error: 'boom' };
		const core = createMockCore({
			data: [{ error: wireError }],
			hasNextPage: false,
			nextCursor: null,
		});
		const err = await captureThrow(core);
		expect(err).toBeInstanceOf(SuiClientError);
		expect(err).not.toBeInstanceOf(ObjectError);
		expect(err.message).toContain('displayError');
		expect(err.transportDetails?.$kind).toBe('jsonRpc');
		if (err.transportDetails?.$kind === 'jsonRpc') {
			expect(err.transportDetails.response).toBe(wireError);
		}
	});

	it('escalates unknown wire code (no object id) to base SuiClientError', async () => {
		const wireError: ObjectResponseError = { code: 'unknown' };
		const core = createMockCore({
			data: [{ error: wireError }],
			hasNextPage: false,
			nextCursor: null,
		});
		const err = await captureThrow(core);
		expect(err).toBeInstanceOf(SuiClientError);
		expect(err).not.toBeInstanceOf(ObjectError);
		expect(err.transportDetails?.$kind).toBe('jsonRpc');
	});

	it('throws ObjectError(notFound) with extracted object_id for notExists wire code', async () => {
		const wireError: ObjectResponseError = { code: 'notExists', object_id: '0xdead' };
		const core = createMockCore({
			data: [{ error: wireError }],
			hasNextPage: false,
			nextCursor: null,
		});
		const err = await captureThrow(core);
		expect(err).toBeInstanceOf(ObjectError);
		if (err instanceof ObjectError) {
			expect(err.code).toBe('notFound');
			expect(err.objectId).toBe('0xdead');
			expect(err.transportDetails?.$kind).toBe('jsonRpc');
		}
	});

	it('normalizes dynamicFieldNotFound wire code to ObjectError(notFound) with parent_object_id', async () => {
		const wireError: ObjectResponseError = {
			code: 'dynamicFieldNotFound',
			parent_object_id: '0xfeed',
		};
		const core = createMockCore({
			data: [{ error: wireError }],
			hasNextPage: false,
			nextCursor: null,
		});
		const err = await captureThrow(core);
		expect(err).toBeInstanceOf(ObjectError);
		if (err instanceof ObjectError) {
			expect(err.code).toBe('notFound');
			expect(err.objectId).toBe('0xfeed');
		}
	});

	it('normalizes deleted wire code to ObjectError(notFound) with object_id', async () => {
		const wireError: ObjectResponseError = {
			code: 'deleted',
			object_id: '0xbeef',
			digest: '0xd',
			version: '1',
		};
		const core = createMockCore({
			data: [{ error: wireError }],
			hasNextPage: false,
			nextCursor: null,
		});
		const err = await captureThrow(core);
		expect(err).toBeInstanceOf(ObjectError);
		if (err instanceof ObjectError) {
			expect(err.code).toBe('notFound');
			expect(err.objectId).toBe('0xbeef');
		}
	});

	it('every wire code is catchable via instanceof SuiClientError (universal catch contract)', async () => {
		const cases: ObjectResponseError[] = [
			{ code: 'notExists', object_id: '0x1' },
			{ code: 'dynamicFieldNotFound', parent_object_id: '0x2' },
			{ code: 'deleted', object_id: '0x3', digest: '0xd', version: '1' },
			{ code: 'displayError', error: 'boom' },
			{ code: 'unknown' },
		];
		for (const wireError of cases) {
			const core = createMockCore({
				data: [{ error: wireError }],
				hasNextPage: false,
				nextCursor: null,
			});
			const err = await captureThrow(core);
			expect(err, `wire code=${wireError.code}`).toBeInstanceOf(SuiClientError);
			expect(err.transportDetails?.$kind).toBe('jsonRpc');
		}
	});
});

describe('JSONRpcCoreClient.getObjects error mapping', () => {
	function createMockCore(results: Array<{ error?: ObjectResponseError; data?: unknown }>) {
		const mockJsonRpcClient = {
			network: 'testnet' as const,
			multiGetObjects: vi.fn().mockResolvedValue(results),
		};
		return new JSONRpcCoreClient({
			jsonRpcClient: mockJsonRpcClient as unknown as SuiJsonRpcClient,
		});
	}

	it.each([
		['notExists', { code: 'notExists', object_id: '0xaaa' }, 'notFound'],
		['deleted', { code: 'deleted', object_id: '0xbbb', digest: '0xd', version: '1' }, 'notFound'],
		[
			'dynamicFieldNotFound',
			{ code: 'dynamicFieldNotFound', parent_object_id: '0xccc' },
			'notFound',
		],
		['displayError', { code: 'displayError', error: 'boom' }, 'unknown'],
		['unknown', { code: 'unknown' }, 'unknown'],
	] as const)(
		'returns ObjectError for wire code=%s with mapped ObjectErrorCode',
		async (_name, wireError, expectedCode) => {
			const core = createMockCore([{ error: wireError as ObjectResponseError }]);
			const { objects } = await core.getObjects({ objectIds: ['0xtarget'] });
			expect(objects).toHaveLength(1);
			const err = objects[0];
			expect(err).toBeInstanceOf(ObjectError);
			if (err instanceof ObjectError) {
				expect(err.code).toBe(expectedCode);
				// getObjects uses the input id (batch[idx]), not the extracted wire id,
				// so every returned ObjectError has a known objectId regardless of wire code.
				expect(err.objectId).toBe('0xtarget');
				expect(err.transportDetails.$kind).toBe('jsonRpc');
			}
		},
	);

	it('attaches the exact wire error as transportDetails.response (reference identity)', async () => {
		const wireError: ObjectResponseError = { code: 'notExists', object_id: '0xaaa' };
		const core = createMockCore([{ error: wireError }]);
		const { objects } = await core.getObjects({ objectIds: ['0xtarget'] });
		const err = objects[0];
		expect(err).toBeInstanceOf(ObjectError);
		if (err instanceof ObjectError && err.transportDetails.$kind === 'jsonRpc') {
			// Reference identity, not just structural equality — the raw wire payload
			// round-trips through the mapper without copy, spread, or transformation.
			expect(err.transportDetails.response).toBe(wireError);
		}
	});
});

describe('GrpcCoreClient.getObjects error mapping', () => {
	function createMockCore(statusCode: number) {
		const mockGrpcClient = {
			ledgerService: {
				batchGetObjects: vi.fn().mockResolvedValue({
					response: {
						objects: [
							{
								result: {
									oneofKind: 'error' as const,
									error: { code: statusCode, message: 'x', details: [] },
								},
							},
						],
					},
				}),
			},
		};
		return new GrpcCoreClient({
			client: mockGrpcClient as unknown as SuiGrpcClient,
			network: 'testnet',
		} as never);
	}

	it.each([
		[5, 'notFound'], // google.rpc.Code.NOT_FOUND
		[13, 'unknown'], // INTERNAL
		[7, 'unknown'], // PERMISSION_DENIED
		[0, 'unknown'], // OK (nonsensical but must not map to notFound)
	] as const)(
		'maps gRPC status code %i to ObjectErrorCode=%s',
		async (statusCode, expectedCode) => {
			const core = createMockCore(statusCode);
			const { objects } = await core.getObjects({ objectIds: ['0xtarget'] });
			expect(objects).toHaveLength(1);
			const err = objects[0];
			expect(err).toBeInstanceOf(ObjectError);
			if (err instanceof ObjectError) {
				expect(err.code).toBe(expectedCode);
				expect(err.objectId).toBe('0xtarget');
				expect(err.transportDetails.$kind).toBe('grpc');
				if (err.transportDetails.$kind === 'grpc') {
					expect(err.transportDetails.status.code).toBe(statusCode);
				}
			}
		},
	);
});

describe('GraphQLCoreClient.getObjects error mapping', () => {
	// Regression test for cross-transport objectId parity: GraphQL used to pre-normalize
	// the input ids before constructing `ObjectError`, so a consumer that passed
	// `'0x9999'` saw `error.objectId === '0x000...9999'` on GraphQL but
	// `error.objectId === '0x9999'` on JSON-RPC/gRPC. The fix preserves the raw input id
	// at the error construction site so all three transports round-trip identically.
	function createMockCore() {
		const mockGraphQLClient = {
			network: 'testnet' as const,
			query: vi.fn().mockResolvedValue({
				data: { multiGetObjects: [] }, // empty page — every requested id surfaces as notFound
				errors: undefined,
			}),
		};
		return new GraphQLCoreClient({
			graphqlClient: mockGraphQLClient as unknown as SuiGraphQLClient,
		});
	}

	it('preserves the raw input id on ObjectError for an unnormalized input', async () => {
		const core = createMockCore();
		const { objects } = await core.getObjects({ objectIds: ['0x9999'] });
		expect(objects).toHaveLength(1);
		const err = objects[0];
		expect(err).toBeInstanceOf(ObjectError);
		if (err instanceof ObjectError) {
			// The raw 6-char input — NOT the 66-char normalized form.
			// This pins cross-transport parity: JSON-RPC and gRPC already use `batch[idx]`
			// at construction, and GraphQL now does too.
			expect(err.objectId).toBe('0x9999');
			expect(err.code).toBe('notFound');
			expect(err.transportDetails.$kind).toBe('graphql');
		}
	});

	it('preserves the raw input id on ObjectError for a pre-normalized input', async () => {
		const normalized = '0x' + '0'.repeat(60) + '9999';
		const core = createMockCore();
		const { objects } = await core.getObjects({ objectIds: [normalized] });
		expect(objects).toHaveLength(1);
		const err = objects[0];
		expect(err).toBeInstanceOf(ObjectError);
		if (err instanceof ObjectError) {
			expect(err.objectId).toBe(normalized);
		}
	});
});
