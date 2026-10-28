// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiStreamError, type SuiClientTypes } from '../../../../src/client/index.js';
import { SuiGraphQLRequestError, type SuiGraphQLClient } from '../../../../src/graphql/index.js';
import {
	Transaction as GrpcTransaction,
	TransactionExpiration_TransactionExpirationKind as ExpirationKind,
	TransactionKind_Kind as Kind,
} from '../../../../src/grpc/proto/sui/rpc/v2/transaction.js';
import { collect, noDelay, statusLog, take } from '../../client/stream/fake-ledger.js';
import {
	after,
	brokenBody,
	checkpoint,
	event,
	fakeGraphQL,
	httpStatus,
	live,
	liveMessages,
	networkFailure,
	page,
	reply,
	transaction,
	type Answer,
	type Edge,
	type FakeServer,
} from './fake-graphql.js';

type Family = 'checkpoints' | 'transactions' | 'events';
type Frame =
	| SuiClientTypes.StreamCheckpointFrame
	| SuiClientTypes.StreamTransactionFrame<any>
	| SuiClientTypes.StreamEventFrame
	| SuiClientTypes.StreamProgressFrame
	| SuiClientTypes.StreamCompletionFrame;

/** Fast polling and retries; tests override what they assert on. */
const fast = { pollInterval: 1, retry: noDelay };

function stream(
	client: SuiGraphQLClient,
	family: Family,
	options: SuiClientTypes.StreamTransactionsOptions<any, any> = {},
): AsyncGenerator<Frame> {
	const merged = { ...fast, ...options };
	switch (family) {
		case 'checkpoints':
			return client.streamCheckpoints(merged);
		case 'transactions':
			return client.streamTransactions(merged);
		case 'events':
			return client.streamEvents(merged);
	}
}

/** `10` for a checkpoint, `tx3` for a transaction, `3:1` for an event. */
function label(frame: Frame): string {
	switch (frame.$kind) {
		case 'Checkpoint':
			return frame.checkpoint.sequenceNumber;
		case 'Transaction':
			return (frame.transaction.Transaction ?? frame.transaction.FailedTransaction).digest;
		case 'Event':
			return `${frame.event.checkpoint}:${frame.event.eventIndex}`;
		default:
			return frame.$kind;
	}
}

function token(frame: Frame | undefined): string {
	if (!frame || frame.$kind === 'Complete') throw new Error('frame has no token');
	return frame.resumeToken;
}

/** Resume tokens of a follow stream whose subscription delivers `edges`. */
async function followTokens(family: Family, edges: Edge[]): Promise<string[]> {
	const seed = fakeGraphQL({ tip: 10 }).on(subscribeOperation(family), live(family, edges));
	const frames = await take(
		stream(seed.client, family, { start: { checkpoint: 1 } }),
		edges.length,
	);
	return frames.map(token);
}

function subscribeOperation(family: Family) {
	return `subscribe${family[0].toUpperCase()}${family.slice(1)}`;
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error('expected a rejection');
}

describe('historical scan', () => {
	it('captures the indexed cutoff once, pages descending, and keeps the lower bound', async () => {
		const server = fakeGraphQL({ tip: 10 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(9), checkpoint(10)], { more: true }),
			page('checkpoints', [checkpoint(7), checkpoint(8)]),
		);
		const frames = await collect(
			stream(server.client, 'checkpoints', {
				order: 'descending',
				end: { checkpoint: 6 },
				frames: { completion: true },
			}),
		);
		expect(frames.map(label)).toEqual(['10', '9', '8', '7', 'Complete']);
		const scans = server.sent('scanCheckpoints');
		expect(scans[0]).toMatchObject({
			filter: { afterCheckpoint: 6, beforeCheckpoint: 11 },
			last: 50,
		});
		expect(scans[1]).toMatchObject({
			filter: { afterCheckpoint: 6, beforeCheckpoint: 11 },
			before: checkpoint(9).cursor,
		});
	});

	it('reads a descending interval whose excluded end checkpoint has been pruned', async () => {
		const [anchor] = await followTokens('checkpoints', [checkpoint(10)]);
		const server = fakeGraphQL({ tip: 20, first: 11 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(11), checkpoint(12)]),
		);
		const frames = await collect(
			stream(server.client, 'checkpoints', {
				order: 'descending',
				start: { checkpoint: 12 },
				end: { resumeToken: anchor },
			}),
		);
		expect(frames.map(label)).toEqual(['12', '11']);
		expect(server.sent('scanCheckpoints')[0].filter.afterCheckpoint).toBe(10);
	});

	it('resumes after a checkpoint that has since been pruned, by its sequence number', async () => {
		const [anchor] = await followTokens('checkpoints', [checkpoint(10)]);
		const server = fakeGraphQL({ tip: 20, first: 11 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(11)]),
		);
		const frames = await collect(
			stream(server.client, 'checkpoints', {
				start: { resumeToken: anchor },
				end: { checkpoint: 12 },
			}),
		);
		expect(frames.map(label)).toEqual(['11']);
		// A checkpoint resumes by its sequence number alone.
		const [request] = server.sent('scanCheckpoints');
		expect(request).toMatchObject({ filter: { afterCheckpoint: 10, beforeCheckpoint: 12 } });
		expect(request.after).toBeUndefined();
	});

	it('keeps a finite cutoff when resuming after the indexed tip grew', async () => {
		const first = fakeGraphQL({ tip: 2 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(1), checkpoint(2)]),
		);
		const [frame] = await take(
			stream(first.client, 'checkpoints', { start: { checkpoint: 1 }, follow: false }),
			1,
		);
		const second = fakeGraphQL({ tip: 50 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(2)]),
		);
		await collect(stream(second.client, 'checkpoints', { start: { resumeToken: token(frame) } }));
		expect(first.sent('scanCheckpoints')).toHaveLength(1);
		expect(second.sent('scanCheckpoints')[0].filter.beforeCheckpoint).toBe(3);
	});

	it('fails with HistoryUnavailable, delivering nothing, when the start has been pruned', async () => {
		const server = fakeGraphQL({ tip: 20, first: 5 });
		// The server reads from its oldest retained checkpoint instead.
		server.on('scanCheckpoints', page('checkpoints', [checkpoint(5)]));
		const source = stream(server.client, 'checkpoints', {
			start: { checkpoint: 2 },
			end: { checkpoint: 6 },
			retry: { ...noDelay, maxAttempts: 3 },
		});
		const labels: string[] = [];
		const error = await rejection(
			(async () => {
				for await (const frame of source) labels.push(label(frame));
			})(),
		);
		expect(error).toMatchObject({ name: 'SuiStreamError', code: 'HistoryUnavailable' });
		expect(labels).toEqual([]);
		// The retention read with the tip already rules the start out.
		expect(server.sent('scanCheckpoints')).toHaveLength(0);
	});

	it('fails a descending read whose start has been pruned with HistoryUnavailable', async () => {
		const server = fakeGraphQL({ tip: 20, first: 9 }).on(
			'scanCheckpoints',
			page('checkpoints', []),
		);
		const error = await rejection(
			collect(
				stream(server.client, 'checkpoints', {
					order: 'descending',
					start: { checkpoint: 3 },
					frames: { completion: true },
					retry: { ...noDelay, maxAttempts: 0 },
				}),
			),
		);
		expect(error).toMatchObject({ name: 'SuiStreamError', code: 'HistoryUnavailable' });
	});

	it('fails with HistoryUnavailable when retention passes unread checkpoints between pages', async () => {
		const server = fakeGraphQL({ tip: 30, first: 10 });
		server.on(
			'scanCheckpoints',
			after(() => (server.first = 20), page('checkpoints', [checkpoint(10)], { more: true })),
			page('checkpoints', [checkpoint(20), checkpoint(21)]),
		);
		const labels: string[] = [];
		const error = await rejection(
			(async () => {
				for await (const frame of stream(server.client, 'checkpoints', {
					start: { checkpoint: 10 },
					end: { checkpoint: 22 },
					frames: { completion: true },
					retry: { ...noDelay, maxAttempts: 0 },
				}))
					labels.push(label(frame));
			})(),
		);
		expect(error).toMatchObject({ name: 'SuiStreamError', code: 'HistoryUnavailable' });
		expect(labels).toEqual(['10']);
	});

	it('reads newest first down to the oldest retained checkpoint, then completes there', async () => {
		const server = fakeGraphQL({ tip: 12, first: 11 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(11), checkpoint(12)]),
		);
		const frames = await collect(
			stream(server.client, 'checkpoints', {
				order: 'descending',
				frames: { completion: true },
				retry: { ...noDelay, maxAttempts: 0 },
			}),
		);
		expect(frames.map(label)).toEqual(['12', '11', 'Complete']);
		expect(frames.at(-1)).toMatchObject({ completion: { reason: 'retentionLimit' } });
		// The server stops at its oldest retained checkpoint.
		expect(server.sent('scanCheckpoints')[0].filter.afterCheckpoint).toBeUndefined();
	});

	it('reads transactions and events from far back whatever availableRange reports', async () => {
		// Servers with subscriptions answer transactions and events from the fullnode; the
		// retention availableRange reports is their Postgres index's, so the stream never asks.
		const server = fakeGraphQL({ tip: 1_000, first: 900 });
		server.on('scanEvents', page('events', [event(10)]));
		server.on('subscribeEvents', live('events', [event(20)]));
		const finite = await collect(
			stream(server.client, 'events', { start: { checkpoint: 10 }, end: { checkpoint: 11 } }),
		);
		expect(finite.map(label)).toEqual(['10:0']);

		const [followed] = await take(
			stream(server.client, 'events', { start: { checkpoint: 10 } }),
			1,
		);
		expect(label(followed)).toBe('20:0');
		expect(server.sent('ledgerStreamState').every((v) => v.checkpointRetention === false)).toBe(
			true,
		);
	});

	it('waits for a future exclusive end even when nothing matches', async () => {
		const server = fakeGraphQL({ tip: 1 });
		server.on(
			'scanEvents',
			after(() => (server.tip = 3), page('events', [])),
			page('events', []),
		);
		const frames = await collect(
			stream(server.client, 'events', {
				start: { checkpoint: 1 },
				end: { checkpoint: 4 },
				frames: { completion: true },
			}),
		);
		expect(server.sent('scanEvents')).toHaveLength(2);
		expect(frames).toMatchObject([
			{ $kind: 'Complete', completion: { reason: 'checkpointBound' } },
		]);
	});

	it('advances through empty scan-limited pages within the end checkpoint', async () => {
		const [older, newer] = await followTokens('events', [event(1), event(5)]);
		const frontier = 'history:frontier:3';
		const server = fakeGraphQL().on(
			'scanEvents',
			page('events', [], { more: true, cursor: frontier }),
			page('events', [event(3)]),
		);
		const frames = await collect(
			stream(server.client, 'events', {
				start: { resumeToken: older },
				end: { resumeToken: newer },
				frames: { progress: true },
			}),
		);
		// Then the boundary before the end item's checkpoint.
		expect(frames.map(label)).toEqual(['Progress', '3:0', 'Progress']);
		expect(server.sent('scanEvents')[1]).toMatchObject({
			after: frontier,
			filter: { beforeCheckpoint: 6 },
		});

		// Resuming from the progress token continues from the frontier without rereading.
		const resumed = fakeGraphQL().on('scanEvents', page('events', [event(3)]));
		const again = await collect(
			stream(resumed.client, 'events', {
				start: { resumeToken: token(frames[0]) },
				end: { resumeToken: newer },
			}),
		);
		expect(again.map(label)).toEqual(['3:0']);
		// The token's coverage bounds the read from below as well.
		expect(resumed.sent('scanEvents')).toEqual([
			expect.objectContaining({
				after: frontier,
				filter: { afterCheckpoint: 0, beforeCheckpoint: 6 },
			}),
		]);
	});

	it('rejects pagination that does not advance, without retrying', async () => {
		const server = fakeGraphQL().on('scanEvents', page('events', [], { more: true }));
		const error = await rejection(
			collect(
				stream(server.client, 'events', {
					start: { checkpoint: 1 },
					end: { checkpoint: 2 },
					retry: { ...noDelay, maxAttempts: 3 },
				}),
			),
		);
		expect(error).toMatchObject({
			code: 'Protocol',
			message: expect.stringContaining('no cursor'),
		});
		expect(server.sent('scanEvents')).toHaveLength(1);
	});

	it('reports Page statuses with the checkpoint each page covered', async () => {
		const server = fakeGraphQL().on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(1), checkpoint(2)], { more: true }),
			page('checkpoints', [checkpoint(3)]),
		);
		const statuses: SuiClientTypes.StreamStatus[] = [];
		await collect(
			stream(server.client, 'checkpoints', {
				start: { checkpoint: 1 },
				end: { checkpoint: 4 },
				onStatus: (status) => statuses.push(status),
			}),
		);
		expect(statuses).toEqual([
			{ $kind: 'Connecting', attempt: 0 },
			{ $kind: 'Connected' },
			{ $kind: 'Page', stage: 'history', end: 'limit', coveredCheckpoint: '2' },
			{ $kind: 'Page', stage: 'history', end: 'bound', coveredCheckpoint: '3' },
		]);
	});

	it('maps genesis with transaction details', async () => {
		// `transactionJson` is the gRPC JSON encoding of the transaction.
		const genesis = GrpcTransaction.toJson(
			GrpcTransaction.create({
				sender: '0x0',
				gasPayment: { objects: [], owner: '0x0', price: 1n, budget: 0n },
				expiration: { kind: ExpirationKind.NONE },
				kind: { kind: Kind.GENESIS, data: { oneofKind: 'genesis', genesis: { objects: [] } } },
			}),
		);
		const server = fakeGraphQL().on(
			'scanTransactions',
			page('transactions', [
				transaction(0, { digest: 'genesis', node: { transactionJson: genesis } }),
			]),
		);
		const [frame] = await collect(
			server.client.streamTransactions({
				start: { checkpoint: 0 },
				end: { checkpoint: 1 },
				include: { transaction: true },
			}),
		);
		expect(frame.transaction.Transaction?.transaction.kind).toEqual({
			$kind: 'Genesis',
			Genesis: { objects: [] },
		});
		expect(frame.transaction.Transaction?.bcs).toBeUndefined();
	});
});

describe('resumable empty passes', () => {
	it('resumes after everything a pass read, even when its last page had items', async () => {
		const server = fakeGraphQL({ tip: 100 });
		server.on(
			'scanEvents',
			// Then checkpoint 1 is pruned before the next poll.
			after(
				() => {
					server.tip = 101;
					server.first = 50;
				},
				page('events', [event(1)]),
			),
			page('events', [event(101)]),
		);
		const frames = await take(
			stream(server.client, 'events', {
				start: { checkpoint: 1 },
				delivery: 'poll',
				frames: { progress: true },
				retry: { ...noDelay, maxAttempts: 0 },
			}),
			3,
		);
		expect(frames.map(label)).toEqual(['1:0', 'Progress', '101:0']);
		expect(frames[1]).toMatchObject({ coveredCheckpoint: '100' });
		expect(server.sent('scanEvents')[1]).toMatchObject({ filter: { afterCheckpoint: 100 } });
		expect(server.sent('scanEvents')[1].after).toBeUndefined();
	});

	it('does not skip what a lagging replica had not indexed when it answered', async () => {
		const server = fakeGraphQL({ tip: 100 });
		server.on(
			'scanEvents',
			// The state read saw 100, but the page came from a replica at 95.
			page('events', [event(90)], { viewedAt: 95 }),
			page('events', [event(98)], { viewedAt: 100 }),
		);
		const frames = await take(
			stream(server.client, 'events', { start: { checkpoint: 90 }, delivery: 'poll' }),
			2,
		);
		expect(frames.map(label)).toEqual(['90:0', '98:0']);
		expect(server.sent('scanEvents')[1].filter).toMatchObject({ afterCheckpoint: 95 });
	});

	it('reads a descending range again when a replica behind its start answered', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(7), checkpoint(8)], { viewedAt: 8 }),
			page('checkpoints', [checkpoint(7), checkpoint(8), checkpoint(9), checkpoint(10)]),
		);
		const frames = await collect(
			stream(server.client, 'checkpoints', {
				order: 'descending',
				start: { checkpoint: 10 },
				end: { checkpoint: 6 },
			}),
		);
		expect(frames.map(label)).toEqual(['10', '9', '8', '7']);
		expect(server.sent('scanCheckpoints')).toHaveLength(2);
	});

	it('resumes after what a lagging replica answering a later ascending page had indexed', async () => {
		const server = fakeGraphQL({ tip: 100 });
		server.on(
			'scanEvents',
			page('events', [event(90)], { more: true }),
			page('events', [], { viewedAt: 92 }),
			page('events', [event(95)]),
		);
		const frames = await take(
			stream(server.client, 'events', { start: { checkpoint: 90 }, delivery: 'poll' }),
			2,
		);
		expect(frames.map(label)).toEqual(['90:0', '95:0']);
		expect(server.sent('scanEvents')[2].filter).toMatchObject({ afterCheckpoint: 92 });
	});

	it('reads a descending range again when a later page comes from a lagging replica', async () => {
		const server = fakeGraphQL({ tip: 100 });
		const checkpoints = (from: number, to: number) =>
			Array.from({ length: to - from + 1 }, (_, i) => checkpoint(from + i));
		server.on(
			'scanCheckpoints',
			page('checkpoints', checkpoints(96, 100), { more: true }),
			// A replica indexed only through 90 answers the next page.
			page('checkpoints', checkpoints(90, 90), { viewedAt: 90 }),
			page('checkpoints', checkpoints(90, 95)),
		);
		const frames = await collect(
			stream(server.client, 'checkpoints', {
				order: 'descending',
				start: { checkpoint: 100 },
				end: { checkpoint: 89 },
			}),
		);
		expect(frames.map(label)).toEqual(Array.from({ length: 11 }, (_, i) => String(100 - i)));
		// The retry continued below the last delivered checkpoint.
		const retry = server.sent('scanCheckpoints')[2];
		expect(retry).toMatchObject({ filter: { beforeCheckpoint: 96 } });
		expect(retry.before).toBeUndefined();
	});

	it('includes everything through a progress token used as an end', async () => {
		const seed = fakeGraphQL({ tip: 100 }).on('scanEvents', page('events', [event(90)]));
		const [, progress] = await collect(
			stream(seed.client, 'events', {
				start: { checkpoint: 90 },
				end: { checkpoint: 101 },
				frames: { progress: true },
			}),
		);
		expect(progress).toMatchObject({ $kind: 'Progress', coveredCheckpoint: '100' });

		const server = fakeGraphQL({ tip: 200 }).on('scanEvents', page('events', [event(90)]));
		const frames = await collect(
			stream(server.client, 'events', {
				start: { checkpoint: 90 },
				end: { resumeToken: token(progress) },
				frames: { completion: true },
			}),
		);
		expect(frames.map(label)).toEqual(['90:0', 'Complete']);
		expect(server.sent('scanEvents')).toEqual([
			expect.objectContaining({ filter: { afterCheckpoint: 89, beforeCheckpoint: 101 } }),
		]);
		expect(server.sent('scanEvents')[0].before).toBeUndefined();
	});

	it('gives a quiet fresh follow a resume token at its tip anchor', async () => {
		const quiet = fakeGraphQL({ tip: 10 }).on('subscribeEvents', live('events', []));
		const [baseline] = await take(
			stream(quiet.client, 'events', { frames: { progress: true } }),
			1,
		);
		expect(baseline).toMatchObject({ $kind: 'Progress', coveredCheckpoint: '10' });
		expect(quiet.sent('scanEvents')).toHaveLength(0);

		// A restart after the tip moved on subscribes after the anchor; the server backfills.
		const later = fakeGraphQL({ tip: 20 });
		later.on('subscribeEvents', live('events', [event(12)]));
		const [frame] = await take(
			stream(later.client, 'events', { start: { resumeToken: token(baseline) } }),
			1,
		);
		expect(label(frame)).toBe('12:0');
		expect(later.sent('subscribeEvents')).toEqual([{ filter: { afterCheckpoint: 10 } }]);
		expect(later.sent('scanEvents')).toHaveLength(0);
	});

	it('resumes a finite scan that waits for a future end from where its empty pass stopped', async () => {
		const server = fakeGraphQL({ tip: 1, first: 0 });
		server.on(
			'scanEvents',
			// The pass reads checkpoint 1 and finds nothing; meanwhile 1 is pruned.
			after(
				() => {
					server.tip = 3;
					server.first = 2;
				},
				page('events', [], { cursor: 'history:boundary:1' }),
			),
			page('events', [event(3)]),
		);
		const frames = await collect(
			stream(server.client, 'events', {
				start: { checkpoint: 1 },
				end: { checkpoint: 4 },
				retry: { ...noDelay, maxAttempts: 0 },
			}),
		);
		expect(frames.map(label)).toEqual(['3:0']);
		expect(server.sent('scanEvents')[1]).toMatchObject({
			filter: { afterCheckpoint: 1, beforeCheckpoint: 4 },
		});
		expect(server.sent('scanEvents')[1].after).toBeUndefined();
	});

	it('gives a completed empty finite scan a progress token, like gRPC', async () => {
		const server = fakeGraphQL({ tip: 5 }).on(
			'scanEvents',
			page('events', [], { cursor: 'history:boundary:2' }),
		);
		const frames = await collect(
			stream(server.client, 'events', {
				start: { checkpoint: 1 },
				end: { checkpoint: 3 },
				frames: { progress: true, completion: true },
			}),
		);
		expect(frames).toMatchObject([
			{ $kind: 'Progress', coveredCheckpoint: '2' },
			{ $kind: 'Complete', completion: { resumeToken: token(frames[0]) } },
		]);
	});

	// Server quirk seen on v1.83: an empty window can answer `hasNextPage: true` with the cursor
	// it was sent.
	it('ends the window at an empty page that repeats the cursor it was sent', async () => {
		const [anchor] = await followTokens('events', [event(1)]);
		const server = fakeGraphQL({ tip: 5 }).on(
			'scanEvents',
			page('events', [], { more: true, cursor: event(1).cursor }),
		);
		const frames = await collect(
			stream(server.client, 'events', {
				start: { resumeToken: anchor },
				end: { checkpoint: 3 },
				frames: { completion: true },
			}),
		);
		expect(frames.map(label)).toEqual(['Complete']);
		expect(server.sent('scanEvents')).toHaveLength(1);
	});
});

describe('polling', () => {
	it('never opens a subscription and reports Live once a pass reaches the tip', async () => {
		const server = fakeGraphQL();
		server.on(
			'scanEvents',
			after(() => (server.tip = 11), page('events', [event(9)])),
			page('events', [event(11)]),
		);
		const log = statusLog();
		const frames = await take(
			stream(server.client, 'events', {
				start: { checkpoint: 9 },
				delivery: 'poll',
				onStatus: log.onStatus,
			}),
			2,
		);
		expect(frames.map(label)).toEqual(['9:0', '11:0']);
		expect(server.sent('subscribeEvents')).toHaveLength(0);
		expect(log.log.slice(0, 4)).toEqual([
			'Connecting(0)',
			'Connected',
			'Page(history,indexedTip)',
			'Live',
		]);
	});

	it('waits for the saved indexed tip before resuming from an empty pass', async () => {
		const server = fakeGraphQL().on(
			'scanEvents',
			after(() => (server.tip = 2), page('events', [], { cursor: 'history:boundary' })),
			page('events', [event(11)]),
		);
		const scans = () => server.sent('scanEvents').length;
		const source = stream(server.client, 'events', { start: { checkpoint: 1 }, delivery: 'poll' });
		const pending = source.next();
		// The empty pass read through tip 10; the next passes see tip 2 and must wait.
		await expect.poll(scans).toBeGreaterThanOrEqual(3);
		server.tip = 11;
		expect(label((await pending).value!)).toBe('11:0');
		await source.return(undefined);
		// It resumes after everything the empty pass read, not from its own start.
		expect(server.sent('scanEvents').at(-1)).toMatchObject({ filter: { afterCheckpoint: 10 } });
		expect(server.sent('scanEvents').at(-1)!.after).toBeUndefined();
	});

	it('waits for a future descending start to be indexed', async () => {
		const server = fakeGraphQL({ tip: 2 });
		server.on('scanCheckpoints', page('checkpoints', [checkpoint(5)]));
		const source = collect(
			stream(server.client, 'checkpoints', {
				order: 'descending',
				start: { checkpoint: 5 },
				end: { checkpoint: 4 },
			}),
		);
		// Each poll reads the tip, and no page, while the start is past it.
		await expect.poll(() => server.sent('ledgerStreamState').length).toBeGreaterThanOrEqual(3);
		expect(server.sent('scanCheckpoints')).toHaveLength(0);
		server.tip = 5;
		expect((await source).map(label)).toEqual(['5']);
	});
});

describe('end tokens', () => {
	it('bounds a read by the end checkpoint and stops at the end item, with no extra request', async () => {
		const [older, newer] = await followTokens('events', [event(1, 0), event(1, 2)]);
		const server = fakeGraphQL().on(
			'scanEvents',
			page('events', [event(1, 1), event(1, 2), event(1, 3)], { more: true }),
		);
		const frames = await collect(
			stream(server.client, 'events', {
				start: { resumeToken: older },
				end: { resumeToken: newer },
				frames: { completion: true },
			}),
		);
		expect(frames.map(label)).toEqual(['1:1', 'Complete']);
		expect(frames[1]).toMatchObject({ completion: { resumeToken: token(frames[0]) } });
		const [request] = server.sent('scanEvents');
		expect(server.sent('scanEvents')).toHaveLength(1);
		expect(request).toMatchObject({ after: event(1, 0).cursor, filter: { beforeCheckpoint: 2 } });
		expect(request.before).toBeUndefined();
	});

	it.each(['ascending', 'descending'] as const)(
		'stops %s at the end item by its coordinates, whatever its cursor',
		async (order) => {
			const descending = order === 'descending';
			const endEdge = descending
				? event(1, 0, { source: 'live' })
				: event(1, 2, { source: 'live' });
			const seed = fakeGraphQL().on('scanEvents', page('events', [endEdge]));
			const [endItem] = await take(
				stream(seed.client, 'events', { start: { checkpoint: 1 }, follow: false }),
				1,
			);
			// The server returns the end item under another cursor and reports more pages.
			const server = fakeGraphQL().on(
				'scanEvents',
				page('events', descending ? [event(1, 0), event(1, 1)] : [event(1, 1), event(1, 2)], {
					more: true,
				}),
			);
			const frames = await collect(
				stream(server.client, 'events', {
					start: { checkpoint: 1 },
					end: { resumeToken: token(endItem) },
					order,
					frames: { completion: true },
				}),
			);
			expect(frames.map(label)).toEqual(['1:1', 'Complete']);
			expect(server.sent('scanEvents')).toHaveLength(1);
		},
	);

	it('stops at an item past the end item', async () => {
		const [endItem] = await followTokens('events', [event(1, 2, { source: 'live' })]);
		const server = fakeGraphQL().on(
			'scanEvents',
			page('events', [event(1, 1), event(2, 0)], { more: true }),
		);
		const frames = await collect(
			stream(server.client, 'events', {
				start: { checkpoint: 1 },
				end: { resumeToken: endItem },
				frames: { completion: true },
			}),
		);
		expect(frames.map(label)).toEqual(['1:1', 'Complete']);
		expect(server.sent('scanEvents')).toHaveLength(1);
	});
});

describe('live handoff', () => {
	it('subscribes after a start checkpoint, and the server backfills history', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			live('events', [event(5), event(9), event(11, 0, { source: 'live' })]),
		);
		const log = statusLog();
		const frames = await take(
			stream(server.client, 'events', { start: { checkpoint: 5 }, onStatus: log.onStatus }),
			3,
		);
		expect(frames.map(label)).toEqual(['5:0', '9:0', '11:0']);
		expect(server.sent('subscribeEvents')).toEqual([{ filter: { afterCheckpoint: 4 } }]);
		expect(server.sent('scanEvents')).toHaveLength(0);
		expect(log.log).toEqual(['Connecting(0)', 'Connected', 'Live']);
	});

	it('reports Live at the first item at or past the tip read at startup, not with backfill', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			live('events', [event(5), event(9), event(10, 0, { source: 'live' })]),
		);
		const log = statusLog();
		const frames = stream(server.client, 'events', {
			start: { checkpoint: 5 },
			onStatus: log.onStatus,
		});
		await frames.next();
		await frames.next();
		expect(log.log).toEqual(['Connecting(0)', 'Connected']);
		expect(label((await frames.next()).value!)).toBe('10:0');
		expect(log.log).toEqual(['Connecting(0)', 'Connected', 'Live']);
		await frames.return(undefined);
		// One request reads the identity and the tip; Live needs no other.
		expect(server.requests.map((request) => request.operation)).toEqual([
			'ledgerStreamState',
			'subscribeEvents',
		]);
	});

	it('never reports Live for progress edges while it backfills', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			live('events', [{ cursor: 'live:progress:a', node: null }] as unknown as Edge[]),
		);
		const log = statusLog();
		await take(
			stream(server.client, 'events', {
				start: { checkpoint: 5 },
				frames: { progress: true },
				onStatus: log.onStatus,
			}),
			2,
		);
		expect(log.log).toEqual(['Connecting(0)', 'Connected']);
	});

	it('reports Live again when it reconnects near the tip after being live', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			live('events', [event(10, 0, { source: 'live' })], 'eof'),
			live('events', [{ cursor: 'live:progress:quiet', node: null }] as unknown as Edge[]),
		);
		const log = statusLog();
		const frames = await take(
			stream(server.client, 'events', {
				start: { checkpoint: 5 },
				frames: { progress: true },
				onStatus: log.onStatus,
			}),
			3,
		);
		expect(frames.map(label)).toEqual(['Progress', '10:0', 'Progress']);
		// Live at open on the reconnect, though the new feed is quiet.
		expect(log.log.slice(log.log.indexOf('Connecting(0)', 1))).toEqual([
			'Connecting(0)',
			'Connected',
			'Live',
		]);
	});

	it('reports Live for checkpoint subscriptions at the tip checkpoint', async () => {
		const server = fakeGraphQL({ tip: 7 });
		server.on('subscribeCheckpoints', live('checkpoints', [checkpoint(6), checkpoint(7)]));
		const log = statusLog();
		const frames = stream(server.client, 'checkpoints', {
			start: { checkpoint: 6 },
			onStatus: log.onStatus,
		});
		await frames.next();
		expect(log.log).not.toContain('Live');
		await frames.next();
		expect(log.log.at(-1)).toBe('Live');
		await frames.return(undefined);
	});

	it.each(['checkpoints', 'transactions', 'events'] as const)(
		'reads %s history from genesis before subscribing after it',
		async (family) => {
			const edge = (cp: number, source: 'history' | 'live' = 'history') =>
				family === 'checkpoints'
					? checkpoint(cp, source)
					: family === 'transactions'
						? transaction(cp, { source })
						: event(cp, 0, { source });
			const server = fakeGraphQL({ tip: 3 });
			server.on(
				`scan${family[0].toUpperCase()}${family.slice(1)}`,
				page(family, [edge(0), edge(2)]),
			);
			server.on(subscribeOperation(family), live(family, [edge(4, 'live')]));
			const frames = await take(
				stream(server.client, family, {
					start: { checkpoint: 0 },
					signal: AbortSignal.timeout(2000),
				}),
				3,
			);
			expect(frames.map(label)).toEqual(
				{
					checkpoints: ['0', '2', '4'],
					transactions: ['tx0', 'tx2', 'tx4'],
					events: ['0:0', '2:0', '4:0'],
				}[family],
			);
			expect(server.sent(subscribeOperation(family))[0]).toMatchObject(
				family === 'checkpoints' ? { afterCheckpoint: 3 } : { filter: { afterCheckpoint: 3 } },
			);
		},
	);

	it('reports Connected when a quiet subscription opens, and Live with its first item', async () => {
		const server = fakeGraphQL({ tip: 10 }).on('subscribeEvents', live('events', []));
		const log = statusLog();
		const source = stream(server.client, 'events', { onStatus: log.onStatus });
		const pending = source.next().catch(() => {});
		await expect.poll(() => log.log).toEqual(['Connecting(0)', 'Connected']);
		await source.return(undefined);
		await pending;
	});

	it('resumes after the last delivered cursor when the connection ends', async () => {
		const server = fakeGraphQL({ tip: 1 });
		server.on('scanEvents', page('events', []));
		server.on(
			'subscribeEvents',
			live('events', [event(2, 0, { source: 'live' }), event(3, 0, { source: 'live' })], 'eof'),
			live('events', [event(3, 1, { source: 'live' }), event(4, 0, { source: 'live' })]),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 2 } }), 4);
		expect(frames.map(label)).toEqual(['2:0', '3:0', '3:1', '4:0']);
		expect(new Set(frames.map(token)).size).toBe(4);
		expect(server.sent('subscribeEvents')[1]).toEqual({
			filter: {},
			after: event(3, 0, { source: 'live' }).cursor,
		});
	});

	it('keeps the tip anchor across disconnects before the first match', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on('scanEvents', page('events', []));
		server.on(
			'subscribeEvents',
			live('events', [], 'eof'),
			live('events', [event(11, 0, { source: 'live' })]),
		);
		const [frame] = await take(stream(server.client, 'events', { retry: noDelay }), 1);
		expect(label(frame)).toBe('11:0');
		expect(server.sent('subscribeEvents')).toEqual([
			{ filter: { afterCheckpoint: 10 } },
			{ filter: { afterCheckpoint: 10 } },
		]);
	});

	it('subscribes with the caller filter and selection', async () => {
		const server = fakeGraphQL({ tip: 1 });
		server.on('scanTransactions', page('transactions', []));
		server.on('subscribeTransactions', live('transactions', [transaction(2)]));
		const sender = `0x${'5'.padStart(64, '0')}`;
		await take(
			stream(server.client, 'transactions', {
				start: { checkpoint: 2 },
				filter: { sender },
				include: { events: true },
			}),
			1,
		);
		expect(server.sent('subscribeTransactions')).toEqual([
			{
				filter: { sentAddress: sender, afterCheckpoint: 1 },
				includeTransaction: false,
				includeEffects: false,
				includeEvents: true,
				includeBalanceChanges: false,
				includeObjectTypes: false,
				includeEffectsJson: false,
				includeBcs: false,
			},
		]);
	});
});

describe('subscription progress', () => {
	const progressEdge = (label: string) => ({ cursor: `live:progress:${label}`, node: null });

	it('advances a quiet fresh follow through progress edges, Live from the tip it starts at', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			live('events', [progressEdge('a'), progressEdge('b')] as unknown as Edge[]),
		);
		const log = statusLog();
		const frames = await take(
			stream(server.client, 'events', {
				filter: { sender: `0x${'5'.padStart(64, '0')}` },
				frames: { progress: true },
				onStatus: log.onStatus,
			}),
			3,
		);
		expect(frames.map(label)).toEqual(['Progress', 'Progress', 'Progress']);
		expect(new Set(frames.map(token)).size).toBe(3);
		expect(log.log).toEqual(['Connecting(0)', 'Connected', 'Live']);
		// The tip anchor covers the tip; progress edges carry no checkpoint, so they claim nothing.
		expect(frames[0]).toMatchObject({ coveredCheckpoint: '10' });
		expect(frames[1]).not.toHaveProperty('coveredCheckpoint');
		expect(frames[2]).not.toHaveProperty('coveredCheckpoint');
	});

	it('resumes from a progress token without re-reading anything before it', async () => {
		const seed = fakeGraphQL({ tip: 10 });
		seed.on('subscribeEvents', live('events', [progressEdge('a')] as unknown as Edge[]));
		const [, progress] = await take(
			stream(seed.client, 'events', { frames: { progress: true } }),
			2,
		);

		const server = fakeGraphQL({ tip: 12 });
		server.on('subscribeEvents', live('events', [event(12)]));
		const [frame] = await take(
			stream(server.client, 'events', { start: { resumeToken: token(progress) } }),
			1,
		);
		expect(label(frame)).toBe('12:0');
		// The subscription resumes after the progress cursor itself.
		expect(server.sent('subscribeEvents')[0].after).toBe('live:progress:a');
		expect(server.sent('scanEvents')).toHaveLength(0);
	});

	/** A progress token minted by a live edge after the feed passed checkpoint 10. */
	async function liveProgressToken() {
		const seed = fakeGraphQL({ tip: 10 });
		seed.on('subscribeEvents', live('events', [progressEdge('a')] as unknown as Edge[]));
		const [, progress] = await take(
			stream(seed.client, 'events', { frames: { progress: true } }),
			2,
		);
		return token(progress);
	}

	it('polls after a live progress token without moving behind it on a lagging replica', async () => {
		const resumeToken = await liveProgressToken();
		// The replica has not reached the checkpoint the feed had passed, then catches up.
		const server = fakeGraphQL({ tip: 4 });
		server.on(
			'scanEvents',
			after(() => (server.tip = 12), page('events', [])),
			page('events', [event(12)]),
		);
		const [frame] = await take(
			stream(server.client, 'events', {
				start: { resumeToken },
				delivery: 'poll',
				pollInterval: 1,
				frames: { progress: true },
			}),
			1,
		);
		// Nothing was committed from the lagging replica: the next poll still resumes after the cursor.
		expect(label(frame)).toBe('12:0');
		expect(server.sent('scanEvents').map((variables) => variables.after)).toEqual([
			'live:progress:a',
			'live:progress:a',
		]);
	});

	it('advances a quiet poll resumed from a live progress token', async () => {
		const resumeToken = await liveProgressToken();
		const server = fakeGraphQL({ tip: 12 });
		server.on('scanEvents', page('events', []), page('events', [event(14)]));
		const frames = await take(
			stream(server.client, 'events', {
				start: { resumeToken },
				delivery: 'poll',
				pollInterval: 1,
				frames: { progress: true },
			}),
			2,
		);
		expect(frames.map(label)).toEqual(['Progress', '14:0']);
		// The second tick resumes from the boundary after the server's tip, not the same cursor.
		const [first, second] = server.sent('scanEvents');
		expect(first.after).toBe('live:progress:a');
		expect(second.after).toBeUndefined();
		expect(second.filter.afterCheckpoint).toBe(12);
	});
});

describe('live delivery', () => {
	it('drops live items a new connection repeats', async () => {
		const server = fakeGraphQL({ tip: 5 });
		server.on('scanEvents', page('events', []));
		server.on(
			'subscribeEvents',
			live('events', [event(6, 0, { source: 'live' }), event(6, 1, { source: 'live' })], 'eof'),
			live('events', [event(6, 1, { source: 'live' }), event(7, 0, { source: 'live' })]),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 6 } }), 3);
		expect(frames.map(label)).toEqual(['6:0', '6:1', '7:0']);
	});

	it('reconnects before a live item without a checkpoint, so the server backfills it', async () => {
		const server = fakeGraphQL({ tip: 0 });
		server.on('scanTransactions', page('transactions', []));
		server.on(
			'subscribeTransactions',
			live('transactions', [transaction(1, { source: 'live', indexed: false })]),
			live('transactions', [transaction(1, { source: 'live' })]),
		);
		const [frame] = await take(
			stream(server.client, 'transactions', {
				start: { checkpoint: 1 },
				retry: { ...noDelay, maxAttempts: 1 },
			}),
			1,
		);
		expect(label(frame)).toBe('tx1');
		expect(server.sent('subscribeTransactions').map((sent) => sent.filter)).toEqual([
			{ afterCheckpoint: 0 },
			{ afterCheckpoint: 0 },
		]);
	});

	it('fails a history page item without a checkpoint as a protocol error', async () => {
		const server = fakeGraphQL().on(
			'scanEvents',
			page('events', [event(3, 0, { indexed: false })]),
		);
		const error = await rejection(
			collect(
				stream(server.client, 'events', { start: { checkpoint: 3 }, end: { checkpoint: 5 } }),
			),
		);
		expect(error).toMatchObject({ code: 'Protocol' });
	});

	it('reconnects at once after a connection that delivered data, and backs off otherwise', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on('scanCheckpoints', page('checkpoints', []));
		server.on(
			'subscribeCheckpoints',
			after(() => (server.tip = 11), live('checkpoints', [checkpoint(11, 'live')], 'eof')),
			httpStatus(503),
			live('checkpoints', [checkpoint(12, 'live')]),
		);
		const delays: number[] = [];
		const frames = await take(
			stream(server.client, 'checkpoints', {
				start: { checkpoint: 11 },
				retry: { initialDelay: 5, jitter: 0 },
				onStatus: (status) => status.$kind === 'Retrying' && delays.push(status.delay),
			}),
			2,
		);
		expect(frames.map(label)).toEqual(['11', '12']);
		expect(delays).toEqual([0, 5]);
	});
});

describe('request counts', () => {
	const operations = (server: FakeServer) => server.requests.map((request) => request.operation);

	it('starts a fresh follow with one state read and one subscription', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on('subscribeEvents', live('events', [event(11, 0, { source: 'live' })]));
		await take(stream(server.client, 'events'), 1);
		expect(operations(server)).toEqual(['ledgerStreamState', 'subscribeEvents']);
	});

	it('makes exactly one request per history page', async () => {
		const server = fakeGraphQL({ tip: 20 }).on(
			'scanEvents',
			page('events', [event(1)], { more: true }),
			page('events', [event(2)], { more: true }),
			page('events', [event(3)]),
		);
		await collect(
			stream(server.client, 'events', { start: { checkpoint: 1 }, end: { checkpoint: 10 } }),
		);
		expect(operations(server)).toEqual([
			'ledgerStreamState',
			'scanEvents',
			'scanEvents',
			'scanEvents',
		]);
	});

	it('makes no request per live item', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			live(
				'events',
				Array.from({ length: 10 }, (_, i) => event(11 + i, 0, { source: 'live' })),
			),
		);
		await take(stream(server.client, 'events'), 10);
		expect(operations(server)).toEqual(['ledgerStreamState', 'subscribeEvents']);
	});

	it('reconnects after live progress with one subscription', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			live('events', [event(11, 0, { source: 'live' })], 'eof'),
			live('events', [event(12, 0, { source: 'live' })]),
		);
		await take(stream(server.client, 'events'), 2);
		expect(operations(server)).toEqual(['ledgerStreamState', 'subscribeEvents', 'subscribeEvents']);
	});

	it('reads descending to the retention limit with one request per page', async () => {
		const server = fakeGraphQL({ tip: 12, first: 9 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(11), checkpoint(12)], { more: true }),
			page('checkpoints', [checkpoint(9), checkpoint(10)]),
		);
		const frames = await collect(
			stream(server.client, 'checkpoints', { order: 'descending', frames: { completion: true } }),
		);
		expect(frames.map(label)).toEqual(['12', '11', '10', '9', 'Complete']);
		expect(frames.at(-1)).toMatchObject({ completion: { reason: 'retentionLimit' } });
		expect(operations(server)).toEqual(['ledgerStreamState', 'scanCheckpoints', 'scanCheckpoints']);
	});

	it('fails a start below the retention limit with HistoryUnavailable after one request', async () => {
		// The server retries its backfill scan and then reports an internal error, which alone
		// would read as transient.
		const failed = { message: 'scan failed', extensions: { code: 'INTERNAL_SERVER_ERROR' } };
		const server = fakeGraphQL({ tip: 12, first: 9 }).on(
			'subscribeCheckpoints',
			liveMessages([{ errors: [failed] }]),
		);
		await expect(
			collect(
				stream(server.client, 'checkpoints', {
					start: { checkpoint: 3 },
					retry: { maxAttempts: 5 },
				}),
			),
		).rejects.toMatchObject({ code: 'HistoryUnavailable' });
		expect(operations(server)).toEqual(['ledgerStreamState']);
	});

	it('makes one request per poll tick', async () => {
		const server = fakeGraphQL({ tip: 1 });
		server.on(
			'scanEvents',
			after(() => (server.tip = 2), page('events', [event(1)])),
			after(() => (server.tip = 3), page('events', [event(2)])),
			page('events', [event(3)]),
		);
		await take(stream(server.client, 'events', { start: { checkpoint: 1 }, delivery: 'poll' }), 3);
		expect(operations(server)).toEqual([
			'ledgerStreamState',
			'scanEvents',
			'scanEvents',
			'scanEvents',
		]);
	});
});

describe('errors', () => {
	const finiteCheckpoints = {
		start: { checkpoint: 1 },
		end: { checkpoint: 2 },
		retry: { ...noDelay, maxAttempts: 3 },
	};

	const pageInfo = {
		hasNextPage: false,
		hasPreviousPage: false,
		startCursor: null,
		endCursor: null,
	};
	it.each<[string, unknown]>([
		['a missing connection', null],
		['a page without pageInfo', { edges: [], pageInfo: null }],
		['a page without edges', { pageInfo }],
		['an edge without a cursor', { edges: [{ node: checkpoint(1).node }], pageInfo }],
		['a non-boolean hasNextPage', { edges: [], pageInfo: { ...pageInfo, hasNextPage: 'no' } }],
	])('fails with Protocol, without retrying, on %s', async (_name, checkpoints) => {
		const server = fakeGraphQL().on('scanCheckpoints', reply({ data: { checkpoints } }));
		const error = await rejection(collect(stream(server.client, 'checkpoints', finiteCheckpoints)));
		expect(error).toMatchObject({ name: 'SuiStreamError', code: 'Protocol' });
		expect(server.sent('scanCheckpoints')).toHaveLength(1);
	});

	it.each<[string, Answer]>([
		['invalid JSON', () => new Response('{', { headers: { 'content-type': 'application/json' } })],
	])('does not retry %s', async (_name, answer) => {
		const server = fakeGraphQL().on('scanCheckpoints', answer);
		await expect(
			collect(stream(server.client, 'checkpoints', finiteCheckpoints)),
		).rejects.toThrow();
		expect(server.sent('scanCheckpoints')).toHaveLength(1);
	});

	const responseError = (code: string) =>
		reply({ errors: [{ message: code, extensions: { code } }] });
	it.each<[string, Answer, SuiClientTypes.StreamRetryReason]>([
		['fetch', networkFailure, 'Network'],
		['body', brokenBody, 'Disconnected'],
		['HTTP 429', httpStatus(429), 'RateLimited'],
		['HTTP 504', httpStatus(504), 'Timeout'],
		['HTTP 503', httpStatus(503), 'Unavailable'],
		['HTTP 500', httpStatus(500), 'ServerError'],
		['SERVICE_UNAVAILABLE', responseError('SERVICE_UNAVAILABLE'), 'Unavailable'],
		['REQUEST_TIMEOUT', responseError('REQUEST_TIMEOUT'), 'Timeout'],
		['INTERNAL_SERVER_ERROR', responseError('INTERNAL_SERVER_ERROR'), 'ServerError'],
		['RESOURCE_EXHAUSTED', responseError('RESOURCE_EXHAUSTED'), 'ServerError'],
	])('retries a %s failure', async (_name, failure, reason) => {
		const server = fakeGraphQL().on(
			'scanCheckpoints',
			failure,
			page('checkpoints', [checkpoint(1)]),
		);
		const reasons: string[] = [];
		const frames = await collect(
			stream(server.client, 'checkpoints', {
				...finiteCheckpoints,
				onStatus: (status) => status.$kind === 'Retrying' && reasons.push(status.reason),
			}),
		);
		expect(frames.map(label)).toEqual(['1']);
		expect(server.sent('scanCheckpoints')).toHaveLength(2);
		expect(reasons).toEqual([reason]);
	});

	it('retries an index that has nothing yet as NotIndexed', async () => {
		const server = fakeGraphQL().on('scanCheckpoints', page('checkpoints', [checkpoint(1)]));
		server.tip = null;
		const reasons: string[] = [];
		const frames = stream(server.client, 'checkpoints', {
			...finiteCheckpoints,
			onStatus: (status) => {
				if (status.$kind !== 'Retrying') return;
				reasons.push(status.reason);
				server.tip = 1;
			},
		});
		await collect(frames);
		expect(reasons).toEqual(['NotIndexed']);
	});

	it('throws response errors as a non-retryable SuiGraphQLRequestError', async () => {
		const errors = [{ message: 'bad filter', extensions: { code: 'BAD_USER_INPUT' } }];
		const server = fakeGraphQL().on('scanCheckpoints', reply({ errors }));
		const error = await rejection(collect(stream(server.client, 'checkpoints', finiteCheckpoints)));
		expect(error).toBeInstanceOf(SuiGraphQLRequestError);
		expect(error).toMatchObject({ message: 'bad filter', retryable: false, cause: errors });
		expect(server.sent('scanCheckpoints')).toHaveLength(1);
	});

	it('rethrows the transport error unchanged once the retry budget runs out', async () => {
		const server = fakeGraphQL().on('scanCheckpoints', httpStatus(503));
		const log = statusLog();
		const error = await rejection(
			collect(
				stream(server.client, 'checkpoints', {
					...finiteCheckpoints,
					retry: { ...noDelay, maxAttempts: 1 },
					onStatus: log.onStatus,
				}),
			),
		);
		expect(error).toMatchObject({ name: 'SuiGraphQLRequestError', status: 503, retryable: true });
		expect(log.log.at(-1)).toBe('Error');
	});

	it('retries while no checkpoint has been indexed', async () => {
		const server = fakeGraphQL();
		server.tip = null;
		server.on('scanCheckpoints', page('checkpoints', [checkpoint(1)]));
		const source = collect(
			stream(server.client, 'checkpoints', {
				...finiteCheckpoints,
				retry: { initialDelay: 5, maxDelay: 5, jitter: 0 },
			}),
		);
		await expect.poll(() => server.sent('ledgerStreamState').length).toBeGreaterThanOrEqual(2);
		server.tip = 10;
		expect((await source).map(label)).toEqual(['1']);
	});

	it('throws permanent subscription response errors as SuiGraphQLRequestError', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			liveMessages([
				{
					errors: [
						{ message: 'subscription rejected', extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } },
					],
				},
			]),
		);
		const error = await rejection(take(stream(server.client, 'events', {}), 1));
		expect(error).toBeInstanceOf(SuiGraphQLRequestError);
		expect(error).toMatchObject({ message: 'subscription rejected', retryable: false });
		expect(server.sent('subscribeEvents')).toHaveLength(1);
	});

	it.each([
		['with a code', { code: 'INTERNAL_SERVER_ERROR' }],
		['without a code', undefined],
	])(
		'reconnects from the last cursor after a null-node result with errors (%s)',
		async (_, extensions) => {
			const server = fakeGraphQL({ tip: 1 });
			server.on('scanTransactions', page('transactions', []));
			const failed = { cursor: 'live:transaction:unresolved', node: null };
			server.on(
				'subscribeTransactions',
				liveMessages([
					{ data: { transactions: transaction(2, { source: 'live' }) } },
					{ data: { transactions: failed }, errors: [{ message: 'node failed', extensions }] },
				]),
				live('transactions', [transaction(3, { source: 'live' })]),
			);
			const frames = await take(
				stream(server.client, 'transactions', { start: { checkpoint: 2 } }),
				2,
			);
			expect(frames.map(label)).toEqual(['tx2', 'tx3']);
			const resumed = server.sent('subscribeTransactions');
			expect(resumed).toHaveLength(2);
			expect(resumed[1].after).toBe(transaction(2, { source: 'live' }).cursor);
		},
	);

	it('reports when a subscription opens, before its first result, and not on an HTTP error', async () => {
		const server = fakeGraphQL().on('subscribeEvents', live('events', [event(1)]), httpStatus(503));
		const log: string[] = [];
		const subscribe = () =>
			server.client.subscribe({
				query: 'subscription subscribeEvents { events { cursor } }',
				onOpen: () => log.push('open'),
			});
		const opened = subscribe();
		await opened.next();
		log.push('result');
		await opened.return(undefined);
		await expect(subscribe().next()).rejects.toThrow();
		expect(log).toEqual(['open', 'result']);
	});

	it('rejects an empty resume token before any request', async () => {
		const server = fakeGraphQL();
		const error = await rejection(
			take(stream(server.client, 'checkpoints', { start: { resumeToken: '' } }), 1),
		);
		expect(error).toBeInstanceOf(SuiStreamError);
		expect(error).toMatchObject({ code: 'InvalidToken' });
		expect(server.requests).toHaveLength(0);
	});
});

describe('item mapping', () => {
	it('matches listTransactions, including the first-50 limit on nested lists, with one request per page', async () => {
		const events = Array.from({ length: 50 }, (_, i) => event(1, i).node);
		const node = {
			effects: {
				events: { pageInfo: { hasNextPage: true }, nodes: events },
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
		const edge = transaction(1, { node });
		const include = { events: true, objectTypes: true } as const;
		const server = fakeGraphQL();
		server.on('scanTransactions', page('transactions', [edge]));
		server.on(
			'listTransactions',
			reply({
				data: {
					transactions: {
						edges: [{ cursor: edge.cursor }],
						nodes: [edge.node],
						pageInfo: {
							hasNextPage: false,
							hasPreviousPage: false,
							startCursor: null,
							endCursor: null,
						},
					},
				},
			}),
		);

		const [streamed] = await collect(
			server.client.streamTransactions({
				start: { checkpoint: 1 },
				end: { checkpoint: 2 },
				include,
			}),
		);
		const listed = await server.client.listTransactions({ include });

		expect(streamed.transaction).toEqual(listed.transactions[0]);
		expect(streamed.transaction.Transaction?.events).toHaveLength(50);
		const {
			filter: _streamFilter,
			filters: _filters,
			first: _first,
			...streamSelection
		} = server.sent('scanTransactions')[0];
		const {
			filter: _listFilter,
			first: _limit,
			...listSelection
		} = server.sent('listTransactions')[0];
		expect(streamSelection).toEqual(listSelection);
		expect(server.requests.map((request) => request.operation)).toEqual([
			'ledgerStreamState',
			'scanTransactions',
			'listTransactions',
		]);
	});

	it('maps events without a sender to the zero address, alone and inside transactions', async () => {
		const zero = `0x${'0'.repeat(64)}`;
		const system = event(2, 0, { sender: null });
		const server = fakeGraphQL();
		server.on('scanEvents', page('events', [system]));
		server.on(
			'scanTransactions',
			page('transactions', [
				transaction(2, {
					node: { effects: { events: { pageInfo: { hasNextPage: false }, nodes: [system.node] } } },
				}),
			]),
		);
		const range = { start: { checkpoint: 2 }, end: { checkpoint: 3 } };
		const [eventFrame] = await collect(server.client.streamEvents(range));
		const [transactionFrame] = await collect(
			server.client.streamTransactions({ ...range, include: { events: true } }),
		);
		expect(eventFrame.event.sender).toBe(zero);
		expect(transactionFrame.transaction.Transaction?.events?.[0].sender).toBe(zero);
	});
});

describe('client surface', () => {
	it('streams through client.core as well as the top-level methods', async () => {
		const server: FakeServer = fakeGraphQL().on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(1)]),
		);
		const range = { start: { checkpoint: 1 }, end: { checkpoint: 2 } };
		expect((await collect(server.client.core.streamCheckpoints(range))).map(label)).toEqual(['1']);
		expect((await collect(server.client.streamCheckpoints(range))).map(label)).toEqual(['1']);
	});
});
