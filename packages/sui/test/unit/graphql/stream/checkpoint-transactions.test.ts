// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { collect, noDelay, take } from '../../client/stream/fake-ledger.js';
import {
	checkpoint,
	fakeGraphQL,
	live,
	page,
	transaction,
	type Answer,
	type Edge,
} from './fake-graphql.js';

const include = { transactions: { effects: false } };
const range = { start: { checkpoint: 1 }, end: { checkpoint: 3 }, retry: noDelay };

const digests = (cp: number, from: number, to: number) =>
	Array.from({ length: to - from }, (_, i) => `tx${cp}-${from + i}`);
const nodes = (cp: number, from: number, to: number) =>
	digests(cp, from, to).map((digest) => transaction(cp, { digest }).node);

/** A checkpoint carrying its first page of transactions, of `count` in all. */
function withTransactions(cp: number, count: number, source?: 'live'): Edge {
	const edge = checkpoint(cp, source);
	const first = Math.min(count, 50);
	return {
		...edge,
		node: {
			...edge.node,
			transactions: {
				// The service cannot tell that a page of exactly 50 is the last.
				pageInfo: { hasNextPage: count >= 50, endCursor: `tx:${cp}:${first}` },
				nodes: nodes(cp, 0, first),
			},
		},
	};
}

/** One `atCheckpoint` page, read at `indexedThrough` (the server's tip by default). */
function transactionsPage(
	cp: number,
	from: number,
	to: number,
	options: { more?: boolean; indexedThrough?: number; first?: number } = {},
): Answer {
	return ({ server }) =>
		Response.json({
			data: {
				serviceConfig: {
					availableRange: {
						first: { sequenceNumber: options.first ?? 0 },
						last: { sequenceNumber: options.indexedThrough ?? server.tip },
					},
				},
				transactions: {
					pageInfo: { hasNextPage: options.more ?? false, endCursor: `tx:${cp}:${to}` },
					nodes: nodes(cp, from, to),
				},
			},
		});
}

const transactionDigests = (frames: { $kind: string }[]) =>
	frames.map((frame) =>
		frame.$kind === 'Checkpoint'
			? (frame as any).checkpoint.transactions.map((tx: { digest: string }) => tx.digest)
			: frame.$kind,
	);

describe('GraphQL checkpoint streams with transactions', () => {
	it('reads each checkpoint with its transactions in one scan request', async () => {
		const server = fakeGraphQL().on(
			'scanCheckpointsWithTransactions',
			page('checkpoints', [withTransactions(1, 2), withTransactions(2, 0)]),
		);
		const frames = await collect(server.client.core.streamCheckpoints({ ...range, include }));
		expect(transactionDigests(frames)).toEqual([digests(1, 0, 2), []]);
		expect(server.requests.map((request) => request.operation)).toEqual([
			'ledgerStreamState',
			'scanCheckpointsWithTransactions',
		]);
		expect(server.sent('scanCheckpointsWithTransactions')[0]).toMatchObject({
			first: 20,
			includeEffects: false,
		});
	});

	it('maps transactions exactly as streamTransactions does', async () => {
		const server = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withTransactions(1, 3)]))
			.on(
				'scanTransactions',
				page(
					'transactions',
					digests(1, 0, 3).map((digest) => transaction(1, { digest })),
				),
			);
		const [checkpointFrame] = await collect(
			server.client.core.streamCheckpoints({
				...range,
				end: { checkpoint: 2 },
				include: { transactions: {} },
			}),
		);
		const transactionFrames = await collect(
			server.client.core.streamTransactions({ ...range, end: { checkpoint: 2 } }),
		);
		expect(checkpointFrame.checkpoint.transactions).toEqual(
			transactionFrames.map(({ transaction }) => transaction.Transaction),
		);
	});

	it('reads the rest of a checkpoint past 50 transactions before delivering it', async () => {
		const server = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withTransactions(1, 120)]))
			.on(
				'checkpointTransactions',
				transactionsPage(1, 50, 100, { more: true }),
				transactionsPage(1, 100, 120),
			);
		const frames = await collect(server.client.core.streamCheckpoints({ ...range, include }));
		expect(transactionDigests(frames)).toEqual([digests(1, 0, 120)]);
		expect(server.sent('checkpointTransactions')).toMatchObject([
			{ atCheckpoint: 1, after: 'tx:1:50' },
			{ atCheckpoint: 1, after: 'tx:1:100' },
		]);
	});

	it('reads the empty page after a checkpoint of exactly 50 transactions once', async () => {
		const server = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withTransactions(1, 50)]))
			.on('checkpointTransactions', transactionsPage(1, 50, 50, { more: true }));
		const frames = await collect(server.client.core.streamCheckpoints({ ...range, include }));
		expect(transactionDigests(frames)).toEqual([digests(1, 0, 50)]);
		expect(server.sent('checkpointTransactions')).toHaveLength(1);
	});

	it('waits for a replica that has not indexed the checkpoint instead of truncating it', async () => {
		const server = fakeGraphQL({ tip: 12 })
			.on(
				'subscribeCheckpointsWithTransactions',
				live('checkpoints', [withTransactions(13, 60, 'live')]),
			)
			.on(
				'checkpointTransactions',
				transactionsPage(13, 50, 50, { indexedThrough: 12 }),
				transactionsPage(13, 50, 60, { indexedThrough: 13 }),
			);
		const [frame] = await take(
			server.client.core.streamCheckpoints({ start: { checkpoint: 13 }, include, retry: noDelay }),
			1,
		);
		expect(transactionDigests([frame])).toEqual([digests(13, 0, 60)]);
		expect(server.sent('checkpointTransactions')).toHaveLength(2);
	});

	it('waits for a lagging replica under the retry policy, not forever', async () => {
		const server = fakeGraphQL({ tip: 12 })
			.on(
				'subscribeCheckpointsWithTransactions',
				live('checkpoints', [withTransactions(13, 60, 'live')]),
			)
			.on('checkpointTransactions', transactionsPage(13, 50, 50, { indexedThrough: 12 }));
		const statuses: string[] = [];
		await expect(
			collect(
				server.client.core.streamCheckpoints({
					start: { checkpoint: 13 },
					include,
					retry: { ...noDelay, maxAttempts: 2 },
					onStatus: (status) => statuses.push(status.$kind),
				}),
			),
		).rejects.toMatchObject({ name: 'SuiGraphQLRequestError', retryable: true });
		expect(statuses.filter((kind) => kind === 'Retrying')).toHaveLength(2);
		expect(server.sent('checkpointTransactions')).toHaveLength(3);
	});

	it('delivers live checkpoints of up to 50 transactions without another request', async () => {
		const server = fakeGraphQL({ tip: 12 }).on(
			'subscribeCheckpointsWithTransactions',
			live('checkpoints', [withTransactions(13, 50 - 1, 'live'), withTransactions(14, 1, 'live')]),
		);
		const frames = await take(
			server.client.core.streamCheckpoints({ start: { checkpoint: 13 }, include }),
			2,
		);
		expect(transactionDigests(frames)).toEqual([digests(13, 0, 49), digests(14, 0, 1)]);
		expect(server.requests.map((request) => request.operation)).toEqual([
			'ledgerStreamState',
			'subscribeCheckpointsWithTransactions',
		]);
	});

	it('fails with HistoryUnavailable when the checkpoint’s transactions are pruned', async () => {
		const server = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withTransactions(1, 60)]))
			.on('checkpointTransactions', transactionsPage(1, 50, 60, { first: 5 }));
		await expect(
			collect(server.client.core.streamCheckpoints({ ...range, include })),
		).rejects.toMatchObject({ code: 'HistoryUnavailable' });
	});
});
