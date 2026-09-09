// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { bcs } from '../../../src/bcs/index.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';

function cursor(
	family: 'checkpoints' | 'transactions' | 'events',
	cp: number,
	tx = cp,
	event = 0,
	boundary = false,
) {
	return `opaque/${family}/${cp}/${tx}/${event}/${boundary ? 'frontier' : 'item'}`;
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
	first: () => number = () => 0,
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
						availableRange: { first: { sequenceNumber: first() }, last: { sequenceNumber: tip() } },
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
	it.each(['mapping', 'json'])(
		'does not retry malformed successful responses (%s)',
		async (failure) => {
			const { client, requests } = mockClient(() =>
				failure === 'mapping'
					? Response.json({ data: { checkpoints: { edges: [], pageInfo: null } } })
					: new Response('{', { headers: { 'content-type': 'application/json' } }),
			);
			await expect(
				collect(
					client.streamCheckpoints({
						start: { checkpoint: '1' },
						end: { checkpoint: '2' },
						retry: { initialDelay: 0, jitter: 0, maxAttempts: 2 },
					}),
				),
			).rejects.toBeInstanceOf(failure === 'mapping' ? TypeError : SyntaxError);
			expect(
				requests.filter((request) => request.query.includes('query scanCheckpoints')),
			).toHaveLength(1);
		},
	);

	it.each(['fetch', 'body'])(
		'retries network failures at the query %s boundary',
		async (failure) => {
			let calls = 0;
			const { client, requests } = mockClient(() => {
				if (++calls === 1) {
					if (failure === 'fetch') throw new TypeError('fetch failed');
					return new Response(
						new ReadableStream({
							start(controller) {
								controller.error(new TypeError('socket closed'));
							},
						}),
					);
				}
				return Response.json({ data: { checkpoints: connection([checkpoint(1)]) } });
			});
			expect(
				await collect(
					client.streamCheckpoints({
						start: { checkpoint: '1' },
						end: { checkpoint: '2' },
						retry: { initialDelay: 0, jitter: 0, maxAttempts: 1 },
					}),
				),
			).toHaveLength(1);
			expect(
				requests.filter((request) => request.query.includes('query scanCheckpoints')),
			).toHaveLength(2);
		},
	);

	it('retries subscription body failures from the same anchored start', async () => {
		let calls = 0;
		const { client, requests } = mockClient(() => {
			if (++calls === 1)
				return new Response(
					new ReadableStream({
						start(controller) {
							controller.error(new TypeError('socket closed'));
						},
					}),
					{ headers: { 'content-type': 'text/event-stream' } },
				);
			return subscription('events', [event(2)]);
		});
		const stream = client.streamEvents({
			start: { checkpoint: '2' },
			retry: { initialDelay: 0, jitter: 0, maxAttempts: 1 },
		});
		expect((await stream.next()).value?.event.checkpoint).toBe('2');
		await stream.return(undefined);
		expect(
			requests
				.filter((request) => request.query.includes('subscription subscribeEvents'))
				.map((request) => request.variables.filter.afterCheckpoint),
		).toEqual([1, 1]);
	});

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

	it('reads descending cursor intervals entirely within retained history', async () => {
		let first = 0;
		const { client } = mockClient(
			() => Response.json({ data: { checkpoints: connection([checkpoint(10)]) } }),
			() => 20,
			() => first,
		);
		const anchorStream = client.streamCheckpoints({ start: { checkpoint: '10' }, follow: false });
		const anchor = (await anchorStream.next()).value!;
		await anchorStream.return?.(undefined);
		// The anchor itself may be pruned: it is an excluded checkpoint item.
		first = 11;
		const retained = mockClient(
			() => Response.json({ data: { checkpoints: connection([checkpoint(11), checkpoint(12)]) } }),
			() => 20,
			() => first,
		);
		const frames = await collect(
			retained.client.streamCheckpoints({
				order: 'descending',
				start: { checkpoint: '12' },
				end: { resumeToken: anchor.resumeToken },
			}),
		);
		expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(['12', '11']);
		expect(retained.requests.at(-1)?.variables.filter.afterCheckpoint).toBe(10);
	});

	it('resumes after an excluded checkpoint anchor that has since been pruned', async () => {
		const source = mockClient(() => subscription('checkpoints', [checkpoint(10)]));
		const stream = source.client.streamCheckpoints({ start: { checkpoint: '10' } });
		const anchor = (await stream.next()).value!;
		await stream.return?.(undefined);
		const retained = mockClient(
			() => Response.json({ data: { checkpoints: connection([checkpoint(11)]) } }),
			() => 20,
			() => 11,
		);
		const frames = await collect(
			retained.client.streamCheckpoints({
				start: { resumeToken: anchor.resumeToken },
				end: { checkpoint: '12' },
			}),
		);
		expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(['11']);
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

	it('looks up the public checkpoint when subscription backfill nodes omit it', async () => {
		const node = {
			digest: 'tx1',
			signatures: [],
			effects: { status: 'SUCCESS', checkpoint: null },
		};
		const { client } = mockClient((request) =>
			request.query.includes('query streamTransactionCheckpoint')
				? Response.json({
						data: { transaction: { effects: { checkpoint: { sequenceNumber: 1 } } } },
					})
				: subscription('transactions', [{ cursor: cursor('transactions', 1), node }]),
		);
		const stream = client.streamTransactions({ start: { checkpoint: '1' } });
		expect((await stream.next()).value?.transaction.Transaction?.checkpoint).toBe('1');
		await stream.return(undefined);
	});

	it('retries missing checkpoint metadata without advancing the subscription cursor', async () => {
		const node = {
			digest: 'tx1',
			signatures: [],
			effects: { status: 'SUCCESS', checkpoint: null },
		};
		let lookups = 0;
		const { client, requests } = mockClient((request) =>
			request.query.includes('query streamTransactionCheckpoint')
				? Response.json({
						data: {
							transaction:
								lookups++ === 0 ? null : { effects: { checkpoint: { sequenceNumber: 1 } } },
						},
					})
				: subscription('transactions', [{ cursor: 'a-new-opaque-format', node }]),
		);
		const stream = client.streamTransactions({
			start: { checkpoint: '1' },
			retry: { initialDelay: 0, jitter: 0, maxAttempts: 1 },
		});
		expect((await stream.next()).value?.transaction.Transaction?.checkpoint).toBe('1');
		await stream.return(undefined);
		const subscriptions = requests.filter((request) =>
			request.query.includes('subscription subscribeTransactions'),
		);
		expect(subscriptions).toHaveLength(2);
		expect(subscriptions.map((request) => request.variables.after)).toEqual([undefined, undefined]);
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

	it('follows a distinct frontier until the server confirms the excluded interval is complete', async () => {
		const seed = mockClient(() => subscription('events', [event(1, 0), event(1, 2)]));
		const source = seed.client.streamEvents({ start: { checkpoint: '1' } });
		const older = (await source.next()).value!;
		const newer = (await source.next()).value!;
		await source.return(undefined);
		const frontier = 'future-cursor-format:terminal-boundary';
		let page = 0;
		const { client, requests } = mockClient(() =>
			Response.json({
				data: { events: page++ === 0 ? connection([event(1, 1)], true, frontier) : connection([]) },
			}),
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
			2,
		);
	});

	it.each(['ascending', 'descending'] as const)(
		'probes an excluded item identity at a stalled %s frontier',
		async (order) => {
			const descending = order === 'descending';
			const seed = mockClient(() =>
				Response.json({ data: { events: connection([event(1, 0), event(1, 2)]) } }),
			);
			const source = seed.client.streamEvents({ start: { checkpoint: '1' }, order, follow: false });
			await source.next();
			const second = (await source.next()).value!;
			await source.return(undefined);
			const endpoint = descending ? event(1, 0) : event(1, 2);
			const frontier = 'opaque-unrecognized-boundary';
			let page = 0;
			const { client, requests } = mockClient(() =>
				Response.json({
					data: {
						events:
							page++ === 0
								? connection([event(1, 1)], true, frontier)
								: page === 2
									? connection([], true, frontier)
									: connection([endpoint]),
					},
				}),
			);
			const items = await collect(
				client.streamEvents({
					start: { checkpoint: '1' },
					end: { resumeToken: second.resumeToken },
					order,
					include: { completion: true },
				}),
			);
			expect(items).toHaveLength(2);
			expect(items[0]).toMatchObject({ event: { eventIndex: 1 } });
			expect(items[1].$kind).toBe('Complete');
			const probes = requests.filter((request) => request.query.includes('query scanEvents'));
			expect(probes).toHaveLength(3);
			expect(probes[2].variables[descending ? 'before' : 'after']).toBe(event(1, 1).cursor);
			expect(probes[2].variables[descending ? 'after' : 'before']).toBeUndefined();
		},
	);

	it('does not complete when the probe returns a different transaction with the same event index', async () => {
		const seed = mockClient(() => subscription('events', [event(1, 2)]));
		const source = seed.client.streamEvents({ start: { checkpoint: '1' } });
		const endpoint = (await source.next()).value!;
		await source.return(undefined);
		let calls = 0;
		const { client } = mockClient(() =>
			Response.json({
				data: {
					events:
						++calls < 3
							? connection([], true, 'opaque-stalled-frontier')
							: connection([event(2, 2)]),
				},
			}),
		);
		await expect(
			collect(
				client.streamEvents({
					start: { checkpoint: '1' },
					end: { resumeToken: endpoint.resumeToken },
				}),
			),
		).rejects.toThrow('pagination did not advance');
	});

	it('waits for the saved indexed horizon before resuming an opaque polling frontier', async () => {
		let states = 0;
		let scans = 0;
		const { client } = mockClient(
			() =>
				Response.json({
					data: {
						events:
							++scans === 1 ? connection([], false, 'opaque-progress') : connection([event(10)]),
					},
				}),
			() => (++states === 3 ? 2 : 10),
		);
		const stream = client.streamEvents({
			start: { checkpoint: '1' },
			delivery: 'poll',
			pollInterval: 1,
		});
		expect((await stream.next()).value?.event.checkpoint).toBe('10');
		await stream.return(undefined);
		expect(states).toBe(4);
		expect(scans).toBe(2);
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

	it('returns genesis data when transaction details are requested', async () => {
		const { client } = mockClient(() =>
			Response.json({
				data: {
					transactions: connection([
						{
							cursor: cursor('transactions', 0),
							node: {
								digest: 'genesis',
								signatures: [],
								transactionBcs: bcs.TransactionData.serialize({
									V1: {
										sender: '0x0',
										gasData: { owner: '0x0', payment: [], price: 1, budget: 0 },
										expiration: { None: true },
										kind: { Genesis: { objects: [] } },
									},
								}).toBase64(),
								effects: { status: 'SUCCESS', checkpoint: { sequenceNumber: 0 } },
							},
						},
					]),
				},
			}),
		);
		const items = await collect(
			client.streamTransactions({
				start: { checkpoint: '0' },
				end: { checkpoint: '1' },
				include: { transaction: true },
			}),
		);
		expect(items[0].transaction.Transaction?.transaction.kind).toEqual({
			$kind: 'Genesis',
			Genesis: { objects: [] },
		});
		expect(items[0].transaction.Transaction?.bcs).toBeUndefined();
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
