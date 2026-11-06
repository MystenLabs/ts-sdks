// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The GraphQL ledger stream adapter: response mapping, Relay paging, subscriptions, retention and
 * error classification. Core behaviour (exactly-once delivery, resuming, retries, statuses,
 * completion) is tested against a model adapter in `test/unit/client/stream`.
 */

import { describe, expect, it, onTestFinished, vi } from 'vitest';

import type { SuiClientTypes } from '../../../../src/client/index.js';
import { SuiGraphQLRequestError, type SuiGraphQLClient } from '../../../../src/graphql/index.js';
import {
	Transaction as GrpcTransaction,
	TransactionExpiration_TransactionExpirationKind as ExpirationKind,
	TransactionKind_Kind as Kind,
} from '../../../../src/grpc/proto/sui/rpc/v2/transaction.js';
import { collect, noDelay, statusLog, take } from '../../client/stream/fake-ledger.js';
import {
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
	type FakeServer,
} from './fake-graphql.js';

type Family = 'checkpoints' | 'transactions' | 'events';
type Frame =
	| SuiClientTypes.StreamCheckpoint
	| SuiClientTypes.StreamTransaction<any>
	| SuiClientTypes.StreamEvent
	| SuiClientTypes.StreamProgressFrame
	| SuiClientTypes.StreamCompletionFrame;

function stream(
	client: SuiGraphQLClient,
	family: Family,
	options: SuiClientTypes.StreamTransactionsOptions<any, any> = {},
): AsyncGenerator<Frame> {
	const merged = { pollInterval: 1, retry: noDelay, ...options };
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
	if (!frame?.resumeToken) throw new Error('frame has no token');
	return frame.resumeToken;
}

const capitalized = (family: Family) => `${family[0].toUpperCase()}${family.slice(1)}`;
const operations = (server: FakeServer) => server.requests.map((request) => request.operation);
const progressEdge = (name: string) => ({ cursor: `live:progress:${name}`, node: null }) as never;

describe('mapping', () => {
	const edgeOf = (family: Family, cp: number, source: 'history' | 'live' = 'history') =>
		family === 'checkpoints'
			? checkpoint(cp, source)
			: family === 'transactions'
				? transaction(cp, { source })
				: event(cp, 0, { source });

	it.each(['checkpoints', 'transactions', 'events'] as const)(
		'maps %s pages and edges, paging from genesis, and resumes from their positions',
		async (family) => {
			// A subscription cannot backfill from genesis, so history is paged first.
			const server = fakeGraphQL({ tip: 3 })
				.on(`scan${capitalized(family)}`, page(family, [edgeOf(family, 0), edgeOf(family, 2)]))
				.on(`subscribe${capitalized(family)}`, live(family, [edgeOf(family, 4, 'live')]));
			const frames = await take(stream(server.client, family, { start: { checkpoint: 0 } }), 3);
			expect(frames.map(label)).toEqual(
				{
					checkpoints: ['0', '2', '4'],
					transactions: ['tx0', 'tx2', 'tx4'],
					events: ['0:0', '2:0', '4:0'],
				}[family],
			);
			// One request per page, none per live item.
			expect(operations(server)).toEqual([
				'ledgerStreamState',
				`scan${capitalized(family)}`,
				`subscribe${capitalized(family)}`,
			]);
			expect(server.sent(`subscribe${capitalized(family)}`)[0]).toMatchObject(
				family === 'checkpoints' ? { afterCheckpoint: 3 } : { filter: { afterCheckpoint: 3 } },
			);

			// Checkpoints resume by sequence number; transactions and events after their cursor.
			const resumed = fakeGraphQL({ tip: 10 }).on(
				`subscribe${capitalized(family)}`,
				live(family, [edgeOf(family, 5, 'live')]),
			);
			await take(stream(resumed.client, family, { start: { resumeToken: token(frames[2]) } }), 1);
			expect(resumed.sent(`subscribe${capitalized(family)}`)[0]).toMatchObject(
				family === 'checkpoints'
					? { afterCheckpoint: 4 }
					: { after: edgeOf(family, 4, 'live').cursor },
			);
		},
	);

	it('subscribes with the caller filter and selection', async () => {
		const server = fakeGraphQL({ tip: 1 }).on(
			'subscribeTransactions',
			live('transactions', [transaction(2)]),
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
				filter: { sentAddress: sender, afterCheckpoint: 1 },
				includeTransaction: false,
				includeEffects: false,
				includeEvents: true,
				includeBalanceChanges: false,
				includeObjectTypes: false,
				includeBcs: false,
			},
		]);
	});

	it('maps transactions as listTransactions does, reading every page of events', async () => {
		const events = Array.from({ length: 51 }, (_, i) => event(1, i).node);
		const node = {
			effects: {
				events: { nodes: events.slice(0, 50) },
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
		const server = fakeGraphQL()
			.on('scanTransactions', page('transactions', [edge]))
			.on(
				'getTransactionEvents',
				reply({
					data: {
						transaction: {
							effects: {
								events: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: events },
							},
						},
					},
				}),
			)
			.on(
				'listTransactions',
				reply({
					data: {
						transactions: {
							edges: [edge],
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
		expect(streamed.transaction.Transaction?.events).toHaveLength(51);
		const selection = (variables: Record<string, unknown>) =>
			Object.fromEntries(Object.entries(variables).filter(([key]) => key.startsWith('include')));
		expect(selection(server.sent('scanTransactions')[0])).toEqual(
			selection(server.sent('listTransactions')[0]),
		);
	});

	it("reads a page's nested event pages concurrently", async () => {
		const events = Array.from({ length: 50 }, (_, i) => event(1, i).node);
		const edges = ['a', 'b'].map((digest) =>
			transaction(1, { digest, node: { effects: { events: { nodes: events } } } }),
		);
		let inFlight = 0;
		let maxInFlight = 0;
		const server = fakeGraphQL()
			.on('scanTransactions', page('transactions', edges))
			.on('getTransactionEvents', async () => {
				maxInFlight = Math.max(maxInFlight, ++inFlight);
				await new Promise((resolve) => setTimeout(resolve, 5));
				inFlight--;
				return Response.json({
					data: {
						transaction: {
							effects: { events: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } },
						},
					},
				});
			});
		await collect(
			server.client.streamTransactions({
				start: { checkpoint: 1 },
				end: { checkpoint: 2 },
				include: { events: true },
			}),
		);
		expect(maxInFlight).toBe(2);
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
	});

	it('fails a history page item without a checkpoint as a protocol error', async () => {
		const server = fakeGraphQL().on(
			'scanEvents',
			page('events', [event(3, 0, { indexed: false })]),
		);
		await expect(
			collect(
				stream(server.client, 'events', { start: { checkpoint: 3 }, end: { checkpoint: 5 } }),
			),
		).rejects.toMatchObject({ code: 'Protocol' });
	});
});

describe('Relay paging', () => {
	it('continues ascending after endCursor, with a Progress frame for an empty page', async () => {
		const frontier = 'history:frontier:3';
		const server = fakeGraphQL().on(
			'scanEvents',
			page('events', [], { more: true, cursor: frontier }),
			page('events', [event(3)]),
		);
		const range = { start: { checkpoint: 1 }, end: { checkpoint: 6 } };
		const frames = await collect(
			stream(server.client, 'events', { ...range, frames: { progress: true } }),
		);
		expect(frames.map(label)).toEqual(['Progress', '3:0', 'Progress']);
		expect(server.sent('scanEvents')).toEqual([
			expect.objectContaining({ first: 50, filter: { afterCheckpoint: 0, beforeCheckpoint: 6 } }),
			expect.objectContaining({ after: frontier }),
		]);

		// The progress token resumes after the frontier.
		const resumed = fakeGraphQL().on('scanEvents', page('events', [event(3)]));
		await collect(
			stream(resumed.client, 'events', {
				start: { resumeToken: token(frames[0]) },
				end: range.end,
			}),
		);
		expect(resumed.sent('scanEvents')[0]).toMatchObject({ after: frontier });
	});

	it('continues descending before startCursor', async () => {
		const server = fakeGraphQL({ tip: 10 }).on(
			'scanCheckpoints',
			page('checkpoints', [checkpoint(9), checkpoint(10)], { more: true }),
			page('checkpoints', [checkpoint(7), checkpoint(8)]),
		);
		const frames = await collect(
			stream(server.client, 'checkpoints', {
				order: 'descending',
				start: { checkpoint: 10 },
				end: { checkpoint: 6 },
			}),
		);
		expect(frames.map(label)).toEqual(['10', '9', '8', '7']);
		expect(server.sent('scanCheckpoints')).toEqual([
			expect.objectContaining({ last: 50, filter: { afterCheckpoint: 6, beforeCheckpoint: 11 } }),
			expect.objectContaining({ before: checkpoint(9).cursor }),
		]);
	});
});

describe('subscriptions', () => {
	it('subscribes after a start checkpoint, and the server backfills history', async () => {
		const server = fakeGraphQL({ tip: 10 }).on(
			'subscribeEvents',
			live('events', [event(5), event(9), event(11, 0, { source: 'live' })]),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 5 } }), 3);
		expect(frames.map(label)).toEqual(['5:0', '9:0', '11:0']);
		expect(operations(server)).toEqual(['ledgerStreamState', 'subscribeEvents']);
		expect(server.sent('subscribeEvents')).toEqual([{ filter: { afterCheckpoint: 4 } }]);
	});

	it('reports Connected when a feed opens, and still spends the budget on feeds without frames', async () => {
		const server = fakeGraphQL({ tip: 10 }).on('subscribeEvents', live('events', [], 'eof'));
		const log = statusLog();
		const error = await collect(
			stream(server.client, 'events', {
				onStatus: log.onStatus,
				retry: { ...noDelay, maxAttempts: 2 },
			}),
		).catch((error: unknown) => error);
		expect(error).toMatchObject({ name: 'SuiStreamError', code: 'Disconnected' });
		expect(log.log).toEqual([
			'Connecting(0)',
			'Connected',
			'Retrying(1)',
			'Connecting(1)',
			'Connected',
			'Retrying(2)',
			'Connecting(2)',
			'Connected',
		]);
	});

	it('reports Connected for a resumed follow whose feed opens without frames', async () => {
		const server = fakeGraphQL({ tip: 10 }).on('subscribeEvents', live('events', []));
		const log = statusLog();
		const source = stream(server.client, 'events', {
			start: { checkpoint: 5 },
			onStatus: log.onStatus,
		});
		const pending = source.next().catch(() => {});
		await expect.poll(() => log.log).toEqual(['Connecting(0)', 'Connected']);
		await source.return(undefined);
		await pending;
	});

	it('maps progress edges to Progress frames, and resumes after their cursor', async () => {
		const seed = fakeGraphQL({ tip: 10 }).on(
			'subscribeEvents',
			live('events', [progressEdge('a'), progressEdge('b')]),
		);
		const frames = await take(stream(seed.client, 'events', { frames: { progress: true } }), 3);
		// The first is the tip baseline; the edges carry no checkpoint.
		expect(frames.map(label)).toEqual(['Progress', 'Progress', 'Progress']);

		const server = fakeGraphQL({ tip: 12 }).on('subscribeEvents', live('events', [event(12)]));
		await take(stream(server.client, 'events', { start: { resumeToken: token(frames[2]) } }), 1);
		expect(server.sent('subscribeEvents')[0].after).toBe('live:progress:b');
		expect(server.sent('scanEvents')).toHaveLength(0);
	});

	it('resumes after the last delivered cursor when the connection ends', async () => {
		const server = fakeGraphQL({ tip: 1 }).on(
			'subscribeEvents',
			live('events', [event(2, 0, { source: 'live' })], 'eof'),
			live('events', [event(3, 0, { source: 'live' })]),
		);
		const frames = await take(stream(server.client, 'events', { start: { checkpoint: 2 } }), 2);
		expect(frames.map(label)).toEqual(['2:0', '3:0']);
		expect(server.sent('subscribeEvents')[1]).toEqual({
			filter: {},
			after: event(2, 0, { source: 'live' }).cursor,
		});
	});

	it('keeps the tip anchor across disconnects before the first match', async () => {
		const server = fakeGraphQL({ tip: 10 }).on(
			'subscribeEvents',
			live('events', [], 'eof'),
			live('events', [event(11, 0, { source: 'live' })]),
		);
		const [frame] = await take(stream(server.client, 'events'), 1);
		expect(label(frame)).toBe('11:0');
		expect(server.sent('subscribeEvents')).toEqual([
			{ filter: { afterCheckpoint: 10 } },
			{ filter: { afterCheckpoint: 10 } },
		]);
	});

	it('fails on a live item without a checkpoint', async () => {
		const server = fakeGraphQL({ tip: 0 }).on(
			'subscribeTransactions',
			live('transactions', [transaction(1, { source: 'live', indexed: false })]),
		);
		await expect(
			take(stream(server.client, 'transactions', { start: { checkpoint: 1 } }), 1),
		).rejects.toMatchObject({ name: 'SuiStreamError', code: 'Protocol' });
		expect(server.sent('subscribeTransactions')).toHaveLength(1);
	});
});

describe('lagging replicas', () => {
	it('reads an ascending range again after what the answering replica had indexed', async () => {
		const server = fakeGraphQL({ tip: 100 }).on(
			'scanEvents',
			page('events', [event(90)], { viewedAt: 95 }),
			page('events', [event(98)]),
		);
		const frames = await collect(
			stream(server.client, 'events', {
				start: { checkpoint: 90 },
				follow: false,
				frames: { completion: true },
			}),
		);
		expect(frames.map(label)).toEqual(['90:0', '98:0', 'Complete']);
		expect(server.sent('scanEvents')[1].filter).toMatchObject({ afterCheckpoint: 95 });
	});

	it('reads a descending range again when the replica is behind its high end', async () => {
		const server = fakeGraphQL({ tip: 10 }).on(
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
});

describe('error classification', () => {
	const finite = {
		start: { checkpoint: 1 },
		end: { checkpoint: 2 },
		retry: { ...noDelay, maxAttempts: 3 },
	};
	const responseError = (...codes: (string | undefined)[]): Answer =>
		reply({
			errors: codes.map((code) => ({
				message: code ?? 'failed',
				extensions: code ? { code } : undefined,
			})),
		});

	/** The reasons a page read was retried for before it succeeded or failed. */
	async function pageFailure(failure: Answer) {
		const server = fakeGraphQL().on(
			'scanCheckpoints',
			failure,
			page('checkpoints', [checkpoint(1)]),
		);
		const reasons: string[] = [];
		const result = await collect(
			stream(server.client, 'checkpoints', {
				...finite,
				onStatus: (status) => status.$kind === 'Retrying' && reasons.push(status.reason),
			}),
		).catch((error: unknown) => error);
		return { result, reasons, requests: server.sent('scanCheckpoints').length };
	}

	it.each<[string, Answer, SuiClientTypes.RetryReason]>([
		['a rejected fetch', networkFailure, 'Unavailable'],
		['a body read failure', brokenBody, 'Unavailable'],
		['HTTP 429', httpStatus(429), 'RateLimited'],
		['HTTP 502', httpStatus(502), 'ServerError'],
		['HTTP 503', httpStatus(503), 'Unavailable'],
		['HTTP 504', httpStatus(504), 'ServerError'],
		['HTTP 408', httpStatus(408), 'ServerError'],
		['HTTP 500', httpStatus(500), 'ServerError'],
		['REQUEST_TIMEOUT', responseError('REQUEST_TIMEOUT'), 'ServerError'],
		['INTERNAL_SERVER_ERROR', responseError('INTERNAL_SERVER_ERROR'), 'ServerError'],
		['RESOURCE_EXHAUSTED', responseError('RESOURCE_EXHAUSTED'), 'RateLimited'],
	])('retries %s as %s', async (_, failure, reason) => {
		const { result, reasons, requests } = await pageFailure(failure);
		expect((result as Frame[]).map(label)).toEqual(['1']);
		expect(reasons).toEqual([reason]);
		expect(requests).toBe(2);
	});

	it.each<[string, Answer]>([
		['HTTP 400', httpStatus(400)],
		['HTTP 404', httpStatus(404)],
		['BAD_USER_INPUT', responseError('BAD_USER_INPUT')],
		['an error without a code', responseError(undefined)],
		[
			'a retryable code beside a fatal one',
			responseError('INTERNAL_SERVER_ERROR', 'BAD_USER_INPUT'),
		],
	])('throws %s without retrying', async (_, failure) => {
		const { result, reasons, requests } = await pageFailure(failure);
		expect(result).toBeInstanceOf(SuiGraphQLRequestError);
		expect(result).toMatchObject({ reason: undefined });
		expect(reasons).toEqual([]);
		expect(requests).toBe(1);
	});

	it('throws response errors with the errors as cause', async () => {
		const errors = [{ message: 'bad filter', extensions: { code: 'BAD_USER_INPUT' } }];
		const { result } = await pageFailure(reply({ errors }));
		expect(result).toMatchObject({ message: 'bad filter', cause: errors });
	});

	it('retries while no checkpoint has been indexed', async () => {
		const server = fakeGraphQL().on('scanCheckpoints', page('checkpoints', [checkpoint(1)]));
		server.tip = null;
		const reasons: string[] = [];
		await collect(
			stream(server.client, 'checkpoints', {
				...finite,
				onStatus: (status) => {
					if (status.$kind !== 'Retrying') return;
					reasons.push(status.reason);
					server.tip = 1;
				},
			}),
		);
		expect(reasons).toEqual(['Unavailable']);
	});

	describe('subscription results', () => {
		const liveEdge = (cp: number) => ({
			data: { transactions: transaction(cp, { source: 'live' }) },
		});

		it('retries a later INTERNAL_SERVER_ERROR result from the last cursor', async () => {
			const failed = {
				data: { transactions: { cursor: 'live:transaction:unresolved', node: null } },
				errors: [{ message: 'node failed', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
			};
			const server = fakeGraphQL({ tip: 1 }).on(
				'subscribeTransactions',
				liveMessages([liveEdge(2), failed]),
				live('transactions', [transaction(3, { source: 'live' })]),
			);
			const frames = await take(
				stream(server.client, 'transactions', { start: { checkpoint: 2 } }),
				2,
			);
			expect(frames.map(label)).toEqual(['tx2', 'tx3']);
			expect(server.sent('subscribeTransactions')[1].after).toBe(
				transaction(2, { source: 'live' }).cursor,
			);
		});
	});

	describe('MVR name resolution', () => {
		const filter = { eventType: '@test/pkg::module::Event' };
		const resolved = `${'0x'.padEnd(66, '1')}::module::Event`;

		/** Answers MVR requests (sent to the global `fetch`) in order; the last answer repeats. */
		function mvrServer(...answers: (() => Response)[]) {
			const mvrFetch = vi.fn(async () => (answers.length > 1 ? answers.shift()! : answers[0])());
			vi.stubGlobal('fetch', mvrFetch);
			onTestFinished(() => {
				vi.unstubAllGlobals();
			});
			return mvrFetch;
		}

		it('retries a failed MVR request as Unavailable', async () => {
			const server = fakeGraphQL({ mvrUrl: 'https://mvr.example' }).on(
				'scanEvents',
				page('events', [event(1)]),
			);
			const mvrFetch = mvrServer(
				() => Response.json({ message: 'down' }, { status: 503 }),
				() => Response.json({ resolution: { [filter.eventType]: { type_tag: resolved } } }),
			);
			const reasons: string[] = [];
			const frames = await collect(
				server.client.streamEvents({
					...finite,
					filter,
					onStatus: (status) => status.$kind === 'Retrying' && reasons.push(status.reason),
				}),
			);
			expect(frames.map(label)).toEqual(['1:0']);
			expect(mvrFetch).toHaveBeenCalledTimes(2);
			expect(reasons).toEqual(['Unavailable']);
		});

		it('does not retry a name that does not resolve', async () => {
			const server = fakeGraphQL({ mvrUrl: 'https://mvr.example' });
			const mvrFetch = mvrServer(() => Response.json({ resolution: {} }));
			await expect(collect(server.client.streamEvents({ ...finite, filter }))).rejects.toThrow(
				'Failed to resolve type',
			);
			expect(mvrFetch).toHaveBeenCalledTimes(1);
			expect(server.requests).toEqual([]);
		});
	});
});
