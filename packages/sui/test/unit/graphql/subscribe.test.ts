// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { SuiGraphQLClient, SuiGraphQLSubscriptionError } from '../../../src/graphql/index.js';
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
	it('parses UTF-8, split CRLF, multiline data, comments, and complete', async () => {
		const bytes = encoder.encode(
			': keepalive\r\nevent: next\r\ndata: {"data":\r\ndata: {"name":"é"}}\r\n\r\nevent: complete\r\n\r\n',
		);
		const { response } = sse(Array.from(bytes, (byte) => Uint8Array.of(byte)));
		const { client } = clientFor(response);
		expect(
			await collect(client.subscribe({ query: 'subscription { name }', variables: {} })),
		).toEqual([{ data: { name: 'é' } }]);
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
		expect(init.headers).toMatchObject({ Authorization: 'test', Accept: 'text/event-stream' });
		expect(JSON.parse(String(init.body))).toMatchObject({
			variables: { after: 'cursor' },
			operationName: 'Checkpoints',
			extensions: { trace: true },
		});
	});

	it('derives subscription URL without losing query parameters', async () => {
		const fetch = vi.fn(async () => sse(['event: complete\n\n']).response);
		const client = new SuiGraphQLClient({
			url: 'https://example.com/graphql/?key=x',
			network: 'unknown',
			fetch,
		});
		await collect(client.subscribe({ query: 'subscription { value }', variables: {} }));
		expect((fetch.mock.calls[0] as unknown[])[0]).toBe(
			'https://example.com/graphql/subscriptions?key=x',
		);
	});

	it('preserves relative URLs used by browser clients', async () => {
		const fetch = vi.fn(async () => sse(['event: complete\n\n']).response);
		const client = new SuiGraphQLClient({ url: '/graphql/?key=x', network: 'unknown', fetch });
		await collect(client.subscribe({ query: 'subscription { value }', variables: {} }));
		expect((fetch.mock.calls[0] as unknown[])[0]).toBe('/graphql/subscriptions?key=x');
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

	it('return cancels an outstanding next on a quiet subscription', async () => {
		const { response, cancel } = sse([], false);
		const { client } = clientFor(response);
		const iterator = client.subscribe({ query: 'subscription { value }', variables: {} });
		const pending = iterator.next();
		const failure = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		await new Promise((resolve) => setTimeout(resolve, 0));
		await iterator.return(undefined);
		await failure;
		expect(cancel).toHaveBeenCalledOnce();
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

	it.each([
		['EOF', 'event: next\ndata: {"data":1}\n\n', true],
		['malformed JSON', 'event: next\ndata: {\n\n', false],
		['error event', 'event: error\ndata: failed\n\n', false],
	])('reports %s distinctly from normal completion', async (_, body, retryable) => {
		const { client } = clientFor(sse([body]).response);
		await expect(
			collect(client.subscribe({ query: 'subscription { value }', variables: {} })),
		).rejects.toMatchObject({ name: 'SuiGraphQLSubscriptionError', retryable });
	});

	it('bounds an unterminated message and accumulated data lines', async () => {
		for (const chunks of [['data: ' + 'x'.repeat(100)], ['data: 1234567890\n'.repeat(10)]]) {
			const { client } = clientFor(sse(chunks).response);
			await expect(
				collect(
					client.subscribe({ query: 'subscription { value }', variables: {}, maxMessageSize: 50 }),
				),
			).rejects.toThrow('maxMessageSize');
		}
	});

	it.each([401, 429, 503])('preserves HTTP status %s', async (status) => {
		const { client } = clientFor(new Response('', { status }));
		await expect(
			client.subscribe({ query: 'subscription { value }', variables: {} }).next(),
		).rejects.toMatchObject({ status, retryable: status !== 401 });
	});

	it('rejects non-SSE responses', async () => {
		const { client } = clientFor(Response.json({ data: {} }));
		await expect(
			client.subscribe({ query: 'subscription { value }', variables: {} }).next(),
		).rejects.toBeInstanceOf(SuiGraphQLSubscriptionError);
	});
});
