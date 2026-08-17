// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';
import { describe, expect, it, vi } from 'vitest';

import { ObjectError, SuiClientError, TransactionError } from '../../../src/client/index.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { SuiGrpcClient } from '../../../src/grpc/index.js';
import {
	JsonRpcError,
	SuiJsonRpcClient,
	type JsonRpcTransport,
} from '../../../src/jsonRpc/index.js';
const digest = '11111111111111111111111111111111';

async function captureError(promise: Promise<unknown>): Promise<Error> {
	try {
		await promise;
	} catch (error) {
		return error as Error;
	}

	throw new Error('Expected promise to reject');
}

describe('client lookup errors', () => {
	it('keeps the existing ObjectError constructor without guessing a normalized reason', () => {
		const error = new ObjectError('notExists', 'Object 0x1 does not exist');

		expect(error).toBeInstanceOf(SuiClientError);
		expect(error.code).toBe('notExists');
		expect(error.reason).toBe('unknown');
		expect(error.message).toBe('Object 0x1 does not exist');

		error.code = 'deleted';
		expect(error.code).toBe('deleted');
	});

	it('accepts an explicit normalized reason without changing the existing arguments', () => {
		const error = new ObjectError('notExists', 'Object 0x1 does not exist', {
			reason: 'notFound',
			objectId: '0x1',
		});

		expect(error).toMatchObject({ code: 'notExists', reason: 'notFound', objectId: '0x1' });
	});

	it('exposes a transport-neutral transaction lookup error', () => {
		const cause = new Error('wire error');
		const error = new TransactionError('notFound', digest, { cause });

		expect(error).toBeInstanceOf(SuiClientError);
		expect(error.reason).toBe('notFound');
		expect(error.digest).toBe(digest);
		expect(error.message).toBe(`Transaction ${digest} not found`);
		expect(error.cause).toBe(cause);
	});
});

describe('getObjects', () => {
	it.each([
		// Missing objects reuse the JSON-RPC `notExists` code so handlers written
		// against earlier releases keep working on every transport.
		[GrpcStatusCode.NOT_FOUND, 'notExists', 'notFound'],
		// Other statuses use stable gRPC status names, never the raw status number.
		[GrpcStatusCode.INTERNAL, 'INTERNAL', 'unknown'],
		// Statuses outside the GrpcStatusCode enum never leak a numeric code.
		[999 as GrpcStatusCode, 'unknown', 'unknown'],
	] as const)('maps gRPC status %i to ObjectError code %s', async (status, code, reason) => {
		const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'http://localhost' });
		const wireError = { code: status, message: 'object lookup failed', details: [] };
		client.ledgerService.batchGetObjects = vi.fn().mockResolvedValue({
			response: {
				objects: [{ result: { oneofKind: 'error', error: wireError } }],
			},
		}) as never;

		const { objects } = await client.core.getObjects({ objectIds: ['0x123'] });
		const error = objects[0];

		expect(error).toBeInstanceOf(ObjectError);
		expect(error).toMatchObject({
			code,
			reason,
			objectId: '0x123',
		});
		expect((error as ObjectError).cause).toBe(wireError);
	});

	it('maps a missing GraphQL object without normalizing the reported input ID', async () => {
		const client = new SuiGraphQLClient({
			network: 'testnet',
			url: 'http://localhost/graphql',
			fetch: async () => Response.json({ data: { multiGetObjects: [] } }),
		});

		const { objects } = await client.core.getObjects({ objectIds: ['0x123'] });

		expect(objects[0]).toBeInstanceOf(ObjectError);
		expect(objects[0]).toMatchObject({
			code: 'notFound',
			reason: 'notFound',
			objectId: '0x123',
		});
	});

	it.each([
		[{ code: 'notExists', object_id: '0x999' }, 'notExists', 'notFound'],
		[
			{ code: 'deleted', object_id: '0x999', digest: 'deleted', version: '1' },
			'deleted',
			'deleted',
		],
		[{ code: 'unknown' }, 'unknown', 'unknown'],
		// Codes the SDK doesn't know about yet still map to an ObjectError entry.
		[{ code: 'futureCode' }, 'futureCode', 'unknown'],
	] as const)('preserves JSON-RPC code %s and adds reason %s', async (wireError, code, reason) => {
		const transport: JsonRpcTransport = {
			request: vi.fn().mockResolvedValue([{ error: wireError }]),
		};
		const client = new SuiJsonRpcClient({ network: 'testnet', transport });

		const { objects } = await client.core.getObjects({ objectIds: ['0x123'] });
		const error = objects[0];

		expect(error).toBeInstanceOf(ObjectError);
		expect(error).toMatchObject({ code, reason, objectId: '0x123' });
		expect((error as ObjectError).cause).toBe(wireError);
	});
});

describe('getTransaction', () => {
	it('maps gRPC NOT_FOUND and preserves the RpcError as cause', async () => {
		const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'http://localhost' });
		const wireError = new RpcError(
			`Transaction%20${digest}%20not%20found`,
			GrpcStatusCode[GrpcStatusCode.NOT_FOUND],
		);
		client.ledgerService.getTransaction = vi.fn().mockRejectedValue(wireError) as never;

		const error = await captureError(client.core.getTransaction({ digest }));

		expect(error).toBeInstanceOf(TransactionError);
		expect(error).toMatchObject({ reason: 'notFound', digest });
		expect(error.cause).toBe(wireError);
	});

	it('preserves unrelated gRPC errors', async () => {
		const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'http://localhost' });
		const wireError = new RpcError(
			'temporarily unavailable',
			GrpcStatusCode[GrpcStatusCode.UNAVAILABLE],
		);
		client.ledgerService.getTransaction = vi.fn().mockRejectedValue(wireError) as never;

		await expect(client.core.getTransaction({ digest })).rejects.toBe(wireError);
	});

	it('maps a null GraphQL transaction result', async () => {
		const client = new SuiGraphQLClient({
			network: 'testnet',
			url: 'http://localhost/graphql',
			fetch: async () => Response.json({ data: { transaction: null } }),
		});

		const error = await captureError(client.core.getTransaction({ digest }));

		expect(error).toBeInstanceOf(TransactionError);
		expect(error).toMatchObject({ reason: 'notFound', digest });
	});

	it.each([
		`Invalid Params: Transaction ${digest} not found`,
		`Could not find the referenced transaction [TransactionDigest(${digest})].`,
	])('maps a known JSON-RPC missing-transaction response', async (message) => {
		const wireError = new JsonRpcError(message, -32602);
		const transport: JsonRpcTransport = {
			request: vi.fn().mockRejectedValue(wireError),
		};
		const client = new SuiJsonRpcClient({ network: 'testnet', transport });

		const error = await captureError(client.core.getTransaction({ digest }));

		expect(error).toBeInstanceOf(TransactionError);
		expect(error).toMatchObject({ reason: 'notFound', digest });
		expect(error.cause).toBe(wireError);
	});

	it('preserves unrelated JSON-RPC invalid-parameter errors', async () => {
		const wireError = new JsonRpcError('Invalid Params: another validation failure', -32602);
		const transport: JsonRpcTransport = {
			request: vi.fn().mockRejectedValue(wireError),
		};
		const client = new SuiJsonRpcClient({ network: 'testnet', transport });

		await expect(client.core.getTransaction({ digest })).rejects.toBe(wireError);
	});
});
