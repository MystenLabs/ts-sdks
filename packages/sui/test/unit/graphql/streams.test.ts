// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BinaryWriter, WireType } from '@protobuf-ts/runtime';
import { toBase64 } from '@mysten/utils';
import { describe, expect, it, vi } from 'vitest';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { compareLedgerCursors, decodeLedgerCursor } from '../../../src/client/stream-cursor.js';

function cursor(
	family: 'checkpoints' | 'transactions' | 'events',
	cp: number,
	tx = cp,
	event = 0,
	boundary = false,
) {
	const position = new BinaryWriter().tag(1, WireType.Varint).uint64(cp);
	if (family !== 'checkpoints') position.tag(2, WireType.Varint).uint64(tx);
	if (family === 'events') position.tag(3, WireType.Varint).uint32(event);
	return toBase64(
		new BinaryWriter()
			.tag(5, WireType.Varint)
			.uint32(boundary ? 2 : 1)
			.tag(
				family === 'checkpoints' ? 6 : family === 'transactions' ? 7 : 8,
				WireType.LengthDelimited,
			)
			.bytes(position.finish())
			.finish(),
	);
}
function checkpoint(cp: number) {
	return {
		cursor: cursor('checkpoints', cp),
		node: {
			sequenceNumber: cp,
			digest: `digest${cp}`,
			epoch: { epochId: 0 },
			timestamp: '2026-01-01T00:00:00Z',
		},
	};
}
function event(cp: number, index = 0) {
	return {
		cursor: cursor('events', cp, cp, index),
		node: {
			sequenceNumber: index,
			transaction: { digest: `tx${cp}`, effects: { checkpoint: { sequenceNumber: cp } } },
			transactionModule: { package: { address: '0x2' }, name: 'test' },
			sender: { address: '0x1' },
			contents: { type: { repr: '0x2::test::Event' }, bcs: '', json: { cp, index } },
		},
	};
}
function connection(edges: unknown[], more = false, next?: string) {
	return {
		edges,
		pageInfo: {
			hasNextPage: more,
			hasPreviousPage: more,
			startCursor: next ?? (edges[0] as { cursor: string } | undefined)?.cursor ?? null,
			endCursor: next ?? (edges.at(-1) as { cursor: string } | undefined)?.cursor ?? null,
		},
	};
}
function subscription(family: string, edges: unknown[]) {
	return new Response(
		new ReadableStream({
			start(controller) {
				for (const edge of edges)
					controller.enqueue(
						new TextEncoder().encode(
							`event: next\ndata: ${JSON.stringify({ data: { [family]: edge } })}\n\n`,
						),
					);
				controller.close();
			},
		}),
		{ headers: { 'content-type': 'text/event-stream' } },
	);
}
type Request = { query: string; variables: Record<string, any> };
function mockClient(
	handler: (request: Request) => Response | Promise<Response>,
	tip: () => number = () => 10,
) {
	const requests: Request[] = [];
	const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
		const request = JSON.parse(String(init?.body)) as Request;
		requests.push(request);
		if (request.query.includes('query ledgerStreamState'))
			return Response.json({
				data: {
					chainIdentifier: 'chain',
					serviceConfig: {
						availableRange: { first: { sequenceNumber: 0 }, last: { sequenceNumber: tip() } },
					},
				},
			});
		return handler(request);
	});
	return {
		client: new SuiGraphQLClient({ url: 'https://example.com/graphql', network: 'unknown', fetch }),
		requests,
	};
}
async function collect<T>(source: AsyncIterable<T>) {
	const result: T[] = [];
	for await (const item of source) result.push(item);
	return result;
}

describe('GraphQL ledger streams', () => {
	it('captures the indexed cutoff once, pages descending, and preserves the lower bound', async () => {
		let calls = 0;
		const { client, requests } = mockClient(() =>
			Response.json({
				data: {
					checkpoints:
						++calls === 1
							? connection([checkpoint(9), checkpoint(10)], true, cursor('checkpoints', 9))
							: connection([checkpoint(7), checkpoint(8)]),
				},
			}),
		);
		const items = await collect(
			client.streamCheckpoints({
				order: 'descending',
				end: { checkpoint: '6' },
				include: { completion: true },
			}),
		);
		expect(
			items.map((item) =>
				item.$kind === 'Checkpoint' ? item.checkpoint.sequenceNumber : item.$kind,
			),
		).toEqual(['10', '9', '8', '7', 'Complete']);
		const scans = requests.filter((request) => request.query.includes('query scanCheckpoints'));
		expect(scans[0].variables).toMatchObject({
			filter: { afterCheckpoint: 6, beforeCheckpoint: 11 },
			last: 50,
		});
		expect(scans[1].variables).toMatchObject({
			filter: { afterCheckpoint: 6, beforeCheckpoint: 11 },
			before: cursor('checkpoints', 9),
		});
	});

	it('persists finite cutoff when resuming while the indexed tip grows', async () => {
		let tip = 2;
		const { client, requests } = mockClient(
			() => Response.json({ data: { checkpoints: connection([checkpoint(1), checkpoint(2)]) } }),
			() => tip,
		);
		const iterator = client.streamCheckpoints({ start: { checkpoint: '1' }, follow: false });
		const first = (await iterator.next()).value!;
		await iterator.return(undefined);
		tip = 50;
		const second = mockClient(
			() => Response.json({ data: { checkpoints: connection([checkpoint(2)]) } }),
			() => tip,
		);
		await collect(second.client.streamCheckpoints({ start: { resumeToken: first.resumeToken } }));
		expect(
			second.requests.find((request) => request.query.includes('query scanCheckpoints'))?.variables
				.filter.beforeCheckpoint,
		).toBe(3);
		expect(
			requests.filter((request) => request.query.includes('query scanCheckpoints')),
		).toHaveLength(1);
	});

	it('reads genesis then subscribes after checkpoint zero', async () => {
		const { client, requests } = mockClient(({ query }) =>
			query.includes('query scanCheckpoints')
				? Response.json({ data: { checkpoints: connection([checkpoint(0)]) } })
				: subscription('checkpoints', [checkpoint(1)]),
		);
		const stream = client.streamCheckpoints({ start: { checkpoint: '0' } });
		expect((await stream.next()).value?.checkpoint.sequenceNumber).toBe('0');
		expect((await stream.next()).value?.checkpoint.sequenceNumber).toBe('1');
		await stream.return(undefined);
		expect(
			requests.find((request) => request.query.includes('subscription subscribeCheckpoints'))
				?.variables.afterCheckpoint,
		).toBe(0);
	});

	it('anchors tip before the first matching item across disconnects', async () => {
		let calls = 0;
		const { client, requests } = mockClient(() =>
			subscription('events', ++calls === 1 ? [] : [event(11)]),
		);
		const stream = client.streamEvents({ retry: { initialDelay: 0, jitter: 0, maxAttempts: 1 } });
		expect((await stream.next()).value?.event.checkpoint).toBe('11');
		await stream.return(undefined);
		const subscriptions = requests.filter((request) =>
			request.query.includes('subscription subscribeEvents'),
		);
		expect(subscriptions).toHaveLength(2);
		expect(subscriptions.map((request) => request.variables.filter.afterCheckpoint)).toEqual([
			10, 10,
		]);
	});

	it('uses the edge cursor checkpoint when subscription backfill nodes omit it', async () => {
		const node = {
			digest: 'tx1',
			signatures: [],
			effects: { status: 'SUCCESS', checkpoint: null },
		};
		const { client } = mockClient(() =>
			subscription('transactions', [{ cursor: cursor('transactions', 1), node }]),
		);
		const stream = client.streamTransactions({ start: { checkpoint: '1' } });
		expect((await stream.next()).value?.transaction.Transaction?.checkpoint).toBe('1');
		await stream.return(undefined);
	});

	it('reconnects after the delivered item cursor and permits progress-boundary equality', async () => {
		let calls = 0;
		const { client, requests } = mockClient(() => subscription('events', [event(2, calls++)]));
		const stream = client.streamEvents({
			start: { checkpoint: '2' },
			retry: { initialDelay: 0, jitter: 0, maxAttempts: 1 },
		});
		const first = (await stream.next()).value!;
		const second = (await stream.next()).value!;
		expect(second.event.eventIndex).toBe(1);
		expect(first.resumeToken).not.toBe(second.resumeToken);
		await stream.return(undefined);
		expect(
			requests.filter((request) => request.query.includes('subscription subscribeEvents'))[1]
				.variables.after,
		).toBe(cursor('events', 2));
	});

	it('waits for a future exclusive end even when no events match', async () => {
		let tip = 1;
		let scans = 0;
		const { client } = mockClient(
			() => {
				if (++scans === 1) tip = 3;
				return Response.json({ data: { events: connection([]) } });
			},
			() => tip,
		);
		const items = await collect(
			client.streamEvents({
				start: { checkpoint: '1' },
				end: { checkpoint: '4' },
				pollInterval: 1,
				include: { completion: true },
			}),
		);
		expect(scans).toBe(2);
		expect(items).toMatchObject([{ $kind: 'Complete', completion: { reason: 'checkpointBound' } }]);
	});

	it('advances through empty scan-limited pages, preserving opposite cursor bound', async () => {
		const seed = mockClient(() => subscription('events', [event(1), event(5)]));
		const seedStream = seed.client.streamEvents({ start: { checkpoint: '1' } });
		const older = (await seedStream.next()).value!;
		const newer = (await seedStream.next()).value!;
		await seedStream.return(undefined);
		let calls = 0;
		const frontier = cursor('events', 3, 3, 0, true);
		const { client, requests } = mockClient(() =>
			Response.json({
				data: { events: ++calls === 1 ? connection([], true, frontier) : connection([event(3)]) },
			}),
		);
		const items = await collect(
			client.streamEvents({
				start: { resumeToken: older.resumeToken },
				end: { resumeToken: newer.resumeToken },
			}),
		);
		expect(items).toHaveLength(1);
		const scans = requests.filter((request) => request.query.includes('query scanEvents'));
		expect(scans[1].variables).toMatchObject({ after: frontier, before: cursor('events', 5) });
	});

	it('completes at an excluded cursor frontier even when GraphQL reports another page', async () => {
		const seed = mockClient(() => subscription('events', [event(1, 0), event(1, 2)]));
		const source = seed.client.streamEvents({ start: { checkpoint: '1' } });
		const older = (await source.next()).value!;
		const newer = (await source.next()).value!;
		await source.return(undefined);
		const frontier = cursor('events', 1, 1, 2, true);
		const { client, requests } = mockClient(() =>
			Response.json({ data: { events: connection([event(1, 1)], true, frontier) } }),
		);
		const items = await collect(
			client.streamEvents({
				start: { resumeToken: older.resumeToken },
				end: { resumeToken: newer.resumeToken },
				include: { completion: true },
			}),
		);
		expect(items).toHaveLength(2);
		expect(items[0]).toMatchObject({ event: { eventIndex: 1 } });
		expect(items[1]).toMatchObject({
			$kind: 'Complete',
			completion: { resumeToken: items[0].$kind === 'Event' ? items[0].resumeToken : '' },
		});
		expect(requests.filter((request) => request.query.includes('query scanEvents'))).toHaveLength(
			1,
		);
	});

	it('waits for a future descending start before emitting the requested interval', async () => {
		let states = 0;
		const { client, requests } = mockClient(
			() => Response.json({ data: { checkpoints: connection([checkpoint(5)]) } }),
			() => (++states < 3 ? 2 : 5),
		);
		const frames = await collect(
			client.streamCheckpoints({
				order: 'descending',
				start: { checkpoint: '5' },
				end: { checkpoint: '4' },
				pollInterval: 1,
			}),
		);
		expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(['5']);
		expect(
			requests.filter((request) => request.query.includes('query scanCheckpoints')),
		).toHaveLength(1);
		expect(states).toBe(3);
	});

	it('polls from an empty terminal scan frontier without skipping its first item', async () => {
		let calls = 0;
		const frontier = cursor('events', 3, 3, 0, true);
		const { client, requests } = mockClient(() =>
			Response.json({
				data: { events: ++calls === 1 ? connection([], false, frontier) : connection([event(3)]) },
			}),
		);
		const stream = client.streamEvents({
			start: { checkpoint: '1' },
			delivery: 'poll',
			pollInterval: 1,
		});
		expect((await stream.next()).value?.event.checkpoint).toBe('3');
		await stream.return(undefined);
		expect(
			requests.filter((request) => request.query.includes('query scanEvents'))[1].variables.after,
		).toBe(frontier);
	});

	it('rejects non-advancing pagination and out-of-range checkpoints', async () => {
		const { client } = mockClient(() => Response.json({ data: { events: connection([], true) } }));
		await expect(
			collect(client.streamEvents({ start: { checkpoint: '1' }, end: { checkpoint: '2' } })),
		).rejects.toThrow('did not advance');
		await expect(
			client.streamEvents({ start: { checkpoint: '9007199254740992' } }).next(),
		).rejects.toThrow('UInt53');
	});

	it('preserves the existing programmable-transaction restriction for include.transaction', async () => {
		const { client } = mockClient(() =>
			Response.json({
				data: {
					transactions: connection([
						{
							cursor: cursor('transactions', 0),
							node: {
								digest: 'genesis',
								signatures: [],
								transactionJson: { kind: { genesis: {} } },
								effects: { status: 'SUCCESS', checkpoint: null },
							},
						},
					]),
				},
			}),
		);
		await expect(
			collect(
				client.streamTransactions({
					start: { checkpoint: '0' },
					end: { checkpoint: '1' },
					include: { transaction: true },
				}),
			),
		).rejects.toThrow('Only programmable transactions are supported');
	});

	it('loads every nested event and object-change page before delivering a transaction token', async () => {
		const emitted = event(1).node;
		let details = 0;
		const { client } = mockClient(({ query, variables }) => {
			if (query.includes('query streamTransactionDetails')) {
				details++;
				expect(variables).toMatchObject({ eventsAfter: 'event-page', objectsAfter: 'object-page' });
				return Response.json({
					data: {
						transaction: {
							effects: {
								events: { pageInfo: { hasNextPage: false }, nodes: [emitted] },
								objectChanges: {
									pageInfo: { hasNextPage: false },
									nodes: [
										{
											address: '0x3',
											outputState: {
												asMoveObject: { contents: { type: { repr: '0x2::test::Object' } } },
											},
										},
									],
								},
							},
						},
					},
				});
			}
			return Response.json({
				data: {
					transactions: connection([
						{
							cursor: cursor('transactions', 1),
							node: {
								digest: 'tx1',
								signatures: [],
								effects: {
									status: 'SUCCESS',
									checkpoint: { sequenceNumber: 1 },
									events: {
										pageInfo: { hasNextPage: true, endCursor: 'event-page' },
										nodes: [emitted],
									},
									objectChanges: {
										pageInfo: { hasNextPage: true, endCursor: 'object-page' },
										nodes: [],
									},
								},
							},
						},
					]),
				},
			});
		});
		const items = await collect(
			client.streamTransactions({
				start: { checkpoint: '1' },
				end: { checkpoint: '2' },
				include: { events: true, objectTypes: true },
			}),
		);
		expect(details).toBe(1);
		expect(items[0].transaction.Transaction?.events).toHaveLength(2);
		expect(items[0].transaction.Transaction?.objectTypes).toEqual({ '0x3': '0x2::test::Object' });
	});
});

describe('ledger cursor coordinates', () => {
	it('decodes all scopes, boundaries and legacy event positions', () => {
		expect(decodeLedgerCursor(cursor('checkpoints', 0))).toMatchObject({
			family: 'checkpoints',
			checkpoint: '0',
			kind: 'item',
		});
		expect(decodeLedgerCursor(cursor('transactions', 4, 12, 0, true))).toMatchObject({
			transactionIndex: '12',
			coveredCheckpoint: '3',
			kind: 'boundary',
		});
		const legacy = new BinaryWriter()
			.tag(1, WireType.Varint)
			.uint32(3)
			.tag(2, WireType.Varint)
			.uint32(1)
			.tag(3, WireType.Varint)
			.uint64(4)
			.tag(4, WireType.Varint)
			.uint64((12n << 16n) | 2n)
			.finish();
		expect(decodeLedgerCursor(legacy)).toMatchObject({
			family: 'events',
			checkpoint: '4',
			transactionIndex: '12',
			eventIndex: 2,
		});
	});
	it('compares ledger positions, not encoded cursor strings, and rejects scope confusion', () => {
		expect(compareLedgerCursors(cursor('events', 1, 5, 2), cursor('events', 1, 5, 10))).toBe(-1);
		expect(compareLedgerCursors(cursor('events', 1, 5, 2, true), cursor('events', 1, 5, 2))).toBe(
			0,
		);
		expect(() => decodeLedgerCursor(cursor('checkpoints', 1), 'events')).toThrow();
		expect(() => decodeLedgerCursor(new Uint8Array())).toThrow();
	});
});
