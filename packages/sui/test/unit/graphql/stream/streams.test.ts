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
	checkpointLookup,
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

/** Resume tokens of a follow stream over `edges` (read from history; nothing goes live). */
async function followTokens(family: Family, edges: Edge[]): Promise<string[]> {
	const seed = fakeGraphQL({ tip: 10 }).on(scanOperation(family), page(family, edges));
	const frames = await take(
		stream(seed.client, family, { start: { checkpoint: 0 } }),
		edges.length,
	);
	return frames.map(token);
}

function scanOperation(family: Family) {
	return `scan${family[0].toUpperCase()}${family.slice(1)}`;
}

/** Frames and statuses in the order they happened, e.g. `['Live', '11', 'Recovering']`. */
function timeline() {
	const log: string[] = [];
	return {
		log,
		onStatus: (status: SuiClientTypes.StreamStatus) => {
			if (status.$kind === 'Live' || status.$kind === 'Recovering') log.push(status.$kind);
		},
		async read(source: AsyncGenerator<Frame>, count: number) {
			for (let n = 0; n < count; n++) log.push(label((await source.next()).value!));
			await source.return(undefined);
		},
	};
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
		expect(server.sent('scanCheckpoints')[0].filter.afterCheckpoint).toBe(9);
	});

	it('resumes after a checkpoint that has since been pruned, keeping afterCheckpoint one behind the cursor', async () => {
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
		// afterCheckpoint naming the cursor's own checkpoint returns an empty page.
		expect(server.sent('scanCheckpoints')[0]).toMatchObject({
			after: checkpoint(10).cursor,
			filter: { afterCheckpoint: 9, beforeCheckpoint: 12 },
		});
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

	it('fails with HistoryUnavailable, without a page request, when the start has been pruned', async () => {
		const server = fakeGraphQL({ tip: 20, first: 5 });
		const error = await rejection(
			collect(
				stream(server.client, 'checkpoints', {
					start: { checkpoint: 2 },
					end: { checkpoint: 4 },
					retry: { ...noDelay, maxAttempts: 3 },
				}),
			),
		);
		expect(error).toMatchObject({ name: 'SuiStreamError', code: 'HistoryUnavailable' });
		expect(server.sent('scanCheckpoints')).toHaveLength(0);
	});

	it('reads newest first down to the oldest retained checkpoint, then fails with HistoryUnavailable', async () => {
		const server = fakeGraphQL({ tip: 12, first: 11 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(11), checkpoint(12)]),
		);
		const source = stream(server.client, 'checkpoints', {
			order: 'descending',
			retry: { ...noDelay, maxAttempts: 0 },
		});
		const labels: string[] = [];
		const error = await rejection(
			(async () => {
				for await (const frame of source) labels.push(label(frame));
			})(),
		);
		expect(labels).toEqual(['12', '11']);
		expect(error).toMatchObject({ name: 'SuiStreamError', code: 'HistoryUnavailable' });
		expect(server.sent('scanCheckpoints')[0].filter).toMatchObject({ afterCheckpoint: 10 });
	});

	it('checks retention against the indexes its own filter reads', async () => {
		const server = fakeGraphQL({ tip: 20 });
		// Only the affected-address index has pruned anything.
		server.retention = { affectedAddress: 15 };
		server.on('scanTransactions', page('transactions', [transaction(10)]));
		const frames = await collect(
			stream(server.client, 'transactions', {
				start: { checkpoint: 10 },
				end: { checkpoint: 11 },
				retry: { ...noDelay, maxAttempts: 0 },
			}),
		);
		expect(frames.map(label)).toEqual(['tx10']);
		expect(server.sent('ledgerStreamState').at(-1)?.filters).toEqual([]);

		const sender = `0x${'5'.padStart(64, '0')}`;
		await collect(
			stream(server.client, 'transactions', {
				start: { checkpoint: 10 },
				end: { checkpoint: 11 },
				filter: { sender },
			}),
		);
		expect(server.sent('ledgerStreamState').at(-1)?.filters).toEqual(['sentAddress']);
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

	it('advances through empty scan-limited pages and keeps the opposite cursor bound', async () => {
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
		expect(frames.map(label)).toEqual(['Progress', '3:0']);
		expect(server.sent('scanEvents')[1]).toMatchObject({
			after: frontier,
			before: event(5).cursor,
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
		expect(resumed.sent('scanEvents')).toEqual([
			expect.objectContaining({ after: frontier, before: event(5).cursor }),
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
			message: expect.stringContaining('did not advance'),
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
		expect(server.sent('scanEvents')[1]).toMatchObject({
			after: event(1).cursor,
			filter: { afterCheckpoint: 100 },
		});
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

	it('gives a quiet fresh follow a resume token at its tip anchor', async () => {
		const quiet = fakeGraphQL({ tip: 10 }).on('subscribeEvents', live('events', []));
		const [baseline] = await take(
			stream(quiet.client, 'events', { frames: { progress: true } }),
			1,
		);
		expect(baseline).toMatchObject({ $kind: 'Progress', coveredCheckpoint: '10' });
		expect(quiet.sent('scanEvents')).toHaveLength(0);

		// A restart after the tip moved on still reads what matched in between.
		const later = fakeGraphQL({ tip: 20 });
		later.on('scanEvents', page('events', [event(12)]));
		later.on('subscribeEvents', live('events', []));
		const [frame] = await take(
			stream(later.client, 'events', { start: { resumeToken: token(baseline) } }),
			1,
		);
		expect(label(frame)).toBe('12:0');
		expect(later.sent('scanEvents')[0]).toMatchObject({
			filter: { afterCheckpoint: 10, beforeCheckpoint: 21 },
		});
		expect(later.sent('scanEvents')[0].after).toBeUndefined();
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
			after: 'history:boundary:1',
			filter: { afterCheckpoint: 1, beforeCheckpoint: 4 },
		});
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

	it('sends no request for a gap the last empty pass already read', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'scanEvents',
			page('events', [event(9)], { more: true }),
			page('events', [], { cursor: 'history:boundary:10' }),
			// What v1.83 answers for a window it has nothing in, after the boundary cursor.
			page('events', [], { more: true, cursor: 'history:boundary:10' }),
		);
		server.on(
			'subscribeEvents',
			live('events', [event(9, 0, { source: 'live' }), event(11, 0, { source: 'live' })]),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 9 } }), 2);
		expect(frames.map(label)).toEqual(['9:0', '11:0']);
		expect(server.sent('scanEvents')).toHaveLength(2);
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
		const stateRequests = () => server.sent('ledgerStreamState').length;
		const source = stream(server.client, 'events', { start: { checkpoint: 1 }, delivery: 'poll' });
		const pending = source.next();
		// The empty pass read through tip 10; the next pass sees tip 2 and must wait.
		await expect.poll(stateRequests).toBeGreaterThanOrEqual(3);
		server.tip = 11;
		expect(label((await pending).value!)).toBe('11:0');
		await source.return(undefined);
		expect(server.sent('scanEvents')).toHaveLength(2);
		// It resumes after everything the empty pass read, not from its own start.
		expect(server.sent('scanEvents')[1]).toMatchObject({
			after: 'history:boundary',
			filter: { afterCheckpoint: 10, beforeCheckpoint: 12 },
		});
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
		await expect.poll(() => server.sent('ledgerStreamState').length).toBeGreaterThanOrEqual(3);
		expect(server.sent('scanCheckpoints')).toHaveLength(0);
		server.tip = 5;
		expect((await source).map(label)).toEqual(['5']);
	});
});

describe('exclusive end probe', () => {
	it('follows a distinct frontier until the server confirms the interval is complete', async () => {
		const [older, newer] = await followTokens('events', [event(1, 0), event(1, 2)]);
		const server = fakeGraphQL().on(
			'scanEvents',
			page('events', [event(1, 1)], { more: true, cursor: 'future-cursor-format' }),
			page('events', []),
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
		expect(server.sent('scanEvents')).toHaveLength(2);
	});

	it.each(['ascending', 'descending'] as const)(
		'probes for the excluded item at a stalled %s frontier',
		async (order) => {
			const descending = order === 'descending';
			const seed = fakeGraphQL().on('scanEvents', page('events', [event(1, 0), event(1, 2)]));
			const [, endItem] = await take(
				stream(seed.client, 'events', { start: { checkpoint: 1 }, order, follow: false }),
				2,
			);
			const stalled = 'opaque-unrecognized-boundary';
			const server = fakeGraphQL().on(
				'scanEvents',
				page('events', [event(1, 1)], { more: true, cursor: stalled }),
				page('events', [], { more: true, cursor: stalled }),
				page('events', [descending ? event(1, 0) : event(1, 2)]),
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
			const [, , probe] = server.sent('scanEvents');
			// The probe reads one item on from the last delivered item, without the end bound.
			expect(probe).toMatchObject(
				descending
					? { last: 1, before: event(1, 1).cursor }
					: { first: 1, after: event(1, 1).cursor },
			);
			expect(probe[descending ? 'after' : 'before']).toBeUndefined();
		},
	);

	it('does not complete when the probe finds another transaction with the same event index', async () => {
		const [endItem] = await followTokens('events', [event(1, 2)]);
		const stalled = 'opaque-stalled-frontier';
		const server = fakeGraphQL().on(
			'scanEvents',
			page('events', [], { more: true, cursor: stalled }),
			page('events', [], { more: true, cursor: stalled }),
			page('events', [event(2, 2)]),
		);
		const error = await rejection(
			collect(
				stream(server.client, 'events', {
					start: { checkpoint: 1 },
					end: { resumeToken: endItem },
				}),
			),
		);
		expect(error).toMatchObject({
			code: 'Protocol',
			message: expect.stringContaining('did not advance'),
		});
	});
});

describe('live handoff', () => {
	it('replays history, subscribes without a cursor, then replays the gap through a fresh indexed tip', async () => {
		const server = fakeGraphQL({ tip: 1 });
		server.on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(0), checkpoint(1)]),
			page('checkpoints', [checkpoint(2), checkpoint(3)]),
		);
		server.on(
			'subscribeCheckpoints',
			after(
				() => (server.tip = 3),
				live('checkpoints', [checkpoint(2, 'live'), checkpoint(3, 'live'), checkpoint(4, 'live')]),
			),
		);
		const log = statusLog();
		const frames = await take(
			stream(server.client, 'checkpoints', { start: { checkpoint: 0 }, onStatus: log.onStatus }),
			5,
		);
		expect(frames.map(label)).toEqual(['0', '1', '2', '3', '4']);
		// Genesis and the gap come from history; the subscription never backfills.
		expect(server.sent('subscribeCheckpoints')).toEqual([{}]);
		expect(server.sent('scanCheckpoints')[1]).toMatchObject({
			after: checkpoint(1).cursor,
			filter: { beforeCheckpoint: 4 },
		});
		expect(log.log).toEqual([
			'Connecting(0)',
			'Connected',
			'Page(history,indexedTip)',
			'Recovering',
			'Page(gap,bound)',
			'Live',
		]);
	});

	// Server bug S1: a replica whose live feed runs ahead of its index skips that checkpoint
	// without an error. The handoff gap replay must recover it whether the stream starts at a
	// checkpoint or resumes from a cursor (`after` on the history query).
	it.each(['a checkpoint start', 'a resume token'] as const)(
		'replays checkpoints skipped when the first live item lands two past history (%s)',
		async (start) => {
			const [anchor] = await followTokens('checkpoints', [checkpoint(10)]);
			const server = fakeGraphQL({ tip: 10 });
			server.on(
				'scanCheckpoints',
				...(start === 'a checkpoint start' ? [page('checkpoints', [checkpoint(10)])] : []),
				after(() => (server.tip = 12), page('checkpoints', [checkpoint(11)])),
				page('checkpoints', [checkpoint(12)]),
			);
			server.on(
				'subscribeCheckpoints',
				after(
					() => (server.tip = 11),
					live('checkpoints', [checkpoint(12, 'live'), checkpoint(13, 'live')]),
				),
			);
			const frames = await take(
				stream(server.client, 'checkpoints', {
					start: start === 'a checkpoint start' ? { checkpoint: 10 } : { resumeToken: anchor },
				}),
				start === 'a checkpoint start' ? 4 : 3,
			);
			expect(frames.map(label)).toEqual(
				start === 'a checkpoint start' ? ['10', '11', '12', '13'] : ['11', '12', '13'],
			);
			expect(server.sent('subscribeCheckpoints')).toEqual([{}]);
		},
	);

	it('delivers a match made before the subscription opened without waiting for a later one', async () => {
		const server = fakeGraphQL({ tip: 9 });
		server.on('scanEvents', page('events', [event(10)]));
		// A sparse filter: the feed never sends anything.
		server.on(
			'subscribeEvents',
			after(() => (server.tip = 10), live('events', [])),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 10 } }), 1);
		expect(frames.map(label)).toEqual(['10:0']);
		expect(server.sent('scanEvents')[0]).toMatchObject({
			filter: { afterCheckpoint: 9, beforeCheckpoint: 11 },
		});
	});

	it('does not repeat a checkpoint that history finished with an empty page', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'scanEvents',
			page('events', [event(10, 0), event(10, 1)], { more: true }),
			page('events', [], { cursor: 'history:boundary:10' }),
			page('events', []),
		);
		// A lagging replica: starts in checkpoint 9 and repeats checkpoint 10 with its own cursors.
		server.on(
			'subscribeEvents',
			live('events', [
				event(9, 0, { source: 'live' }),
				{ ...event(10, 0), cursor: 'replica:10:0' },
				{ ...event(10, 1), cursor: 'replica:10:1' },
				event(11, 0, { source: 'live' }),
			]),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 10 } }), 3);
		expect(frames.map(label)).toEqual(['10:0', '10:1', '11:0']);
	});

	it('retries a failed handoff without waiting for a quiet feed to send something', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'scanEvents',
			page('events', [], { cursor: 'history:boundary:10' }),
			httpStatus(503), // the handoff replay
			page('events', [event(11)]),
		);
		server.on(
			'subscribeEvents',
			after(() => (server.tip = 11), live('events', [])),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 10 } }), 1);
		// The retry read history again instead of hanging in cleanup.
		expect(frames.map(label)).toEqual(['11:0']);
		expect(server.sent('scanEvents')).toHaveLength(3);
	});

	it('replays through a first live checkpoint whose handoff replay failed, on a quiet next feed', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'scanEvents',
			page('events', [], { cursor: 'history:boundary:10' }),
			after(() => (server.tip = 12), page('events', [], { cursor: 'history:boundary:11' })),
			httpStatus(503), // replaying through the first live item's checkpoint, 13
			// The index reaches 13 only after the next handoff has read its tip.
			after(
				() => setTimeout(() => (server.tip = 13), 50),
				page('events', [], { cursor: 'history:boundary:12' }),
			),
			page('events', [event(13)]),
		);
		server.on(
			'subscribeEvents',
			after(() => (server.tip = 11), live('events', [event(13, 0, { source: 'live' })])),
			// The replacement feed opens after 13 and nothing else matches.
			live('events', []),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 10 } }), 1);
		expect(frames.map(label)).toEqual(['13:0']);
		expect(server.sent('scanEvents').at(-1)).toMatchObject({
			filter: { beforeCheckpoint: 14 },
		});
	});

	it('subscribes with the caller filter and selection but never with after or afterCheckpoint', async () => {
		const server = fakeGraphQL({ tip: 1 });
		server.on('scanTransactions', page('transactions', [transaction(2)]));
		server.on(
			'subscribeTransactions',
			after(() => (server.tip = 2), live('transactions', [transaction(2, { source: 'live' })])),
		);
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
				filter: { sentAddress: sender },
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

	it('waits for the index to reach a first live checkpoint past the fresh tip before going live', async () => {
		const server = fakeGraphQL({ tip: 1 });
		server.on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(0), checkpoint(1)]),
			after(() => (server.tip = 3), page('checkpoints', [checkpoint(2)])),
			after(() => (server.tip = 4), page('checkpoints', [checkpoint(3)])),
			page('checkpoints', [checkpoint(4)]),
		);
		server.on(
			'subscribeCheckpoints',
			after(
				() => (server.tip = 2),
				live('checkpoints', [checkpoint(4, 'live'), checkpoint(5, 'live')]),
			),
		);
		const events = timeline();
		await events.read(
			stream(server.client, 'checkpoints', { start: { checkpoint: 0 }, onStatus: events.onStatus }),
			6,
		);
		// The feed started at 4 while the index was at 2: 3 and 4 come from history.
		expect(events.log).toEqual(['0', '1', 'Recovering', '2', '3', '4', 'Live', '5']);
	});

	it('keeps the tip anchor across disconnects before the first match', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on('scanEvents', page('events', [event(11)]));
		server.on(
			'subscribeEvents',
			live('events', [], 'eof'),
			after(() => (server.tip = 11), live('events', [event(11, 0, { source: 'live' })])),
		);
		const [frame] = await take(
			stream(server.client, 'events', { retry: { ...noDelay, maxAttempts: 1 } }),
			1,
		);
		expect(label(frame)).toBe('11:0');
		expect(server.sent('subscribeEvents')).toHaveLength(2);
		// Both attempts started from the anchor at the original tip.
		expect(server.sent('scanEvents').map((variables) => variables.filter.afterCheckpoint)).toEqual([
			10,
		]);
	});

	it('resumes history from a delivered live cursor after the connection ends', async () => {
		const server = fakeGraphQL({ tip: 1 });
		server.on(
			'scanEvents',
			after(() => (server.tip = 3), page('events', [event(2)])), // gap through 2
			page('events', [event(3, 1)]), // history after the live cursor of 3:0
			page('events', [event(4)]), // gap through 4
		);
		server.on(
			'subscribeEvents',
			after(
				() => (server.tip = 2),
				live('events', [event(2, 0, { source: 'live' }), event(3, 0, { source: 'live' })], 'eof'),
			),
			after(() => (server.tip = 4), live('events', [event(4, 0, { source: 'live' })])),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 2 } }), 4);
		expect(frames.map(label)).toEqual(['2:0', '3:0', '3:1', '4:0']);
		expect(new Set(frames.map(token)).size).toBe(4);
		// The reconnect read history after the subscription's own cursor.
		expect(server.sent('scanEvents')[1]).toMatchObject({
			after: event(3, 0, { source: 'live' }).cursor,
			filter: { afterCheckpoint: 2 },
		});
	});

	it('does not deliver a checkpoint twice when a new feed starts behind the committed one', async () => {
		const server = fakeGraphQL({ tip: 5 });
		server.on(
			'scanEvents',
			page('events', [event(5)]), // history through checkpoint 5
			page('events', [event(6, 1)]), // history after the live cursor of 6:0
		);
		const firstFeed = live(
			'events',
			[event(5, 0, { source: 'live' }), event(6, 0, { source: 'live' })],
			'eof',
		);
		server.on(
			'subscribeEvents',
			(request) => {
				// The index reaches 6 just after this feed's handoff read its tip.
				setTimeout(() => (server.tip = 6), 20);
				return firstFeed(request);
			},
			// A lagging replica: starts in checkpoint 5 and repeats checkpoint 6 with new cursors.
			live('events', [
				event(5, 0, { source: 'live', transaction: 'tx5' }),
				{ ...event(6, 0), cursor: 'replica:6:0' },
				{ ...event(6, 1), cursor: 'replica:6:1' },
				event(7, 0, { source: 'live' }),
			]),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 5 } }), 4);
		expect(frames.map(label)).toEqual(['5:0', '6:0', '6:1', '7:0']);
		// History after 6:0 read through checkpoint 6, so the second handoff needed no request.
		expect(server.sent('scanEvents')).toHaveLength(2);
	});
});

describe('live delivery', () => {
	it('repairs skipped live checkpoints only once history is complete, then reports Live again', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(10)]),
			after(() => (server.tip = 12), page('checkpoints', [checkpoint(11)])),
			page('checkpoints', [checkpoint(12)]),
		);
		server.on(
			'subscribeCheckpoints',
			after(
				() => (server.tip = 11),
				live('checkpoints', [
					checkpoint(10, 'live'),
					checkpoint(13, 'live'),
					checkpoint(14, 'live'),
				]),
			),
		);
		const events = timeline();
		await events.read(
			stream(server.client, 'checkpoints', {
				start: { checkpoint: 10 },
				onStatus: events.onStatus,
			}),
			5,
		);
		expect(events.log).toEqual([
			'10',
			'Recovering',
			'11',
			'Live',
			'Recovering',
			'12',
			'Live',
			'13',
			'14',
		]);
	});

	it('drops a live checkpoint repeating the resume position', async () => {
		const [anchor] = await followTokens('checkpoints', [checkpoint(10)]);
		const server = fakeGraphQL({ tip: 10 });
		server.on('scanCheckpoints', page('checkpoints', []));
		server.on(
			'subscribeCheckpoints',
			live('checkpoints', [checkpoint(10, 'live'), checkpoint(11, 'live')]),
		);
		const frames = await take(
			stream(server.client, 'checkpoints', { start: { resumeToken: anchor } }),
			1,
		);
		expect(frames.map(label)).toEqual(['11']);
	});

	it('treats each checkpoint as covering itself, so consecutive live checkpoints need no repair', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(10)]),
			page('checkpoints', [checkpoint(11)]),
		);
		server.on(
			'subscribeCheckpoints',
			after(
				() => (server.tip = 11),
				live('checkpoints', [
					checkpoint(11, 'live'),
					checkpoint(12, 'live'),
					checkpoint(13, 'live'),
				]),
			),
		);
		const frames = await take(
			stream(server.client, 'checkpoints', { start: { checkpoint: 10 } }),
			4,
		);
		expect(frames.map(label)).toEqual(['10', '11', '12', '13']);
		expect(server.sent('scanCheckpoints')).toHaveLength(2); // history and the handoff gap
	});

	it('looks up missing checkpoints with one deduplicated request per page, in order', async () => {
		const server = fakeGraphQL();
		server.on(
			'scanEvents',
			page('events', [
				event(3, 0, { transaction: 'a', indexed: false }),
				event(3, 1, { transaction: 'a', indexed: false }),
				event(4, 0, { transaction: 'b', indexed: false }),
			]),
		);
		server.on('streamTransactionCheckpoints', checkpointLookup([3, 4]));
		const frames = await collect(
			stream(server.client, 'events', { start: { checkpoint: 3 }, end: { checkpoint: 5 } }),
		);
		expect(frames.map(label)).toEqual(['3:0', '3:1', '4:0']);
		expect(server.sent('streamTransactionCheckpoints')).toEqual([{ digests: ['a', 'b'] }]);
	});

	it('keeps a live node the index has not placed yet and looks it up again', async () => {
		const server = fakeGraphQL({ tip: 0 });
		server.on('streamTransactionCheckpoints', checkpointLookup([null]), checkpointLookup([1]));
		server.on(
			'subscribeTransactions',
			live('transactions', [transaction(1, { source: 'live', indexed: false })]),
		);
		const [frame] = await take(
			stream(server.client, 'transactions', {
				start: { checkpoint: 1 },
				retry: { ...noDelay, maxAttempts: 0 },
			}),
			1,
		);
		expect(label(frame)).toBe('tx1');
		// The subscription stays open; only the lookup is repeated.
		expect(server.sent('subscribeTransactions')).toHaveLength(1);
		expect(server.sent('streamTransactionCheckpoints')).toHaveLength(2);
	});

	it('does not abandon a live node the index places only after the next subscription opened', async () => {
		const server = fakeGraphQL({ tip: 0 });
		server.on('scanTransactions', page('transactions', [transaction(1)]));
		server.on(
			'streamTransactionCheckpoints',
			checkpointLookup([null]),
			after(() => (server.tip = 1), checkpointLookup([1])),
		);
		server.on(
			'subscribeTransactions',
			live('transactions', [transaction(1, { source: 'live', indexed: false })]),
			// A replacement feed would start after the node; nothing else ever matches.
			live('transactions', []),
		);
		const [frame] = await take(
			stream(server.client, 'transactions', { start: { checkpoint: 1 } }),
			1,
		);
		expect(label(frame)).toBe('tx1');
	});

	it('replays through a live node whose lookup failed once the next subscription opens', async () => {
		const server = fakeGraphQL({ tip: 0 });
		server.on('scanTransactions', page('transactions', [transaction(1)]));
		server.on(
			'streamTransactionCheckpoints',
			httpStatus(503),
			checkpointLookup([null]),
			after(() => (server.tip = 1), checkpointLookup([1])),
		);
		server.on(
			'subscribeTransactions',
			live('transactions', [transaction(1, { source: 'live', indexed: false })]),
			live('transactions', []),
		);
		const [frame] = await take(
			stream(server.client, 'transactions', { start: { checkpoint: 1 } }),
			1,
		);
		expect(label(frame)).toBe('tx1');
		expect(server.sent('subscribeTransactions')).toHaveLength(2);
		// History delivered it once the gap replay reached the node's checkpoint.
		expect(server.sent('scanTransactions').at(-1)).toMatchObject({
			filter: { beforeCheckpoint: 2 },
		});
	});

	it('looks up the checkpoint of a live transaction once for all its events', async () => {
		const server = fakeGraphQL({ tip: 0 });
		server.on('streamTransactionCheckpoints', checkpointLookup([1]));
		server.on(
			'subscribeEvents',
			// The feed runs ahead of the index, so these are delivered live.
			live(
				'events',
				[0, 1, 2].map((index) =>
					event(1, index, { source: 'live', transaction: 'tx1', indexed: false }),
				),
			),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 1 } }), 3);
		expect(frames.map(label)).toEqual(['1:0', '1:1', '1:2']);
		expect(server.sent('streamTransactionCheckpoints')).toHaveLength(1);
	});

	it('cancels a pending checkpoint lookup when the stream is closed', async () => {
		const server = fakeGraphQL({ tip: 0 });
		let lookupSignal: AbortSignal | undefined;
		server.on('streamTransactionCheckpoints', (request) => {
			lookupSignal = request.signal;
			return new Promise<Response>((_, reject) =>
				request.signal.addEventListener('abort', () => reject(request.signal.reason)),
			);
		});
		server.on(
			'subscribeTransactions',
			live('transactions', [transaction(1, { source: 'live', indexed: false })]),
		);
		const source = stream(server.client, 'transactions', { start: { checkpoint: 1 } });
		const pending = source.next().catch((error: unknown) => error);
		await expect.poll(() => lookupSignal).toBeDefined();
		await source.return(undefined);
		expect(lookupSignal!.aborted).toBe(true);
		expect(await pending).toMatchObject({ name: 'AbortError' });
	});

	it('reconnects at once after a connection that delivered data, and backs off otherwise', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(11)]),
			page('checkpoints', [checkpoint(12)]),
		);
		server.on(
			'subscribeCheckpoints',
			after(() => (server.tip = 11), live('checkpoints', [checkpoint(11, 'live')], 'eof')),
			httpStatus(503),
			after(() => (server.tip = 12), live('checkpoints', [checkpoint(12, 'live')])),
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

	it.each<[string, Answer]>([
		['fetch', networkFailure],
		['body', brokenBody],
		['HTTP 503', httpStatus(503)],
		[
			'transient response error',
			reply({ errors: [{ message: 'busy', extensions: { code: 'SERVICE_UNAVAILABLE' } }] }),
		],
	])('retries a %s failure', async (_name, failure) => {
		const server = fakeGraphQL().on(
			'scanCheckpoints',
			failure,
			page('checkpoints', [checkpoint(1)]),
		);
		const frames = await collect(stream(server.client, 'checkpoints', finiteCheckpoints));
		expect(frames.map(label)).toEqual(['1']);
		expect(server.sent('scanCheckpoints')).toHaveLength(2);
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

	it('throws subscription response errors as SuiGraphQLRequestError', async () => {
		const server = fakeGraphQL({ tip: 10 });
		server.on(
			'subscribeEvents',
			liveMessages([{ errors: [{ message: 'subscription rejected' }] }]),
		);
		const error = await rejection(take(stream(server.client, 'events', {}), 1));
		expect(error).toBeInstanceOf(SuiGraphQLRequestError);
		expect(error).toMatchObject({ message: 'subscription rejected', retryable: false });
	});

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
