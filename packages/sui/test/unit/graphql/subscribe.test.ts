// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { SuiGraphQLClient, SuiGraphQLRequestError } from '../../../src/graphql/index.js';
import { graphql } from '../../../src/graphql/schema/index.js';

const encoder = new TextEncoder();
function sse(chunks: (string | Uint8Array)[], close = true) {
	const cancel = vi.fn();
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks)
				controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
			if (close) controller.close();
		},
		cancel,
	});
	return {
		response: new Response(body, {
			headers: { 'content-type': 'text/event-stream; charset=utf-8' },
		}),
		cancel,
	};
}
function clientFor(response: Response) {
	const fetch = vi.fn(async () => response);
	return {
		client: new SuiGraphQLClient({ url: 'https://example.com/graphql', network: 'unknown', fetch }),
		fetch,
	};
}
async function collect<T>(source: AsyncIterable<T>) {
	const values: T[] = [];
	for await (const value of source) values.push(value);
	return values;
}

describe('GraphQL subscribe', () => {
	it('reports a body-read failure as Unavailable without reconnecting', async () => {
		const cause = new TypeError('socket closed');
		const { client, fetch } = clientFor(
			new Response(
				new ReadableStream({
					start(controller) {
						controller.error(cause);
					},
				}),
				{ headers: { 'content-type': 'text/event-stream' } },
			),
		);
		await expect(
			client.subscribe({ query: 'subscription { value }' }).next(),
		).rejects.toMatchObject({ name: 'SuiGraphQLRequestError', reason: 'Unavailable', cause });
		expect(fetch).toHaveBeenCalledOnce();
	});

	it('keeps serialization failures outside the retryable fetch boundary', async () => {
		const { client, fetch } = clientFor(sse(['event: complete\n\n']).response);
		const variables: Record<string, unknown> = {};
		variables.self = variables;
		await expect(client.query({ query: '{ value }', variables })).rejects.toBeInstanceOf(TypeError);
		await expect(
			client.subscribe({ query: 'subscription { value }', variables }).next(),
		).rejects.toBeInstanceOf(TypeError);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('parses chunked SSE end to end', async () => {
		const bytes = encoder.encode(
			'\uFEFF: keepalive\r\nevent: next\r\ndata: {"data":\r\ndata: {"name":"é漢🙂"}}\r\n\r\nevent: complete\r\n\r\n',
		);
		const { response } = sse(Array.from(bytes, (byte) => Uint8Array.of(byte)));
		const { client } = clientFor(response);
		expect(await collect(client.subscribe({ query: 'subscription { name }' }))).toEqual([
			{ data: { name: 'é漢🙂' } },
		]);
	});

	it('preserves partial data, GraphQL errors and extensions', async () => {
		const result = {
			data: { value: null },
			errors: [{ message: 'partial', path: ['value'], extensions: { code: 'FAILED' } }],
			extensions: { a: 1 },
		};
		const { client } = clientFor(
			sse([`event: next\ndata: ${JSON.stringify(result)}\n\nevent: complete\n\n`]).response,
		);
		expect(
			await collect(client.subscribe({ query: 'subscription { value }', variables: {} })),
		).toEqual([result]);
	});

	it('sends typed documents, variables and operation metadata to the configured endpoint', async () => {
		const fetch = vi.fn(async () => sse(['event: complete\n\n']).response);
		const client = new SuiGraphQLClient({
			url: 'https://query.invalid/graphql',
			subscriptionUrl: 'https://stream.invalid/custom',
			network: 'unknown',
			headers: { Authorization: 'test' },
			fetch,
		});
		const query = graphql(
			'subscription Checkpoints($after: String) { checkpoints(after: $after) { cursor node { sequenceNumber } } }',
		);
		await collect(
			client.subscribe({
				query,
				variables: { after: 'cursor' },
				operationName: 'Checkpoints',
				extensions: { trace: true },
			}),
		);
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://stream.invalid/custom');
		const headers = new Headers(init.headers);
		expect(headers.get('Authorization')).toBe('test');
		expect(headers.get('Accept')).toBe('text/event-stream');
		expect(headers.get('x-sui-client-protocol-version')).not.toBeNull();
		expect(JSON.parse(String(init.body))).toMatchObject({
			variables: { after: 'cursor' },
			operationName: 'Checkpoints',
			extensions: { trace: true },
		});
	});

	it('reports a rejected fetch as Unavailable', async () => {
		const cause = new TypeError('fetch failed');
		const client = new SuiGraphQLClient({
			url: '/graphql',
			network: 'unknown',
			fetch: async () => {
				throw cause;
			},
		});
		for (const request of [
			() => client.query({ query: '{ value }', variables: {} }),
			() => client.subscribe({ query: 'subscription { value }' }).next(),
		]) {
			const error = await request().catch((e: unknown) => e);
			expect(error).toBeInstanceOf(SuiGraphQLRequestError);
			expect(error).toMatchObject({ reason: 'Unavailable', cause });
		}
	});

	it('does no network work until iteration begins and aborts on early return', async () => {
		const { response, cancel } = sse(['event: next\ndata: {"data":{"value":1}}\n\n'], false);
		const { client, fetch } = clientFor(response);
		const iterator = client.subscribe({ query: 'subscription { value }', variables: {} });
		expect(fetch).not.toHaveBeenCalled();
		await iterator.next();
		await iterator.return(undefined);
		expect(cancel).toHaveBeenCalledOnce();
		const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init.signal?.aborted).toBe(true);
	});

	it('stops before delivering another buffered result after abort', async () => {
		const controller = new AbortController();
		const { response } = sse(
			['event: next\ndata: {"data":1}\n\nevent: next\ndata: {"data":2}\n\n'],
			false,
		);
		const { client } = clientFor(response);
		const iterator = client.subscribe({
			query: 'subscription { value }',
			signal: controller.signal,
		});
		expect(await iterator.next()).toMatchObject({ value: { data: 1 } });
		controller.abort(new Error('stop'));
		await expect(iterator.next()).rejects.toThrow('stop');
	});

	it('return ends an outstanding next on a quiet subscription', async () => {
		const { response, cancel } = sse([], false);
		const { client } = clientFor(response);
		const iterator = client.subscribe({ query: 'subscription { value }', variables: {} });
		const pending = iterator.next();
		await new Promise((resolve) => setTimeout(resolve, 0));
		await iterator.return(undefined);
		await expect(pending).resolves.toEqual({ value: undefined, done: true });
		expect(cancel).toHaveBeenCalledOnce();
	});

	it('ignores events it does not know', async () => {
		const { client } = clientFor(
			sse(['event: ping\ndata: {}\n\nevent: next\ndata: {"data":{"value":1}}\n\n']).response,
		);
		expect(await collect(client.subscribe({ query: 'subscription { value }' }))).toEqual([
			{ data: { value: 1 } },
		]);
	});

	it('reports a malformed query response as a request error', async () => {
		const { client } = clientFor(new Response('{', { status: 200 }));
		await expect(client.query({ query: '{ value }', variables: {} })).rejects.toMatchObject({
			name: 'SuiGraphQLRequestError',
			reason: undefined,
		});
	});

	it('propagates abort reasons and cleans up a quiet response', async () => {
		const { response, cancel } = sse([], false);
		const { client } = clientFor(response);
		const abort = new AbortController();
		const pending = client
			.subscribe({ query: 'subscription { value }', variables: {}, signal: abort.signal })
			.next();
		const error = new Error('stop');
		const failure = expect(pending).rejects.toBe(error);
		await new Promise((resolve) => setTimeout(resolve, 0));
		abort.abort(error);
		await failure;
		expect(cancel).toHaveBeenCalledOnce();
	});

	it('completes raw subscriptions when the server closes after its results', async () => {
		const { client } = clientFor(sse(['event: next\ndata: {"data":{"value":1}}\n\n']).response);
		expect(await collect(client.subscribe({ query: 'subscription { value }' }))).toEqual([
			{ data: { value: 1 } },
		]);
	});

	it('honors a data-free complete event without waiting for EOF', async () => {
		const { response, cancel } = sse(['event: complete\n\n'], false);
		const { client } = clientFor(response);
		expect(await collect(client.subscribe({ query: 'subscription { value }' }))).toEqual([]);
		expect(cancel).toHaveBeenCalledOnce();
	});

	it('yields earlier results before a later malformed message in the same chunk', async () => {
		const { client } = clientFor(
			sse(['event: next\ndata: {"data":1}\n\nevent: next\ndata: {\n\n']).response,
		);
		const iterator = client.subscribe({ query: 'subscription { value }' });
		expect(await iterator.next()).toMatchObject({ value: { data: 1 }, done: false });
		await expect(iterator.next()).rejects.toThrow('Invalid GraphQL subscription response');
	});

	it.each([
		['malformed JSON', 'event: next\ndata: {\n\n'],
		['error event', 'event: error\ndata: failed\n\n'],
	])('reports %s distinctly from normal completion', async (_, body) => {
		const { client } = clientFor(sse([body]).response);
		await expect(
			collect(client.subscribe({ query: 'subscription { value }', variables: {} })),
		).rejects.toMatchObject({ name: 'SuiGraphQLRequestError', reason: undefined });
	});

	it('rejects non-SSE responses', async () => {
		const { client } = clientFor(Response.json({ data: {} }));
		await expect(
			client.subscribe({ query: 'subscription { value }', variables: {} }).next(),
		).rejects.toBeInstanceOf(SuiGraphQLRequestError);
	});

	it.each([
		[400, undefined],
		[401, undefined],
		[408, 'ServerError'],
		[429, 'RateLimited'],
		[500, 'ServerError'],
		[501, undefined],
		[502, 'ServerError'],
		[503, 'Unavailable'],
		[504, 'ServerError'],
	])('classifies HTTP %i for queries and subscriptions', async (status, reason) => {
		for (const request of [
			(client: SuiGraphQLClient) => client.query({ query: '{ value }', variables: {} }),
			(client: SuiGraphQLClient) => client.subscribe({ query: 'subscription { value }' }).next(),
		]) {
			const error = await request(clientFor(new Response('', { status })).client).catch(
				(e: unknown) => e,
			);
			expect(error).toBeInstanceOf(SuiGraphQLRequestError);
			expect(error).toMatchObject({ reason });
		}
	});

	it('rejects an error response without waiting for its body to cancel', async () => {
		// A teed branch only finishes cancelling once the other branch is cancelled too.
		const [body, other] = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(encoder.encode('unavailable'));
			},
		}).tee();
		const { client } = clientFor(new Response(body, { status: 503 }));
		await expect(
			client.subscribe({ query: 'subscription { value }' }).next(),
		).rejects.toMatchObject({ reason: 'Unavailable' });
		await other.cancel();
	});
});

describe('SuiGraphQLClient URLs', () => {
	const customFetch = async () => sse(['event: complete\n\n']).response;

	it.each([
		['an https URL', 'https://example.com/graphql', false],
		['an http URL', 'http://localhost:9000/graphql', false],
		['a path with a custom fetch', '/graphql', true],
	])('accepts %s', (_, url, withFetch) => {
		expect(
			() =>
				new SuiGraphQLClient({
					url,
					network: 'unknown',
					fetch: withFetch ? customFetch : undefined,
				}),
		).not.toThrow();
	});

	it.each([
		['a path without a custom fetch or a page', '/graphql'],
		['a bare host', 'graphql'],
		['an empty URL', ''],
		['another scheme', 'ftp://x'],
	])('rejects %s', (_, url) => {
		expect(() => new SuiGraphQLClient({ url, network: 'unknown' })).toThrow('SuiGraphQLClient url');
	});

	it('validates subscriptionUrl too', () => {
		expect(
			() =>
				new SuiGraphQLClient({
					url: 'https://example.com/graphql',
					subscriptionUrl: 'stream',
					network: 'unknown',
				}),
		).toThrow('subscriptionUrl');
	});

	it.each([
		['https://example.com/graphql', 'https://example.com/graphql/subscriptions'],
		['https://example.com/graphql/?key=x', 'https://example.com/graphql/subscriptions?key=x'],
		['https://example.com/graphql#a', 'https://example.com/graphql/subscriptions#a'],
		['/graphql/', '/graphql/subscriptions'],
	])('subscribes to %s at %s by default', async (url, expected) => {
		const fetch = vi.fn(customFetch);
		const client = new SuiGraphQLClient({ url, network: 'unknown', fetch });
		await collect(client.subscribe({ query: 'subscription { value }' }));
		expect((fetch.mock.calls[0] as unknown[])[0]).toBe(expected);
	});
});
