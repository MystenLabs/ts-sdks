// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcWebFetchTransport as UpstreamGrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
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

		// `%2520` is a literal `%20` in the message, not a second escape.
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
		// Only an `AbortError` reaches the transport's cancellation branch; the rest land as INTERNAL.
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() => setTimeout(() => controller.abort(new Error('caller gave up')), 1)),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
	});

	it('reads a reason named TimeoutError as a deadline, whatever built it', async () => {
		// Requiring a `DOMException` would lose a genuine timeout from another realm.
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

		expect(error.code).toBe('DEADLINE_EXCEEDED');
	});

	it('ignores a reason whose code is a numeric key or a prototype member', async () => {
		// The enum's reverse mapping and `Object.prototype` both answer `in`.
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() =>
				setTimeout(() => controller.abort(Object.assign(new Error('x'), { code: '0' })), 1),
			),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
	});

	it('ignores a reason whose code is not a gRPC status', async () => {
		// A Node system error carries `code`, which must not be mistaken for a status.
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() =>
				setTimeout(
					() => controller.abort(Object.assign(new Error('dns'), { code: 'ENOTFOUND' })),
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
		// node-fetch rejects with a generic AbortError rather than the signal's reason.
		const client = makeClient(
			((_input: unknown, init: RequestInit) =>
				new Promise((_, reject) => {
					init.signal?.addEventListener('abort', () =>
						reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
					);
				})) as unknown as typeof globalThis.fetch,
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: AbortSignal.timeout(1) })
				.response,
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

	it('keeps the status of a coded reason from another copy of runtime-rpc', async () => {
		// A duplicate install, or another realm, fails `instanceof` while carrying the same shape.
		const controller = new AbortController();
		const foreign = Object.assign(new Error('retry'), { code: 'UNAVAILABLE', meta: {} });
		const client = makeClient(hangingFetch(() => setTimeout(() => controller.abort(foreign), 1)));

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('UNAVAILABLE');
	});

	it('keeps the status a caller put on an RpcError abort reason', async () => {
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() => setTimeout(() => controller.abort(new RpcError('gone', 'INTERNAL')), 1)),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('INTERNAL');
	});

	it('keeps a coded reason when the fetch substitutes its own AbortError', async () => {
		// node-fetch never propagates the reason, so the caller's status has to be carried across.
		const controller = new AbortController();
		const client = makeClient(
			((_input: unknown, init: RequestInit) =>
				new Promise((_, reject) => {
					setTimeout(() => controller.abort(new RpcError('gone', 'INTERNAL')), 1);
					init.signal?.addEventListener('abort', () =>
						reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' })),
					);
				})) as unknown as typeof globalThis.fetch,
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('INTERNAL');
	});

	it('leaves a coded reason carrying metadata alone, text and all', async () => {
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() =>
				setTimeout(
					() => controller.abort(new RpcError('cancel /objects/a%2Fb', 'INTERNAL', { k: 'v' })),
					1,
				),
			),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('INTERNAL');
		expect(error.message).toBe('cancel /objects/a%2Fb');
	});

	it('gives every promise of an aborted call the same message and code', async () => {
		// Re-coding to a status outside the abort branch would leave later handlers decoding the
		// reason's own text.
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() =>
				setTimeout(
					() => controller.abort(Object.assign(new Error('retry /a%2Fb'), { code: 'UNAVAILABLE' })),
					1,
				),
			),
		);

		const call = client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal });
		const [fromResponse, fromStatus, fromTrailers] = await Promise.all([
			captureError(call.response),
			captureError(call.status),
			captureError(call.trailers),
		]);

		for (const error of [fromResponse, fromStatus, fromTrailers]) {
			expect(error.message).toBe('retry /a%2Fb');
			expect(error.code).toBe('UNAVAILABLE');
		}
	});

	it('does not decode the text of an abort reason', async () => {
		// The reason's message is local text, not `grpc-message` off the wire.
		const controller = new AbortController();
		const client = makeClient(
			hangingFetch(() => setTimeout(() => controller.abort(new Error('cancel /objects/a%2Fb')), 1)),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.message).toBe('cancel /objects/a%2Fb');
		expect(error.code).toBe('CANCELLED');
	});

	it('leaves the response body alone, whatever shape it is', async () => {
		// A `node-fetch` body is a node stream, which upstream reads through `Symbol.asyncIterator`.
		const client = makeClient((async () => ({
			status: 200,
			statusText: 'OK',
			headers: new Headers({ 'content-type': 'application/grpc-web+proto' }),
			body: (async function* () {
				yield new Uint8Array();
			})(),
		})) as unknown as typeof globalThis.fetch);

		const error = await captureError(client.ledgerService.getObject({ objectId: '0x1' }).response);

		expect(error.message).not.toContain('getReader');
	});

	it('codes an abort that lands while the body is being read', async () => {
		const controller = new AbortController();
		const client = clientRespondingWith(() =>
			Promise.resolve(
				new Response(
					new ReadableStream({
						start(streamController) {
							setTimeout(() => {
								controller.abort();
								streamController.error(controller.signal.reason);
							}, 2);
						},
					}),
					{ status: 200, headers: { 'content-type': 'application/grpc-web+proto' } },
				),
			),
		);

		const error = await captureError(
			client.ledgerService.getObject({ objectId: '0x1' }, { abort: controller.signal }).response,
		);

		expect(error.code).toBe('CANCELLED');
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
		// Upstream leaves `grpc-message` encoded; the client does not reach into a transport.
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

	it('resolves an expired name reported by another copy of runtime-rpc', async () => {
		// A duplicate install fails `instanceof RpcError`, but carries the same shape.
		const foreign = Object.assign(new Error('name has expired'), {
			code: 'RESOURCE_EXHAUSTED',
			meta: {},
		});
		const client = new SuiGrpcClient({
			network: 'mainnet',
			transport: transportRejectingWith(foreign as never),
		});

		await expect(client.core.resolveNameServiceAddress({ name: '@mysten' })).resolves.toEqual({
			address: null,
		});
	});

	it('still resolves an expired name through an upstream transport', async () => {
		// The node reports an expired name as RESOURCE_EXHAUSTED with prose, left encoded upstream.
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

	it('honours the decoded marker set by another copy of this package', async () => {
		// The marker is registered globally, so a duplicate install's transport sets the same one.
		const decoded = new RpcError('name%20has%20expired', 'RESOURCE_EXHAUSTED');
		Object.defineProperty(decoded, Symbol.for('@mysten/sui/grpc/decoded-status-message'), {
			value: true,
		});
		const client = new SuiGrpcClient({
			network: 'mainnet',
			transport: transportRejectingWith(decoded),
		});

		await expect(client.core.resolveNameServiceAddress({ name: '@mysten' })).rejects.toBe(decoded);
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

describe('gRPC transport call options', () => {
	it("gives every call its own options rather than writing to the transport's", async () => {
		const fetch = (async () => statusResponse(5, 'gone')) as typeof globalThis.fetch;
		const transport = new GrpcWebFetchTransport({ baseUrl: 'http://localhost', fetch });
		const client = new SuiGrpcClient({ network: 'testnet', transport });

		await captureError(client.ledgerService.getObject({ objectId: '0x1' }).response);
		await captureError(client.ledgerService.getObject({ objectId: '0x2' }).response);

		// `mergeRpcOptions` hands these to a call that passes no options of its own.
		const defaults = (transport as unknown as { defaultOptions: { fetch?: unknown } })
			.defaultOptions;

		expect(defaults.fetch).toBe(fetch);
	});
});
