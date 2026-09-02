// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcWebFetchTransport as UpstreamGrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import type { RpcOptions, RpcTransport } from '@protobuf-ts/runtime-rpc';
import { RpcError, UnaryCall } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it } from 'vitest';

import { GrpcWebFetchTransport, SuiGrpcClient } from '../../../src/grpc/index.js';

/** A grpc-web response carrying its status in the headers, with `grpc-message` percent-encoded. */
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

/** A transport of the caller's own, built without this package's `GrpcWebFetchTransport`. */
function transportRejectingWith(error: RpcError): RpcTransport {
	return {
		mergeOptions: (options) => options ?? {},
		unary(method, input, _options) {
			// Handled here so promises a test does not await are not reported as unhandled.
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

/** A server that accepts the request and never answers, until the call's signal aborts. */
function hangingFetch(onRequest?: (init: RequestInit) => void): typeof globalThis.fetch {
	return ((_input: unknown, init: RequestInit) => {
		onRequest?.(init);

		return new Promise<Response>((_, reject) => {
			init.signal?.addEventListener('abort', () => reject(init.signal!.reason));
		});
	}) as unknown as typeof globalThis.fetch;
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

		// One decode only: `%2520` is a literal `%20` in the message, not a second escape.
		expect(fromResponse.message).toBe('invalid read_mask path: a%20b');
		expect(fromStatus).toBe(fromResponse);
		expect(fromTrailers).toBe(fromResponse);
	});

	it('keeps a message that is not percent-encoded verbatim', async () => {
		// A bare `%` is not a valid escape, and decoding it would throw.
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
		const client = makeClient(hangingFetch());

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: AbortSignal.timeout(1) })
				.response,
		);

		expect(error.code).toBe('DEADLINE_EXCEEDED');
	});

	it('codes an abort with a caller-supplied reason CANCELLED, not INTERNAL', async () => {
		// Only an `AbortError` reaches the transport's cancellation branch. Any other reason lands as
		// INTERNAL, which callers retry as a server failure.
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() => setTimeout(() => controller.abort(new Error('caller gave up')), 1)),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
	});

	it('does not read a fabricated TimeoutError name as a deadline', async () => {
		// Only `AbortSignal.timeout`, or a deadline this transport imposed, counts as a deadline.
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() =>
				setTimeout(
					() => controller.abort(Object.assign(new Error('stop'), { name: 'TimeoutError' })),
					1,
				),
			),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
	});

	it('codes a deadline as DEADLINE_EXCEEDED when the fetch substitutes its own AbortError', async () => {
		// node-fetch rejects with a generic AbortError rather than the signal's reason, so the reason's
		// text is not there to match on.
		const client = makeClient(
			((_input: unknown, init: RequestInit) =>
				new Promise((_, reject) => {
					init.signal?.addEventListener('abort', () =>
						reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
					);
				})) as unknown as typeof globalThis.fetch,
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { timeout: 5 }).response,
		);

		expect(error.code).toBe('DEADLINE_EXCEEDED');
	});

	it('codes an abort with a primitive reason CANCELLED', async () => {
		// `abort('stop')` takes a string, which the transport stringifies into an INTERNAL error.
		const controller = new AbortController();
		const client = makeClient(hangingFetch(() => setTimeout(() => controller.abort('stop'), 1)));

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
	});

	it('keeps a server status that came with metadata, whatever the abort reason says', async () => {
		// An error built from an abort carries no metadata, so matching text cannot make this one look
		// like a cancellation.
		const controller = new AbortController();
		const client = makeClient((async () => {
			controller.abort(new Error('shutdown'));

			return new Response(null, {
				status: 200,
				headers: {
					'content-type': 'application/grpc-web+proto',
					'grpc-status': '13',
					'grpc-message': 'shutdown',
					'x-request-id': 'abc',
				},
			});
		}) as typeof globalThis.fetch);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('INTERNAL');
	});

	it('leaves a server failure that raced an abort with the status the server gave it', async () => {
		// Headers resolve before a later failure propagates, so a caller that aborts once it has
		// them must not have that failure relabelled as a cancellation.
		const controller = new AbortController();
		const client = clientRespondingWith(() =>
			Promise.resolve(
				new Response(
					new ReadableStream({
						start(streamController) {
							setTimeout(() => streamController.error(new Error('connection reset')), 2);
						},
					}),
					{ status: 200, headers: { 'content-type': 'application/grpc-web+proto' } },
				),
			),
		);

		const call = client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal });
		await call.headers;
		controller.abort();

		const error = await captureError(call.response);

		expect(error.message).toBe('connection reset');
		expect(error.code).toBe('INTERNAL');
	});

	it('leaves a genuine cancellation coded CANCELLED', async () => {
		const controller = new AbortController();
		const client = makeClient(hangingFetch(() => setTimeout(() => controller.abort(), 1)));

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
	});
});

describe('a caller-supplied transport', () => {
	it('is used exactly as given, errors and all', async () => {
		// Upstream leaves `grpc-message` encoded and codes an aborted call INTERNAL. The client does
		// not reach into a transport it was handed.
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

	it('still resolves an expired name through an upstream transport', async () => {
		// The node reports an expired name as RESOURCE_EXHAUSTED with prose, which upstream leaves
		// encoded. Whether the name resolves must not depend on the transport.
		const client = new SuiGrpcClient({
			network: 'mainnet',
			transport: new UpstreamGrpcWebFetchTransport({
				baseUrl: 'http://localhost',
				fetch: (async () => statusResponse(8, 'name%20has%20expired')) as typeof fetch,
			}),
		});

		await expect(client.core.resolveNameServiceAddress({ name: '@mysten' })).resolves.toEqual({
			address: null,
		});
	});

	it('does not decode a status the transport already decoded', async () => {
		// The wire form of a message that literally reads `name%20has%20expired`. Decoding it twice
		// would turn an unrelated failure into a resolved-to-null name.
		const client = clientRespondingWith(statusResponse(8, 'name%2520has%2520expired'));

		const error = await captureError(client.core.resolveNameServiceAddress({ name: '@mysten' }));

		expect(error.message).toBe('name%20has%20expired');
	});

	it('normalizes when it is a GrpcWebFetchTransport the caller built from this package', async () => {
		// What an app does when it needs interceptors: build the transport itself, from ours.
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

describe('gRPC transport deadlines', () => {
	it('enforces a timeout the base transport only advertises', async () => {
		// The header asks the node to give up. It does nothing when the connection stalls.
		const client = makeClient(hangingFetch());

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { timeout: 5 }).response,
		);

		expect(error.code).toBe('DEADLINE_EXCEEDED');
	});

	it('still sends the grpc-timeout header', async () => {
		let sent: RequestInit | undefined;
		const client = makeClient(hangingFetch((init) => (sent = init)));

		await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { timeout: 50 }).response,
		);

		expect((sent!.headers as Headers).get('grpc-timeout')).toBe('50m');
	});

	it('lets a caller cancellation win over a deadline that has not arrived', async () => {
		const controller = new AbortController();
		const client = makeClient(hangingFetch(() => setTimeout(() => controller.abort(), 1)));

		const error = await captureError(
			client.ledgerService.getObject(
				{ objectId: '0x1' },
				{ timeout: 10_000, abort: controller.signal },
			).response,
		);

		expect(error.code).toBe('CANCELLED');
	});

	it('gives every call its own deadline when the timeout comes from the transport options', async () => {
		const transport = new GrpcWebFetchTransport({
			baseUrl: 'http://localhost',
			fetch: hangingFetch(),
			timeout: 5,
		});
		const client = new SuiGrpcClient({ network: 'testnet', transport });

		const first = await captureError(client.ledgerService.getObject({ objectId: '0x1' }).response);
		const second = await captureError(client.ledgerService.getObject({ objectId: '0x2' }).response);

		expect(first.code).toBe('DEADLINE_EXCEEDED');
		expect(second.code).toBe('DEADLINE_EXCEEDED');

		// `mergeRpcOptions` hands these options to a call that passes none of its own, so writing the
		// composed signal onto them would leave every later call already aborted.
		const defaults = (transport as unknown as { defaultOptions: RpcOptions }).defaultOptions;
		expect(defaults.abort).toBeUndefined();
	});
});
