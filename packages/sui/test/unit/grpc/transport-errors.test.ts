// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcError, UnaryCall } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it } from 'vitest';

import { SuiGrpcClient } from '../../../src/grpc/index.js';

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
 * A transport that is not grpc-web — standing in for `@protobuf-ts/grpc-transport`, which decodes
 * `grpc-message` itself. Rejects every call with the *same* error instance, which is also what makes
 * it a probe for call-specific state being recorded on a shared error.
 */
function transportRejectingWith(error: RpcError): RpcTransport {
	return {
		mergeOptions: (options) => options ?? {},
		unary(method, input, _options) {
			return new UnaryCall(
				method,
				{},
				input,
				Promise.reject(error),
				Promise.reject(error),
				Promise.reject(error),
				Promise.reject(error),
			);
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

/** A timeout signal that has already fired, so a call can be normalized against a settled abort. */
async function firedTimeoutSignal() {
	const signal = AbortSignal.timeout(0);
	await new Promise((resolve) => setTimeout(resolve, 2));

	return signal;
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

describe('gRPC transport error normalization on a non-grpc-web transport', () => {
	it('leaves status text alone, since such a transport has already decoded it', async () => {
		// `read_mask path: a%20b` is the decoded message: a second decode would collapse it to `a b`.
		const error = new RpcError('read_mask path: a%20b', 'INVALID_ARGUMENT');
		const client = new SuiGrpcClient({
			network: 'testnet',
			transport: transportRejectingWith(error),
		});

		const caught = await captureError(client.ledgerService.getObject({ objectId: '0x1' }).response);

		expect(caught.message).toBe('read_mask path: a%20b');
	});

	it('still codes an aborted call from the signal', async () => {
		const error = new RpcError('connection closed', 'INTERNAL');
		const client = new SuiGrpcClient({
			network: 'testnet',
			transport: transportRejectingWith(error),
		});

		const caught = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: await firedTimeoutSignal() })
				.response,
		);

		expect(caught.code).toBe('DEADLINE_EXCEEDED');
	});

	it('codes each call from its own signal when a transport reuses one error instance', async () => {
		// Recording the mapping on the error would let whichever call normalized first decide the code
		// every later call observes.
		const shared = new RpcError('connection closed', 'INTERNAL');
		const client = new SuiGrpcClient({
			network: 'testnet',
			transport: transportRejectingWith(shared),
		});

		const timedOut = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: await firedTimeoutSignal() })
				.response,
		);
		expect(timedOut.code).toBe('DEADLINE_EXCEEDED');

		const controller = new AbortController();
		controller.abort();
		const cancelled = await captureError(
			client.ledgerService.getObject({ objectId: '0x2' }, { abort: controller.signal }).response,
		);

		expect(cancelled.code).toBe('CANCELLED');
	});
});
