// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, describe, expect, inject, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import type { ClientWithCoreApi } from '../../../src/client/core.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { SuiGrpcClient } from '../../../src/grpc/index.js';
import type { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import { Transaction } from '../../../src/transactions/index.js';
import { setup, type ClientKind, type TestToolbox } from '../utils/setup.js';

type Delivery = 'subscribe' | 'poll';
type Status = SuiClientTypes.StreamStatus;
type Signer = { keypair: Ed25519Keypair; address: string };

const LIVE: [ClientKind, Delivery][] = [
	['grpc', 'subscribe'],
	['grpc', 'poll'],
	['graphql', 'subscribe'],
	['graphql', 'poll'],
];
const KINDS: ClientKind[] = ['grpc', 'graphql'];
const NAMES: Record<ClientKind, string> = { grpc: 'gRPC', graphql: 'GraphQL' };

const MANY_EVENTS = 60;

const ALL_INCLUDES = {
	transaction: true,
	effects: true,
	events: true,
	balanceChanges: true,
	objectTypes: true,
	bcs: true,
} as const;

/** Thrown into injected stream resets, so retries can be traced back to them. */
const RESET_MESSAGE = 'injected stream reset';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate: () => boolean, timeout = 30_000) {
	const deadline = Date.now() + timeout;
	while (!predicate()) {
		if (Date.now() > deadline) throw new Error('Timed out waiting for a condition');
		await sleep(100);
	}
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

/** Pages a list method from the start to the end. */
async function listAll<T>(
	page: (after: string | null) => Promise<{
		items: T[];
		hasNextPage: boolean;
		endCursor: string | null;
	}>,
): Promise<T[]> {
	const items: T[] = [];
	let after: string | null = null;
	while (true) {
		const result = await page(after);
		items.push(...result.items);
		if (!result.hasNextPage) return items;
		// A missing or repeated cursor would truncate the list or page forever.
		expect(result.endCursor).not.toBeNull();
		expect(result.endCursor).not.toBe(after);
		after = result.endCursor;
	}
}

/** Records statuses. */
function statusLog() {
	const log: Status[] = [];
	return {
		statuses: () => log,
		kinds: () => log.map((status) => status.$kind),
		onStatus: (status: Status) => log.push(status),
	};
}

/** Splits a status log into attempts, each starting with its `Connecting` status. */
function attempts(statuses: Status[]): Status[][] {
	const result: Status[][] = [];
	for (const status of statuses) {
		if (status.$kind === 'Connecting' || result.length === 0) result.push([]);
		result.at(-1)!.push(status);
	}
	return result;
}

/** Whether `error` (or one of its causes) came from an injected reset. */
function causedByReset(error: unknown): boolean {
	for (let e = error; e; e = (e as { cause?: unknown }).cause) {
		if (String((e as Error).message ?? e).includes(RESET_MESSAGE)) return true;
		if (typeof e !== 'object') break;
	}
	return false;
}

/** Readers still running; `afterEach` stops them even when a test fails before `close()`. */
const openReaders = new Set<{ close(): Promise<void> }>();

/** Reads a stream in the background while the test submits transactions. */
class Reader<F> {
	readonly frames: F[] = [];
	readonly #controller: AbortController;
	readonly #task: Promise<void>;
	#error: unknown;
	#done = false;
	#wake: (() => void) | undefined;

	constructor(open: (signal: AbortSignal) => AsyncIterable<F>, options: { delay?: number } = {}) {
		const controller = new AbortController();
		this.#controller = controller;
		openReaders.add(this);
		const stream = open(controller.signal);
		this.#task = (async () => {
			try {
				for await (const frame of stream) {
					this.frames.push(frame);
					this.#wake?.();
					if (options.delay) await sleep(options.delay);
				}
			} catch (error) {
				if (!controller.signal.aborted) this.#error = error;
			} finally {
				this.#done = true;
				this.#wake?.();
			}
		})();
	}

	/** Waits until `predicate` holds for the frames read so far. */
	async until(predicate: (frames: F[]) => boolean, timeout = 60_000) {
		const deadline = Date.now() + timeout;
		while (!predicate(this.frames)) {
			if (this.#error) throw this.#error;
			if (this.#done) throw new Error(`Stream ended after ${this.frames.length} frames`);
			if (Date.now() > deadline) throw new Error(`Timed out after ${this.frames.length} frames`);
			await Promise.race([new Promise<void>((resolve) => (this.#wake = resolve)), sleep(250)]);
		}
	}

	/** Reads for `ms` more to catch late duplicates, then stops the stream. */
	async settle(ms: number) {
		await sleep(ms);
		await this.close();
	}

	async close() {
		openReaders.delete(this);
		this.#controller.abort(new Error('test finished'));
		await this.#task;
		if (this.#error) throw this.#error;
	}
}

/** A fetch that resets matching response bodies after `after` ms, as a server or proxy may. */
function resettingFetch(match: (url: string) => boolean, after: number) {
	const resets = { count: 0 };
	const wrapped: typeof fetch = async (input, init) => {
		const response = await fetch(input, init);
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (!match(url) || !response.body) return response;
		const reader = response.body.getReader();
		let timer: ReturnType<typeof setTimeout> | undefined;
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				timer = setTimeout(() => {
					resets.count++;
					controller.error(new TypeError(RESET_MESSAGE));
					reader.cancel().catch(() => {});
				}, after);
			},
			async pull(controller) {
				try {
					const { done, value } = await reader.read();
					if (done) {
						clearTimeout(timer);
						controller.close();
					} else {
						controller.enqueue(value);
					}
				} catch (error) {
					clearTimeout(timer);
					try {
						controller.error(error);
					} catch {}
				}
			},
			cancel(reason) {
				clearTimeout(timer);
				return reader.cancel(reason);
			},
		});
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	};
	return { fetch: wrapped, resets };
}

const isSubscriptionUrl = (url: string) =>
	url.includes('/sui.rpc.v2.SubscriptionService/') || url.includes('/graphql/subscriptions');

describe('ledger streams', () => {
	let toolbox: TestToolbox;
	let packageId: string;
	/** Sends `digests`: three transactions with three events each. */
	let signer: Signer;
	/** Sends `manyEventsDigest`, one transaction with more than 50 events. */
	let manySigner: Signer;
	let digests: string[];
	let manyEventsDigest: string;
	let firstCheckpoint: string;
	let lastCheckpoint: string;
	const controllers: AbortController[] = [];
	let nextValue = 1_000;

	function signal(timeout = 60_000) {
		const controller = new AbortController();
		controllers.push(controller);
		return AbortSignal.any([controller.signal, AbortSignal.timeout(timeout)]);
	}

	function client(kind: ClientKind): ClientWithCoreApi {
		return kind === 'grpc' ? toolbox.grpcClient : toolbox.graphqlClient;
	}

	/** A client of `kind` whose subscription responses reset every `after` ms. */
	function resettingClient(kind: ClientKind, after: number) {
		const { fetch, resets } = resettingFetch(isSubscriptionUrl, after);
		const client =
			kind === 'grpc'
				? new SuiGrpcClient({
						network: 'localnet',
						baseUrl: `http://127.0.0.1:${inject('localnetPort')}`,
						fetch,
					})
				: new SuiGraphQLClient({
						network: 'localnet',
						url: `http://127.0.0.1:${inject('graphqlPort')}/graphql`,
						fetch,
					});
		return { client: client as ClientWithCoreApi, resets };
	}

	function range(order: SuiClientTypes.Order = 'ascending') {
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

	function newSigner() {
		return toolbox.getSigner({ coins: [1_000_000_000n] });
	}

	/**
	 * Executes one transaction from `from` emitting `count` events and waits for its checkpoint.
	 * Unless `fast`, also waits for GraphQL to index it.
	 */
	async function emitEvents(from: Signer, count: number, options: { fast?: boolean } = {}) {
		const transaction = new Transaction();
		for (let i = 0; i < count; i++) {
			transaction.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [transaction.pure.u64(nextValue++)],
			});
		}
		const execute = { transaction, signer: from.keypair, include: { effects: true } } as const;
		const result = options.fast
			? await toolbox.grpcClient.core.signAndExecuteTransaction(execute)
			: await toolbox.signAndExecuteTransaction(execute);
		if (result.$kind !== 'Transaction') {
			throw new Error(
				`Event transaction failed: ${result.FailedTransaction.status.error?.message}`,
			);
		}
		const { digest } = result.Transaction;
		const { Transaction: executed } = await toolbox.grpcClient.core.waitForTransaction({
			digest,
		});
		return { digest, checkpoint: executed!.checkpoint! };
	}

	async function tip() {
		const {
			checkpoints: [{ sequenceNumber }],
		} = await toolbox.grpcClient.core.listCheckpoints({ order: 'descending', limit: 1 });
		return sequenceNumber;
	}

	function listEvents(kind: ClientKind, options: SuiClientTypes.ListEventsOptions) {
		return listAll(async (after) => {
			const page = await client(kind).core.listEvents({ ...options, after });
			return { ...page, items: page.events };
		});
	}

	function listTransactions<Include extends SuiClientTypes.TransactionInclude = {}>(
		kind: ClientKind,
		options: SuiClientTypes.ListTransactionsOptions<Include>,
	) {
		return listAll(async (after) => {
			const page = await client(kind).core.listTransactions({ ...options, after });
			return { ...page, items: page.transactions };
		});
	}

	function listCheckpoints(kind: ClientKind, options: SuiClientTypes.ListCheckpointsOptions) {
		return listAll(async (after) => {
			const page = await client(kind).core.listCheckpoints({ ...options, after });
			return { ...page, items: page.checkpoints };
		});
	}

	beforeAll(async () => {
		toolbox = await setup();
		packageId = toolbox.getPackage('test_data');
		[signer, manySigner] = await Promise.all([newSigner(), newSigner()]);
		digests = [];
		for (let i = 0; i < 3; i++) digests.push((await emitEvents(signer, 3)).digest);
		const many = await emitEvents(manySigner, MANY_EVENTS);
		manyEventsDigest = many.digest;
		const { Transaction: first } = await toolbox.grpcClient.core.getTransaction({
			digest: digests[0],
		});
		firstCheckpoint = first!.checkpoint!;
		lastCheckpoint = many.checkpoint;
		expect(BigInt(firstCheckpoint)).toBeGreaterThan(0n);
	});

	afterEach(async () => {
		for (const controller of controllers.splice(0)) controller.abort();
		await Promise.all([...openReaders].map((reader) => reader.close().catch(() => {})));
	});

	describe('finite reads', () => {
		it('returns the same checkpoint headers as listCheckpoints on both transports, in both directions', async () => {
			await toolbox.expectAllClientsReturnSameData(async (client) =>
				(await collect(client.core.streamCheckpoints(range()))).map((frame) => frame.checkpoint),
			);
			for (const kind of KINDS) {
				const ascending = (await collect(client(kind).core.streamCheckpoints(range()))).map(
					(frame) => frame.checkpoint,
				);
				expect(ascending[0].sequenceNumber).toBe(firstCheckpoint);
				expect(ascending.at(-1)?.sequenceNumber).toBe(lastCheckpoint);
				expect(
					await listCheckpoints(kind, {
						startCheckpoint: firstCheckpoint,
						endCheckpoint: BigInt(lastCheckpoint) + 1n,
					}),
					NAMES[kind],
				).toEqual(ascending);
				const descending = await collect(client(kind).core.streamCheckpoints(range('descending')));
				expect(
					descending.map((frame) => frame.checkpoint),
					NAMES[kind],
				).toEqual([...ascending].reverse());
			}
		});

		it('returns the same transactions with every shared include as listTransactions, in both directions', async () => {
			const options = () => ({
				...range(),
				filter: { sender: signer.address },
				include: ALL_INCLUDES,
			});
			await toolbox.expectAllClientsReturnSameData(async (client) =>
				(await collect(client.core.streamTransactions(options()))).map(
					(frame) => frame.transaction,
				),
			);
			for (const kind of KINDS) {
				const ascending = (await collect(client(kind).core.streamTransactions(options()))).map(
					(frame) => frame.transaction,
				);
				expect(ascending.map((tx) => tx.Transaction?.digest)).toEqual(digests);
				for (const tx of ascending) expect(tx.Transaction?.events).toHaveLength(3);
				expect(
					await listTransactions(kind, {
						filter: { sender: signer.address },
						include: ALL_INCLUDES,
						startCheckpoint: firstCheckpoint,
					}),
					NAMES[kind],
				).toEqual(ascending);
				const descending = await collect(
					client(kind).core.streamTransactions({ ...options(), ...range('descending') }),
				);
				expect(
					descending.map((frame) => frame.transaction),
					NAMES[kind],
				).toEqual([...ascending].reverse());
			}
		});

		it('streams every event of a transaction with more than 50 events, matching listEvents on both transports', async () => {
			const options = () => ({ ...range(), filter: { sender: manySigner.address } });
			await toolbox.expectAllClientsReturnSameData(async (client) =>
				(await collect(client.core.streamEvents(options()))).map((frame) => frame.event),
			);
			for (const kind of KINDS) {
				const events = (await collect(client(kind).core.streamEvents(options()))).map(
					(frame) => frame.event,
				);
				expect(events.map((event) => event.eventIndex)).toEqual(
					Array.from({ length: MANY_EVENTS }, (_, i) => i),
				);
				expect(events.every((event) => event.transactionDigest === manyEventsDigest)).toBe(true);
				expect(
					await listEvents(kind, {
						filter: { sender: manySigner.address },
						startCheckpoint: firstCheckpoint,
					}),
					NAMES[kind],
				).toEqual(events);
			}
		});

		it('streams unfiltered system transactions from genesis in both directions and resumes', async () => {
			const histories = [];
			for (const kind of KINDS) {
				const options = {
					start: { checkpoint: '0' },
					end: { checkpoint: '3' },
					include: { transaction: true, bcs: true } as const,
					signal: signal(),
				};
				const ascending = await collect(client(kind).core.streamTransactions(options));
				const transactions = ascending.map(
					(frame) => frame.transaction.Transaction ?? frame.transaction.FailedTransaction,
				);
				expect(transactions[0].transaction.kind.$kind).toBe('Genesis');
				expect(
					transactions
						.slice(1)
						.some((tx) => tx.transaction.kind.$kind !== 'ProgrammableTransaction'),
				).toBe(true);
				for (const tx of transactions) {
					expect(tx.transaction.sender).toBe(bcs.TransactionData.parse(tx.bcs).V1.sender);
				}
				const descending = await collect(
					client(kind).core.streamTransactions({
						order: 'descending',
						start: { checkpoint: '2' },
						include: options.include,
						signal: signal(),
					}),
				);
				expect(
					descending.map(
						(frame) => frame.transaction.Transaction ?? frame.transaction.FailedTransaction,
					),
				).toEqual([...transactions].reverse());
				const resumed = await collect(
					client(kind).core.streamTransactions({
						start: { resumeToken: ascending[0].resumeToken },
						end: options.end,
						include: options.include,
						signal: signal(),
					}),
				);
				expect(resumed.map((frame) => frame.transaction)).toEqual(
					ascending.slice(1).map((frame) => frame.transaction),
				);
				histories.push(transactions);
			}
			expect(histories[0]).toEqual(histories[1]);
		});

		it('returns identical events and preserves event order within each transaction', async () => {
			await toolbox.expectAllClientsReturnSameData(async (client) =>
				(
					await collect(
						client.core.streamEvents({ ...range(), filter: { sender: signer.address } }),
					)
				).map((frame) => frame.event),
			);
			for (const kind of KINDS) {
				const ascending = (
					await collect(
						client(kind).core.streamEvents({ ...range(), filter: { sender: signer.address } }),
					)
				).map((frame) => frame.event);
				expect(ascending.map((event) => event.transactionDigest)).toEqual(
					digests.flatMap((digest) => [digest, digest, digest]),
				);
				expect(ascending.map((event) => event.eventIndex)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);
				const descending = await collect(
					client(kind).core.streamEvents({
						...range('descending'),
						filter: { sender: signer.address },
					}),
				);
				expect(
					descending.map((frame) => frame.event),
					NAMES[kind],
				).toEqual([...ascending].reverse());
			}
		});

		describe.each(KINDS)('%s', (kind) => {
			it('resumes from event tokens to exactly the remaining items', async () => {
				const filter = { sender: manySigner.address };
				const frames = await collect(client(kind).core.streamEvents({ ...range(), filter }));
				expect(frames).toHaveLength(MANY_EVENTS);
				for (let i = 0; i < frames.length; i += 7) {
					const remainder = await collect(
						client(kind).core.streamEvents({
							start: { resumeToken: frames[i].resumeToken },
							end: range().end,
							filter,
							signal: signal(),
						}),
					);
					expect(
						remainder.map((frame) => frame.event),
						`resumed after item ${i}`,
					).toEqual(frames.slice(i + 1).map((frame) => frame.event));
				}
			});
		});
	});

	/** Follows `family` into live delivery while submitting, and compares with the list method. */
	async function followWhileSubmitting(options: {
		client: ClientWithCoreApi;
		kind: ClientKind;
		family: 'checkpoints' | 'transactions' | 'events';
		delivery: Delivery;
		/** Milliseconds the consumer waits after each frame. */
		delay?: number;
		resume?: boolean;
		/** Submit one more transaction after a reconnect. */
		afterReconnect?: boolean;
	}) {
		const { family, delivery } = options;
		const from = await newSigner();
		const history = [await emitEvents(from, 2), await emitEvents(from, 1)];
		const start = { checkpoint: history[0].checkpoint };
		const filter = { sender: from.address };
		const include = {
			transaction: true,
			effects: true,
			events: true,
			balanceChanges: true,
			objectTypes: true,
		} as const;
		const log = statusLog();

		type Frame = { resumeToken: string; value: unknown; key: string; checkpoint: string };
		const open = (bound: SuiClientTypes.StreamStart) => (signal: AbortSignal) => {
			const common = { start: bound, delivery, signal, onStatus: log.onStatus };
			async function* frames(): AsyncGenerator<Frame> {
				if (family === 'checkpoints') {
					for await (const f of options.client.core.streamCheckpoints(common)) {
						const { sequenceNumber } = f.checkpoint;
						yield { ...f, value: f.checkpoint, key: sequenceNumber, checkpoint: sequenceNumber };
					}
				} else if (family === 'transactions') {
					for await (const f of options.client.core.streamTransactions({
						...common,
						filter,
						include,
					})) {
						const tx = f.transaction.Transaction!;
						yield { ...f, value: f.transaction, key: tx.digest, checkpoint: tx.checkpoint! };
					}
				} else {
					for await (const f of options.client.core.streamEvents({ ...common, filter })) {
						const { event } = f;
						yield {
							...f,
							value: event,
							key: `${event.transactionDigest}:${event.eventIndex}`,
							// Streams position every event by its checkpoint, so it is always set.
							checkpoint: event.checkpoint!,
						};
					}
				}
			}
			return frames();
		};

		let reader = new Reader(open(start), { delay: options.delay });
		const submitted = [...history];
		const submitting = (async () => {
			for (let i = 0; i < 6; i++) {
				submitted.push(await emitEvents(from, 1 + (i % 3), { fast: true }));
				await sleep(Math.random() * 500);
			}
		})();
		// Ends the wait below if a submission fails, instead of waiting for frames that never come.
		const submissionFailed = submitting.then(() => new Promise<never>(() => {}));
		submissionFailed.catch(() => {});
		const delivered: Frame[] = [];
		if (options.resume) {
			try {
				await Promise.race([reader.until((frames) => frames.length >= 4), submissionFailed]);
			} catch (error) {
				await submitting.catch(() => {});
				throw error;
			}
			await reader.close();
			delivered.push(...reader.frames);
			reader = new Reader(open({ resumeToken: delivered.at(-1)!.resumeToken }), {
				delay: options.delay,
			});
		}
		await submitting;
		if (options.resume) {
			// The submissions can all land before the resumed reader connects; one more after it
			// connects gives it a match to deliver.
			const resumedConnected = () =>
				attempts(log.statuses())[1]?.some((status) => status.$kind === 'Connected') ?? false;
			await waitFor(resumedConnected, 30_000);
			submitted.push(await emitEvents(from, 1, { fast: true }));
		}
		if (options.afterReconnect) {
			const reconnects = () => log.kinds().filter((k) => k === 'Connecting').length - 1;
			const before = reconnects();
			await waitFor(() => reconnects() > before, 30_000);
			submitted.push(await emitEvents(from, 1, { fast: true }));
		}
		const last = submitted.at(-1)!.checkpoint;
		await reader.until((frames) => {
			const lastFrame = frames.at(-1) ?? delivered.at(-1);
			return !!lastFrame && BigInt(lastFrame.checkpoint) >= BigInt(last);
		});
		await reader.settle(2_000);
		delivered.push(...reader.frames);

		// Live delivery can be ahead of the index the list methods read.
		await toolbox.waitForTransaction({ digest: submitted.at(-1)!.digest });
		const through = BigInt(delivered.at(-1)!.checkpoint);
		const listed = () =>
			family === 'checkpoints'
				? listCheckpoints(options.kind, {
						startCheckpoint: start.checkpoint,
						endCheckpoint: through + 1n,
					})
				: family === 'transactions'
					? listTransactions(options.kind, {
							filter,
							include,
							startCheckpoint: start.checkpoint,
						})
					: listEvents(options.kind, { filter, startCheckpoint: start.checkpoint });
		let expected = await listed();
		for (let i = 0; i < 60 && expected.length < delivered.length; i++) {
			await sleep(500);
			expected = await listed();
		}

		const keys = delivered.map((frame) => frame.key);
		expect(new Set(keys).size, 'duplicates').toBe(keys.length);
		expect(delivered.map((frame) => frame.value)).toEqual(expected);
		if (family !== 'checkpoints') {
			const seen = new Set(delivered.map((frame) => frame.key.split(':')[0]));
			for (const { digest } of submitted) expect(seen).toContain(digest);
		}
		return { statuses: log.statuses() };
	}

	describe.each(LIVE)('live delivery (%s, %s)', (kind, delivery) => {
		it.for(['checkpoints', 'transactions', 'events'] as const)(
			'delivers %s exactly once from history into live while transactions are submitted, across a resume',
			async (family) => {
				const { statuses } = await followWhileSubmitting({
					client: client(kind),
					kind,
					family,
					delivery,
					resume: true,
				});
				expect(statuses.filter((s) => s.$kind === 'Retrying')).toEqual([]);
				const all = attempts(statuses);
				expect(all).toHaveLength(2);
				for (const attempt of all) {
					expect(attempt.map((s) => s.$kind)).toEqual(['Connecting', 'Connected']);
				}
			},
		);

		it('delivers live checkpoints with all of their transactions, as getTransaction returns them', async () => {
			const include = { effects: true, events: true, objectTypes: true } as const;
			const reader = new Reader<
				SuiClientTypes.StreamCheckpoint<{ transactions: typeof include }>['checkpoint']
			>((signal) => {
				async function* values() {
					for await (const frame of client(kind).core.streamCheckpoints({
						include: { transactions: include },
						delivery,
						signal,
					}))
						yield frame.checkpoint;
				}
				return values();
			});
			// A fresh follow starts at its first frame, so submit once one has arrived.
			await reader.until((frames) => frames.length > 0);
			const { digest, checkpoint } = await emitEvents(await newSigner(), 2);
			await reader.until((frames) => frames.some((frame) => frame.sequenceNumber === checkpoint));
			// Closing first surfaces any failure the stream recorded after the checkpoint arrived.
			await reader.close();
			const delivered = reader.frames.find((frame) => frame.sequenceNumber === checkpoint)!;
			const fetched = await client(kind).core.getTransaction({ digest, include });
			expect(
				delivered.transactions.find((result) => result.Transaction?.digest === digest),
			).toEqual(fetched);
			// Every transaction of the live checkpoint, as a bounded read of it returns them.
			const [read] = await collect(
				client(kind).core.streamCheckpoints({
					start: { checkpoint },
					end: { checkpoint: (BigInt(checkpoint) + 1n).toString() },
					include: { transactions: include },
					signal: signal(),
				}),
			);
			expect(delivered.transactions).toEqual(read.checkpoint.transactions);
			const sequenceNumbers = reader.frames.map((frame) => BigInt(frame.sequenceNumber));
			expect(sequenceNumbers).toEqual(
				sequenceNumbers.map((_, i) => sequenceNumbers[0] + BigInt(i)),
			);
		});

		it('continues unfiltered transaction data from history into live system transactions', async () => {
			const checkpoint = await tip();
			let sawHistory = false;
			let sawLiveSystem = false;
			// Checkpoints indexed once the stream is running show it continued past its history.
			let runningAt: bigint | undefined;
			for await (const frame of client(kind).core.streamTransactions({
				start: { checkpoint },
				include: { transaction: true },
				delivery,
				signal: signal(),
			})) {
				runningAt ??= BigInt(await tip());
				const tx = frame.transaction.Transaction ?? frame.transaction.FailedTransaction;
				expect(tx.transaction.kind.$kind).toBeTypeOf('string');
				expect(tx.bcs).toBeUndefined();
				if (tx.checkpoint === checkpoint) sawHistory = true;
				if (
					BigInt(tx.checkpoint!) > runningAt &&
					tx.transaction.kind.$kind !== 'ProgrammableTransaction'
				) {
					sawLiveSystem = true;
					break;
				}
			}
			expect(sawHistory).toBe(true);
			expect(sawLiveSystem).toBe(true);
		});

		it('follows a sparse filter quietly until its first match', async () => {
			const from = await newSigner();
			type Frame = SuiClientTypes.StreamEventFrame<{ progress: true }>;
			const events = (frames: Frame[]) => frames.filter((frame) => frame.$kind === 'Event');
			const log = statusLog();
			const reader = new Reader<Frame>((signal) =>
				client(kind).core.streamEvents({
					filter: { sender: from.address },
					delivery,
					frames: { progress: true },
					onStatus: log.onStatus,
					signal,
				}),
			);
			// The first Progress frame places the stream, so a later event is delivered.
			await reader.until((frames) => frames.some((frame) => frame.$kind === 'Progress'));
			await sleep(5_000);
			const quiet = log.kinds();
			expect(quiet.filter((k) => k === 'Connecting')).toHaveLength(1);
			expect(quiet).not.toContain('Retrying');
			let baseline: Frame | undefined = reader.frames.findLast(
				(frame) => frame.$kind === 'Progress',
			);
			if (kind === 'graphql' && delivery === 'subscribe') {
				// The server sends live progress only after 240 quiet checkpoints (about 50 s on
				// localnet), so take the baseline from a backfill's progress instead.
				[baseline] = await take(
					client(kind).core.streamEvents({
						start: { checkpoint: await tip() },
						filter: { sender: from.address },
						delivery,
						frames: { progress: true },
						signal: signal(),
					}),
					1,
				);
			}
			if (baseline?.$kind !== 'Progress') throw new Error('Expected a Progress baseline');
			expect(events(reader.frames)).toEqual([]);

			const { digest } = await emitEvents(from, 1);
			await reader.until((frames) => events(frames).length === 1);
			await reader.settle(1_000);
			expect(events(reader.frames).map((frame) => frame.event.transactionDigest)).toEqual([digest]);
			const [resumed] = await take(
				client(kind).core.streamEvents({
					start: { resumeToken: baseline.resumeToken },
					filter: { sender: from.address },
					delivery,
					signal: signal(),
				}),
				1,
			);
			expect(resumed.event.transactionDigest).toBe(digest);
			expect(log.kinds()).not.toContain('Retrying');
		});

		it('catches up through history and continues with a newly submitted event', async () => {
			const filter = { sender: signer.address };
			// Other tests add events from `signer`, so read the whole history first.
			const history = await listEvents(kind, { filter, startCheckpoint: firstCheckpoint });
			const stream = client(kind).core.streamEvents({
				start: { checkpoint: firstCheckpoint },
				filter,
				delivery,
				signal: signal(),
			});
			try {
				for (let i = 0; i < history.length; i++) {
					const next = await stream.next();
					expect(next.done).toBe(false);
					if (!next.done) expect(next.value.event).toEqual(history[i]);
				}
				expect(history.slice(0, 9).map((event) => event.transactionDigest)).toEqual(
					digests.flatMap((digest) => [digest, digest, digest]),
				);
				// The stream continues from where history ended, so the new event is delivered
				// whether it lands before or after the live feed opens.
				const live = await emitEvents(signer, 1);
				let next = await stream.next();
				while (!next.done && next.value.event.transactionDigest !== live.digest) {
					next = await stream.next();
				}
				expect(next.done).toBe(false);
			} finally {
				await stream.return(undefined);
			}
		});
	});

	describe.each(KINDS)('forced reconnects (%s)', (kind) => {
		it.for(['checkpoints', 'events'] as const)(
			'delivers %s exactly once when the live connection resets every 2 s',
			async (family) => {
				const { client: resetting, resets } = resettingClient(kind, 2_000);
				const { statuses } = await followWhileSubmitting({
					client: resetting,
					kind,
					family,
					delivery: 'subscribe',
					// A slow consumer: the gRPC pull path must not overflow meanwhile.
					delay: kind === 'grpc' ? 150 : 0,
					afterReconnect: true,
				});
				const retries = statuses.filter((s) => s.$kind === 'Retrying');
				const connecting = statuses.filter((s) => s.$kind === 'Connecting');
				expect(retries.length).toBeGreaterThan(0);
				// A reader closed during a backoff leaves one `Retrying` without its `Connecting`.
				const pendingRetry = statuses.at(-1)?.$kind === 'Retrying' ? 1 : 0;
				expect(connecting).toHaveLength(retries.length + 1 - pendingRetry);
				expect(resets.count).toBeGreaterThanOrEqual(retries.length);
				for (const retry of retries) {
					expect(causedByReset(retry.error), String(retry.error)).toBe(true);
					expect(retry.reason).toBe('Unavailable');
				}
				const [, ...reconnects] = attempts(statuses);
				expect(reconnects.length).toBeGreaterThan(0);
				expect(reconnects.some((attempt) => attempt.some((s) => s.$kind === 'Connected'))).toBe(
					true,
				);
			},
		);
	});

	describe('GraphQL subscribe', () => {
		it('finishes a raw GraphQL operation when Sui closes the SSE response', async () => {
			const results = await collect(
				toolbox.graphqlClient.subscribe<{ chainIdentifier: string }>({
					query: 'query { chainIdentifier }',
					signal: signal(),
				}),
			);
			expect(results).toHaveLength(1);
			expect(results[0].errors).toBeUndefined();
			expect(results[0].data?.chainIdentifier).toBeTypeOf('string');
		});
	});
});
