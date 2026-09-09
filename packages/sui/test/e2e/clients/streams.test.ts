// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { SuiClientTypes } from '../../../src/client/types.js';
import { Transaction } from '../../../src/transactions/index.js';
import { setup, type TestToolbox } from '../utils/setup.js';

interface LedgerClient {
	streamCheckpoints<Include extends SuiClientTypes.StreamInclude = {}>(
		options?: SuiClientTypes.StreamCheckpointsOptions<Include>,
	): AsyncIterableIterator<SuiClientTypes.StreamCheckpointResult<Include>>;
	streamTransactions<Include extends SuiClientTypes.StreamTransactionInclude = {}>(
		options?: SuiClientTypes.StreamTransactionsOptions<Include>,
	): AsyncIterableIterator<SuiClientTypes.StreamTransactionResult<Include>>;
	streamEvents<Include extends SuiClientTypes.StreamInclude = {}>(
		options?: SuiClientTypes.StreamEventsOptions<Include>,
	): AsyncIterableIterator<SuiClientTypes.StreamEventResult<Include>>;
}

async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
	const frames: T[] = [];
	for await (const frame of stream) frames.push(frame);
	return frames;
}

async function take<T>(stream: AsyncIterable<T>, count: number): Promise<T[]> {
	const frames: T[] = [];
	for await (const frame of stream) {
		frames.push(frame);
		if (frames.length === count) break;
	}
	expect(frames).toHaveLength(count);
	return frames;
}

const includes = {
	transaction: true,
	effects: true,
	events: true,
	balanceChanges: true,
	objectTypes: true,
	bcs: true,
} as const;

describe('resumable ledger streams', () => {
	let toolbox: TestToolbox;
	let signer: Awaited<ReturnType<TestToolbox['getSigner']>>;
	let packageId: string;
	let digests: string[];
	let firstCheckpoint: string;
	let lastCheckpoint: string;
	const controllers: AbortController[] = [];

	function signal() {
		const controller = new AbortController();
		controllers.push(controller);
		return AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
	}

	function clients(): [string, LedgerClient][] {
		return [
			['gRPC', toolbox.grpcClient],
			['GraphQL', toolbox.graphqlClient],
		];
	}

	function range(order: SuiClientTypes.StreamOrder = 'ascending') {
		return {
			order,
			start: { checkpoint: order === 'ascending' ? firstCheckpoint : lastCheckpoint },
			end: {
				checkpoint:
					order === 'ascending'
						? (BigInt(lastCheckpoint) + 1n).toString()
						: (BigInt(firstCheckpoint) - 1n).toString(),
			},
			signal: signal(),
		};
	}

	async function emitEvents(count: number, value = 0) {
		const transaction = new Transaction();
		for (let i = 0; i < count; i++) {
			transaction.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [transaction.pure.u64(value + i)],
			});
		}
		const result = await toolbox.signAndExecuteTransaction({
			transaction,
			signer: signer.keypair,
		});
		if (result.$kind !== 'Transaction') {
			throw new Error(
				`Event transaction failed: ${result.FailedTransaction.status.error?.message}`,
			);
		}
		return result.Transaction.digest;
	}

	beforeAll(async () => {
		toolbox = await setup();
		// A fresh sender isolates the fixture while reusing the harness's published package.
		packageId = toolbox.getPackage('test_data');
		signer = await toolbox.getSigner({ coins: [1_000_000_000n] });
		digests = [];
		for (let i = 0; i < 3; i++) digests.push(await emitEvents(3, i * 3));
		const transactions = await Promise.all(
			[digests[0], digests[2]].map((digest) => toolbox.grpcClient.core.getTransaction({ digest })),
		);
		firstCheckpoint = transactions[0].Transaction!.checkpoint!;
		lastCheckpoint = transactions[1].Transaction!.checkpoint!;
		expect(BigInt(firstCheckpoint)).toBeGreaterThan(0n);
	});

	afterEach(() => {
		for (const controller of controllers.splice(0)) controller.abort();
	});

	it('returns identical checkpoint headers in both traversal directions', async () => {
		const ascending = await Promise.all(
			clients().map(async ([, client]) =>
				(await collect(client.streamCheckpoints(range()))).map((frame) => frame.checkpoint),
			),
		);
		expect(ascending[0]).toEqual(ascending[1]);
		expect(ascending[0][0].sequenceNumber).toBe(firstCheckpoint);
		expect(ascending[0].at(-1)?.sequenceNumber).toBe(lastCheckpoint);

		for (const [name, client] of clients()) {
			const descending = await collect(client.streamCheckpoints(range('descending')));
			expect(
				descending.map((frame) => frame.checkpoint),
				name,
			).toEqual([...ascending[0]].reverse());
		}
	});

	it('returns identical transactions with every shared include in both directions', async () => {
		const ascending = await Promise.all(
			clients().map(async ([, client]) =>
				(
					await collect(
						client.streamTransactions({
							...range(),
							filter: { sender: signer.address },
							include: includes,
						}),
					)
				).map((frame) => frame.transaction),
			),
		);
		expect(ascending[0]).toEqual(ascending[1]);
		expect(ascending[0].map((transaction) => transaction.Transaction?.digest)).toEqual(digests);
		for (const transaction of ascending[0]) expect(transaction.Transaction?.events).toHaveLength(3);

		for (const [name, client] of clients()) {
			const descending = await collect(
				client.streamTransactions({
					...range('descending'),
					filter: { sender: signer.address },
					include: includes,
				}),
			);
			expect(
				descending.map((frame) => frame.transaction),
				name,
			).toEqual([...ascending[0]].reverse());
		}
	});

	it('returns identical events and preserves event order within each transaction', async () => {
		const ascending = await Promise.all(
			clients().map(async ([, client]) =>
				(
					await collect(client.streamEvents({ ...range(), filter: { sender: signer.address } }))
				).map((frame) => frame.event),
			),
		);
		expect(ascending[0]).toEqual(ascending[1]);
		expect(ascending[0].map((event) => event.transactionDigest)).toEqual(
			digests.flatMap((digest) => [digest, digest, digest]),
		);
		expect(ascending[0].map((event) => event.eventIndex)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);

		for (const [name, client] of clients()) {
			const descending = await collect(
				client.streamEvents({ ...range('descending'), filter: { sender: signer.address } }),
			);
			expect(
				descending.map((frame) => frame.event),
				name,
			).toEqual([...ascending[0]].reverse());
		}
	});

	for (const kind of ['gRPC', 'GraphQL']) {
		describe(kind, () => {
			function client() {
				return clients().find(([name]) => name === kind)![1];
			}

			it('resumes a finite descending job without repeating its last delivered event', async () => {
				const stream = client().streamEvents({
					...range('descending'),
					filter: { sender: signer.address },
				});
				const first = await take(stream, 1);
				const remainder = await collect(
					client().streamEvents({
						start: { resumeToken: first[0].resumeToken },
						filter: { sender: signer.address },
						signal: signal(),
					}),
				);
				expect(remainder).toHaveLength(8);
				expect(remainder[0].event.transactionDigest).toBe(digests[2]);
				expect(remainder[0].event.eventIndex).toBe(1);
				expect(remainder.at(-1)?.event.transactionDigest).toBe(digests[0]);
			});

			it('uses exclusive cursor bounds inside one transaction and reports cursor completion', async () => {
				// Following tokens can also serve as explicit interval anchors. Finite tokens
				// retain their original captured end when used as a continuation.
				const anchors = await take(
					client().streamEvents({
						start: { checkpoint: firstCheckpoint },
						filter: { sender: signer.address },
						delivery: 'poll',
						signal: signal(),
					}),
					3,
				);
				const frames = await collect(
					client().streamEvents({
						start: { resumeToken: anchors[0].resumeToken },
						end: { resumeToken: anchors[2].resumeToken },
						filter: { sender: signer.address },
						include: { completion: true },
						signal: signal(),
					}),
				);
				expect(frames).toHaveLength(2);
				expect(frames[0]).toMatchObject({
					$kind: 'Event',
					event: { transactionDigest: digests[0], eventIndex: 1 },
				});
				expect(frames[1]).toMatchObject({
					$kind: 'Complete',
					completion: { reason: 'cursorBound' },
				});
				if (frames[1].$kind === 'Complete')
					expect(frames[1].completion.resumeToken).toBe(
						frames[0].$kind === 'Event' ? frames[0].resumeToken : undefined,
					);
			});

			it('completes empty filtered ranges without manufacturing an event', async () => {
				const frames = await collect(
					client().streamEvents({
						...range(),
						filter: { sender: '0x0' },
						include: { completion: true },
					}),
				);
				expect(frames).toHaveLength(1);
				expect(frames[0]).toMatchObject({
					$kind: 'Complete',
					completion: { reason: 'checkpointBound' },
				});
			});

			it('catches up through history and continues with a newly submitted event', async () => {
				const stream = client().streamEvents({
					start: { checkpoint: firstCheckpoint },
					filter: { sender: signer.address },
					signal: signal(),
				});
				try {
					// Earlier tests may have submitted additional transactions, so anchor on
					// this test's unique value while still checking the original replay order.
					for (let i = 0; i < 9; i++) {
						const next = await stream.next();
						expect(next.done).toBe(false);
						if (!next.done)
							expect(next.value.event.transactionDigest).toBe(digests[Math.floor(i / 3)]);
					}
					const nextItem = stream.next();
					// Attach rejection handling before transaction execution so cancellation
					// remains observable even if submission fails.
					const pending = nextItem.then(
						(value) => ({ value }),
						(error: unknown) => ({ error }),
					);
					const liveDigest = await emitEvents(1, kind === 'gRPC' ? 100 : 200);
					let next = await pending;
					if ('error' in next) throw next.error;
					while (!next.value.done && next.value.value.event.transactionDigest !== liveDigest) {
						next = { value: await stream.next() };
					}
					expect(next.value.done).toBe(false);
					if (!next.value.done) expect(next.value.value.event.transactionDigest).toBe(liveDigest);
				} finally {
					await stream.return?.(undefined);
				}
			});

			it('cancels a quiet filter while its next item is pending', async () => {
				const controller = new AbortController();
				const stream = client().streamEvents({
					filter: { sender: '0x0' },
					signal: controller.signal,
				});
				const pending = stream.next();
				const rejection = expect(pending).rejects.toThrow('stream cancelled');
				controller.abort(new Error('stream cancelled'));
				await rejection;
				await stream.return?.(undefined);
			});
		});
	}

	it('exposes native GraphQL edge cursors and resumes the operation with after', async () => {
		type Result = {
			events: { cursor: string; node: { sequenceNumber: number; transaction: { digest: string } } };
		};
		const query = `subscription NativeEvents($after: String, $filter: EventFilter) {
			events(after: $after, filter: $filter) { cursor node { sequenceNumber transaction { digest } } }
		}`;
		const firstStream = toolbox.graphqlClient.subscribe<Result>({
			query,
			variables: {
				filter: { sender: signer.address, afterCheckpoint: Number(firstCheckpoint) - 1 },
			},
			signal: signal(),
		});
		const [first] = await take(firstStream, 1);
		expect(first.errors).toBeUndefined();
		expect(first.data?.events.node).toEqual({
			sequenceNumber: 0,
			transaction: { digest: digests[0] },
		});
		expect(first.data?.events.cursor).toBeTypeOf('string');
		const resumed = toolbox.graphqlClient.subscribe<Result>({
			query,
			variables: { after: first.data!.events.cursor, filter: { sender: signer.address } },
			signal: signal(),
		});
		const [second] = await take(resumed, 1);
		expect(second.errors).toBeUndefined();
		expect(second.data?.events.node).toEqual({
			sequenceNumber: 1,
			transaction: { digest: digests[0] },
		});
	});

	it('cancels native GraphQL while waiting for a matching event', async () => {
		const controller = new AbortController();
		const stream = toolbox.graphqlClient.subscribe({
			query: 'subscription { events(filter: { sender: "0x0" }) { cursor } }',
			variables: {},
			signal: controller.signal,
		});
		const pending = stream.next();
		const rejection = expect(pending).rejects.toThrow('native cancelled');
		controller.abort(new Error('native cancelled'));
		await rejection;
		await stream.return(undefined);
	});
});
