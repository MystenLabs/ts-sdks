// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { collect, noDelay, take } from '../../client/stream/fake-ledger.js';
import {
	checkpoint,
	event,
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
	options: { more?: boolean; indexedThrough?: number; count?: number | null } = {},
): Answer {
	// Running totals before and through the checkpoint, when the test gives its count; `null`: the
	// server no longer has the previous checkpoint.
	const totals =
		options.count === undefined
			? {}
			: {
					total: { networkTotalTransactions: 1_000 + (options.count ?? 0) },
					previousTotal: options.count === null ? null : { networkTotalTransactions: 1_000 },
				};
	return ({ server }) =>
		Response.json({
			data: {
				checkpoint: { sequenceNumber: options.indexedThrough ?? server.tip },
				...totals,
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
			? (frame as any).checkpoint.transactions.map(
					(result: { Transaction?: { digest: string }; FailedTransaction?: { digest: string } }) =>
						(result.Transaction ?? result.FailedTransaction)!.digest,
				)
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
		const populated = {
			effects: {
				events: {
					pageInfo: { hasNextPage: false },
					nodes: [event(1, 0).node, event(1, 1).node],
				},
				objectChanges: {
					nodes: [
						{
							address: '0x3',
							outputState: { asMoveObject: { contents: { type: { repr: '0x2::test::Object' } } } },
						},
					],
				},
			},
		};
		const failed = { effects: { status: 'FAILURE' } };
		const transactions = [
			transaction(1, { digest: 'tx1-0', node: populated }),
			transaction(1, { digest: 'tx1-1', node: failed }),
		];
		const edge = checkpoint(1);
		const withPopulated: Edge = {
			...edge,
			node: {
				...edge.node,
				transactions: {
					pageInfo: { hasNextPage: false, endCursor: 'tx:1:2' },
					nodes: transactions.map(({ node }) => node),
				},
			},
		};
		const server = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withPopulated]))
			.on('scanTransactions', page('transactions', transactions));
		const transactionInclude = { events: true, objectTypes: true } as const;
		const [checkpointFrame] = await collect(
			server.client.core.streamCheckpoints({
				...range,
				end: { checkpoint: 2 },
				include: { transactions: transactionInclude },
			}),
		);
		const transactionFrames = await collect(
			server.client.core.streamTransactions({
				...range,
				end: { checkpoint: 2 },
				include: transactionInclude,
			}),
		);
		expect(checkpointFrame.checkpoint.transactions).toEqual(
			transactionFrames.map(({ transaction }) => transaction),
		);
		expect(transactionFrames.map(({ transaction }) => transaction.$kind)).toEqual([
			'Transaction',
			'FailedTransaction',
		]);
		expect(checkpointFrame.checkpoint.transactions[0].Transaction?.events).toHaveLength(2);
		const selection = (variables: Record<string, unknown>) =>
			Object.fromEntries(Object.entries(variables).filter(([key]) => key.startsWith('include')));
		expect(selection(server.sent('scanCheckpointsWithTransactions')[0])).toEqual(
			selection(server.sent('scanTransactions')[0]),
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

	it('checks the transactions read against the checkpoint’s transaction count', async () => {
		const complete = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withTransactions(1, 60)]))
			.on('checkpointTransactions', transactionsPage(1, 50, 60, { count: 60 }));
		const frames = await collect(complete.client.core.streamCheckpoints({ ...range, include }));
		expect(transactionDigests(frames)).toEqual([digests(1, 0, 60)]);
		expect(complete.sent('checkpointTransactions')[0]).toMatchObject({
			previousCheckpoint: 0,
			hasPrevious: true,
		});

		// Totals are read once, on the first follow-up page.
		const paged = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withTransactions(1, 120)]))
			.on(
				'checkpointTransactions',
				transactionsPage(1, 50, 100, { more: true, count: 120 }),
				transactionsPage(1, 100, 120),
			);
		await collect(paged.client.core.streamCheckpoints({ ...range, include }));
		expect(paged.sent('checkpointTransactions').map((v) => v.withTotals)).toEqual([true, false]);

		// Without the previous checkpoint's total the count is unknown, and the pages are trusted.
		const unknown = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withTransactions(1, 60)]))
			.on('checkpointTransactions', transactionsPage(1, 50, 60, { count: null }));
		const read = await collect(unknown.client.core.streamCheckpoints({ ...range, include }));
		expect(transactionDigests(read)).toEqual([digests(1, 0, 60)]);

		// A server that no longer has some of them ends the pages early.
		const pruned = fakeGraphQL()
			.on('scanCheckpointsWithTransactions', page('checkpoints', [withTransactions(1, 120)]))
			.on('checkpointTransactions', transactionsPage(1, 50, 50, { count: 120 }));
		await expect(
			collect(pruned.client.core.streamCheckpoints({ ...range, include })),
		).rejects.toMatchObject({ code: 'HistoryUnavailable' });
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
			server.client.core.streamCheckpoints({
				start: { checkpoint: 13 },
				include,
				pollInterval: 1,
				retry: noDelay,
			}),
			1,
		);
		expect(transactionDigests([frame])).toEqual([digests(13, 0, 60)]);
		expect(server.sent('checkpointTransactions')).toHaveLength(2);
	});

	it('waits for a lagging replica without spending the retry budget', async () => {
		const server = fakeGraphQL({ tip: 12 })
			.on(
				'subscribeCheckpointsWithTransactions',
				live('checkpoints', [withTransactions(13, 60, 'live')]),
			)
			.on(
				'checkpointTransactions',
				transactionsPage(13, 50, 50, { indexedThrough: 12 }),
				transactionsPage(13, 50, 50, { indexedThrough: 12 }),
				transactionsPage(13, 50, 60, { indexedThrough: 13 }),
			);
		const statuses: string[] = [];
		const [frame] = await take(
			server.client.core.streamCheckpoints({
				start: { checkpoint: 13 },
				include,
				pollInterval: 1,
				retry: { ...noDelay, maxAttempts: 0 },
				onStatus: (status) => statuses.push(status.$kind),
			}),
			1,
		);
		expect(transactionDigests([frame])).toEqual([digests(13, 0, 60)]);
		expect(statuses).not.toContain('Retrying');
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
});
