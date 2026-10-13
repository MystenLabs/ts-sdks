// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';

import { SuiGraphQLClient } from '../../../src/graphql/index.js';

const PACKAGE = `0x${'2'.repeat(64)}`;
const SENDER = `0x${'a'.repeat(64)}`;

function eventNode(digest: string, sequenceNumber: number, checkpoint: number | null) {
	return {
		sequenceNumber,
		transaction: {
			digest,
			effects: { checkpoint: checkpoint == null ? null : { sequenceNumber: checkpoint } },
		},
		transactionModule: { package: { address: PACKAGE }, name: 'test' },
		sender: { address: SENDER },
		contents: { type: { repr: `${PACKAGE}::test::Event` }, bcs: '', json: {} },
	};
}

function createClient(
	nodes: ReturnType<typeof eventNode>[],
	checkpointResponses: Array<Array<number | null>>,
) {
	const requests: Array<{ query: string; variables?: Record<string, unknown> }> = [];
	let checkpointRequest = 0;
	const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
		const request = JSON.parse(String(init?.body));
		requests.push(request);

		if (request.query.includes('query listEvents')) {
			return Response.json({
				data: {
					events: {
						pageInfo: {
							hasNextPage: false,
							hasPreviousPage: false,
							startCursor: 'start',
							endCursor: 'end',
						},
						nodes,
					},
				},
			});
		}

		if (request.query.includes('query getTransactionCheckpoints')) {
			const checkpoints = checkpointResponses[checkpointRequest++] ?? [];
			return Response.json({
				data: {
					multiGetTransactionEffects: checkpoints.map((checkpoint) =>
						checkpoint == null
							? { checkpoint: null }
							: { checkpoint: { sequenceNumber: checkpoint } },
					),
				},
			});
		}

		throw new Error(`Unexpected GraphQL request: ${request.query}`);
	});

	return {
		client: new SuiGraphQLClient({
			url: 'https://graphql.test.invalid',
			network: 'unknown',
			fetch,
		}),
		requests,
	};
}

describe('GraphQL listEvents checkpoint resolution', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('issues a single request when every event has a checkpoint', async () => {
		const { client, requests } = createClient(
			[eventNode('digestA', 0, 5), eventNode('digestB', 0, 6)],
			[],
		);

		const result = await client.core.listEvents({});

		expect(result.events.map((event) => event.checkpoint)).toEqual(['5', '6']);
		expect(requests).toHaveLength(1);
	});

	it('looks up missing checkpoints by transaction digest', async () => {
		const { client, requests } = createClient(
			[eventNode('digestA', 0, 5), eventNode('digestB', 0, null), eventNode('digestB', 1, null)],
			[[7]],
		);

		const result = await client.core.listEvents({});

		expect(
			result.events.map((event) => [event.transactionDigest, event.eventIndex, event.checkpoint]),
		).toEqual([
			['digestA', 0, '5'],
			['digestB', 0, '7'],
			['digestB', 1, '7'],
		]);
		const lookups = requests.filter(({ query }) =>
			query.includes('query getTransactionCheckpoints'),
		);
		expect(lookups.map(({ variables }) => variables?.digests)).toEqual([['digestB']]);
	});

	it('retries lookups that are still unresolved', async () => {
		vi.useFakeTimers();
		const { client, requests } = createClient(
			[eventNode('digestA', 0, null), eventNode('digestB', 0, null)],
			[[null, 9], [8]],
		);

		const promise = client.core.listEvents({});
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.events.map((event) => event.checkpoint)).toEqual(['8', '9']);
		const lookups = requests.filter(({ query }) =>
			query.includes('query getTransactionCheckpoints'),
		);
		expect(lookups.map(({ variables }) => variables?.digests)).toEqual([
			['digestA', 'digestB'],
			['digestA'],
		]);
	});

	it('throws after the retries when a checkpoint never resolves', async () => {
		vi.useFakeTimers();
		const { client, requests } = createClient(
			[eventNode('digestA', 0, null)],
			[[null], [null], [null]],
		);

		const promise = client.core.listEvents({});
		const assertion = expect(promise).rejects.toThrow(
			'listEvents response is missing the checkpoint for transaction digestA',
		);
		await vi.runAllTimersAsync();
		await assertion;

		expect(
			requests.filter(({ query }) => query.includes('query getTransactionCheckpoints')),
		).toHaveLength(3);
	});

	it('stops retrying when the signal is aborted', async () => {
		vi.useFakeTimers();
		const { client, requests } = createClient(
			[eventNode('digestA', 0, null)],
			[[null], [null], [null]],
		);
		const controller = new AbortController();

		const promise = client.core.listEvents({ signal: controller.signal });
		const assertion = expect(promise).rejects.toThrow('stop');
		await vi.advanceTimersByTimeAsync(0);
		controller.abort(new Error('stop'));
		await vi.runAllTimersAsync();
		await assertion;

		expect(
			requests.filter(({ query }) => query.includes('query getTransactionCheckpoints')),
		).toHaveLength(1);
	});
});
