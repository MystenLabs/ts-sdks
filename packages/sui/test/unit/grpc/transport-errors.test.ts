// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcError, UnaryCall } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it } from 'vitest';

import { GrpcWebFetchTransport, SuiGrpcClient } from '../../../src/grpc/index.js';

/**
 * A grpc-web response that carries its status in the headers, which is how a fullnode answers a
 * request it rejected outright. `grpc-message` is percent-encoded, per the protocol.
 */
function statusResponse(status: number, message: string) {
	return new Response(null, {
		status: 200,
		headers: {
			'content-type': 'application/grpc-web+proto',
			'grpc-status': String(status),
			'grpc-message': message,
		},
	});
}

function makeClient(fetch: typeof globalThis.fetch) {
	return new SuiGrpcClient({
		baseUrl: 'http://localhost',
		network: 'testnet',
		fetch,
	});
}

function clientRespondingWith(response: Response | (() => Promise<Response>)) {
	return makeClient((async () =>
		typeof response === 'function' ? response() : response) as typeof globalThis.fetch);
}

/**
 * A transport of the caller's own, standing in for one built without this package's
 * `GrpcWebFetchTransport`. Whatever it does with errors is its own contract.
 */
function transportRejectingWith(error: RpcError): RpcTransport {
	return {
		mergeOptions: (options) => options ?? {},
		unary(method, input, _options) {
			// Handled here so the promises a test does not await are not reported as unhandled: nothing
			// wraps this transport now, so nothing else attaches to them.
			const rejected = () => {
				const promise = Promise.reject(error);
				promise.catch(() => {});

				return promise;
			};

			return new UnaryCall(method, {}, input, rejected(), rejected(), rejected(), rejected());
		},
		serverStreaming: () => {
			throw new Error('unused');
		},
		clientStreaming: () => {
			throw new Error('unused');
		},
		duplex: () => {
			throw new Error('unused');
		},
	};
}

async function captureError(promise: Promise<unknown>) {
	try {
		await promise;
	} catch (error) {
		return error as RpcError;
	}

	throw new Error('expected the call to fail');
}

describe('gRPC transport error normalization', () => {
	it('decodes percent-encoded status text on the native service clients', async () => {
		const client = clientRespondingWith(
			statusResponse(5, 'Object%20not%20found%3A%200x1%20%25%20invalid'),
		);

		const error = await captureError(client.ledgerService.getObject({ objectId: '0x1' }).response);

		expect(error).toBeInstanceOf(RpcError);
		expect(error.message).toBe('Object not found: 0x1 % invalid');
		expect(error.code).toBe('NOT_FOUND');
	});

	it('decodes status text reached through client.core', async () => {
		const client = clientRespondingWith(statusResponse(5, 'Object%20not%20found%3A%200x1'));

		const error = await captureError(client.core.getObject({ objectId: '0x1' }));

		expect(error.message).toContain('Object not found: 0x1');
	});

	it('normalizes every promise a failed call rejects, and only decodes once', async () => {
		const client = clientRespondingWith(
			statusResponse(3, 'invalid%20read_mask%20path%3A%20a%2520b'),
		);

		const call = client.ledgerService.getObject({ objectId: '0x1' });
		const [fromResponse, fromStatus, fromTrailers] = await Promise.all([
			captureError(call.response),
			captureError(call.status),
			captureError(call.trailers),
		]);

		// A single decode: `%2520` is a literal `%20` in the message, not a second escape to unwrap.
		expect(fromResponse.message).toBe('invalid read_mask path: a%20b');
		expect(fromStatus).toBe(fromResponse);
		expect(fromTrailers).toBe(fromResponse);
	});

	it('keeps a message that is not percent-encoded verbatim', async () => {
		// A bare `%` is not a valid escape; decoding would throw and lose the status text entirely.
		const client = clientRespondingWith(statusResponse(8, 'rate limit: 100% of quota used'));

		const error = await captureError(client.ledgerService.getObject({ objectId: '0x1' }).response);

		expect(error.message).toBe('rate limit: 100% of quota used');
		expect(error.code).toBe('RESOURCE_EXHAUSTED');
	});

	it('decodes status text on a server-streaming call', async () => {
		const client = clientRespondingWith(statusResponse(7, 'permission%20denied%3A%20key'));

		const error = await captureError(
			(async () => {
				for await (const _ of client.ledgerService.listTransactions({}).responses) {
					// the call fails before any response frame arrives
				}
			})(),
		);

		expect(error.message).toBe('permission denied: key');
	});

	it('codes a caller deadline as DEADLINE_EXCEEDED rather than INTERNAL', async () => {
		const client = clientRespondingWith(
			() =>
				new Promise<Response>((_, reject) => {
					setTimeout(() => {
						reject(Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' }));
					}, 1);
				}),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: AbortSignal.timeout(1) })
				.response,
		);

		expect(error.code).toBe('DEADLINE_EXCEEDED');
	});

	it('codes an abort with a caller-supplied reason CANCELLED, not INTERNAL', async () => {
		// `AbortController.abort(reason)` takes an arbitrary reason, and fetch rejects with it. Only an
		// `AbortError` reaches the transport's cancellation branch; anything else lands as INTERNAL and
		// would be retried as a server failure.
		const controller = new AbortController();
		const client = clientRespondingWith(
			() =>
				new Promise<Response>((_, reject) => {
					setTimeout(() => {
						controller.abort(new Error('caller gave up'));
						reject(new Error('caller gave up'));
					}, 1);
				}),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
	});

	it('leaves a genuine cancellation coded CANCELLED', async () => {
		const controller = new AbortController();
		const client = clientRespondingWith(
			() =>
				new Promise<Response>((_, reject) => {
					setTimeout(() => {
						controller.abort();
						reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
					}, 1);
				}),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
	});
});

describe('a caller-supplied transport', () => {
	it('is used exactly as given, errors and all', async () => {
		// Upstream's transport leaves `grpc-message` encoded and codes an aborted call INTERNAL. That
		// is upstream's behaviour to change; the client does not reach into a transport it was handed.
		const error = new RpcError('Object%20not%20found', 'INTERNAL');
		const controller = new AbortController();
		controller.abort();
		const client = new SuiGrpcClient({
			network: 'testnet',
			transport: transportRejectingWith(error),
		});

		const caught = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(caught.message).toBe('Object%20not%20found');
		expect(caught.code).toBe('INTERNAL');
	});

	it('normalizes when it is a GrpcWebFetchTransport the caller built from this package', async () => {
		// The path an app takes when it needs interceptors: build the transport itself, from ours.
		const client = new SuiGrpcClient({
			network: 'testnet',
			transport: new GrpcWebFetchTransport({
				baseUrl: 'http://localhost',
				fetch: (async () => statusResponse(5, 'Object%20not%20found%3A%200x1')) as typeof fetch,
			}),
		});

		const caught = await captureError(client.ledgerService.getObject({ objectId: '0x1' }).response);

		expect(caught.message).toBe('Object not found: 0x1');
	});
});
