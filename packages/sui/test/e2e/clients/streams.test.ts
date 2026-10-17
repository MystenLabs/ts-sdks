// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// GraphQL `subscribe` cases need a separate GraphQL service; see test/e2e/README.md.

import { afterEach, beforeAll, describe, expect, inject, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import type { ClientWithCoreApi } from '../../../src/client/core.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { toGrpcEventFilter, toGrpcTransactionFilter } from '../../../src/grpc/filters.js';
import { GrpcTypes, SuiGrpcClient } from '../../../src/grpc/index.js';
import type { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import { Transaction } from '../../../src/transactions/index.js';
import { setup, type ClientKind, type TestToolbox } from '../utils/setup.js';

type Delivery = 'subscribe' | 'poll';
type Status = SuiClientTypes.StreamStatus;
type Signer = { keypair: Ed25519Keypair; address: string };

const graphqlSubscriptions = inject('graphqlSubscriptions');
const graphqlStreamFixes = inject('graphqlStreamFixes');
const grpcStreamFixes = inject('grpcStreamFixes');

const LIVE: [ClientKind, Delivery][] = [
	['grpc', 'subscribe'],
	['grpc', 'poll'],
	['graphql', 'subscribe'],
	['graphql', 'poll'],
];
const KINDS: ClientKind[] = ['grpc', 'graphql'];
const NAMES: Record<ClientKind, string> = { grpc: 'gRPC', graphql: 'GraphQL' };

/** A GraphQL subscription reports `Live` with its first match or progress edge; until then it is `Connected`. */
function listening(kind: ClientKind, delivery: Delivery): Status['$kind'] {
	return kind === 'graphql' && delivery === 'subscribe' ? 'Connected' : 'Live';
}

/** GraphQL `subscribe` delivery needs a service that serves subscriptions. */
function missingSubscriptions(kind: ClientKind, delivery: Delivery) {
	return kind === 'graphql' && delivery === 'subscribe' && !graphqlSubscriptions;
}

const MISSING_SERVER_FIXES = 'needs a server with the stream fixes for this transport';

/**
 * Cases that rely on GraphQL paging checkpoints after a cursor below the `afterCheckpoint` bound,
 * or on gRPC subscriptions filling object types and event JSON. Each transport is gated by its own
 * server.
 */
function missingServerFixes(kind: ClientKind, family: string, delivery: Delivery = 'poll') {
	if (kind === 'graphql') return !graphqlStreamFixes && family === 'checkpoints';
	return !grpcStreamFixes && delivery === 'subscribe' && family === 'transactions';
}

/** More events than GraphQL returns for a transaction's nested event list (50). */
const MANY_EVENTS = 60;
const NESTED_LIST_LIMIT = 50;

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
		if (!result.hasNextPage || !result.endCursor) return items;
		after = result.endCursor;
	}
}

/** Records statuses together with how many frames had been read when each arrived. */
function statusLog(reader?: () => number) {
	const log: { status: Status; frames: number }[] = [];
	return {
		log,
		statuses: () => log.map(({ status }) => status),
		kinds: () => log.map(({ status }) => status.$kind),
		onStatus: (status: Status) => log.push({ status, frames: reader?.() ?? 0 }),
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

/** Resolves once a raw GraphQL subscription opens; rejects if its first read fails or times out. */
function opening(timeout = 30_000) {
	const opened = Promise.withResolvers<void>();
	return {
		onOpen: () => opened.resolve(),
		async wait(first: Promise<unknown>) {
			first.catch(() => {});
			let timer: ReturnType<typeof setTimeout> | undefined;
			try {
				await Promise.race([
					opened.promise,
					first.then(() => {}),
					new Promise<never>((_, reject) => {
						timer = setTimeout(() => reject(new Error('Subscription did not open')), timeout);
					}),
				]);
			} finally {
				clearTimeout(timer);
			}
		},
	};
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

/** Sorted paths where `actual` and `expected` differ, such as `effects.changedObjects[].objectType`. */
function differingFields(actual: unknown, expected: unknown): string[] {
	const paths = new Set<string>();
	const walk = (a: unknown, b: unknown, path: string, keyed: boolean) => {
		if (Object.is(a, b)) return;
		const objects = typeof a === 'object' && a !== null && typeof b === 'object' && b !== null;
		if (!objects || Array.isArray(a) !== Array.isArray(b)) {
			paths.add(path);
			return;
		}
		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) paths.add(`${path}.length`);
			for (let i = 0; i < Math.min(a.length, b.length); i++) walk(a[i], b[i], `${path}[]`, false);
			return;
		}
		const ao = a as Record<string, unknown>;
		const bo = b as Record<string, unknown>;
		for (const key of new Set([...Object.keys(ao), ...Object.keys(bo)])) {
			// `objectTypes` maps object ids to types; elide the ids.
			walk(
				ao[key],
				bo[key],
				keyed ? `${path}.*` : path ? `${path}.${key}` : key,
				key === 'objectTypes',
			);
		}
	};
	walk(actual, expected, '', false);
	return [...paths].sort();
}

/** A fetch that counts the body chunks read from matching responses, read only on demand. */
function countingFetch(match: (url: string) => boolean) {
	const pulls = { count: 0 };
	const wrapped: typeof fetch = async (input, init) => {
		const response = await fetch(input, init);
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (!match(url) || !response.body) return response;
		const reader = response.body.getReader();
		const body = new ReadableStream<Uint8Array>(
			{
				async pull(controller) {
					const { done, value } = await reader.read();
					if (done) return controller.close();
					pulls.count++;
					controller.enqueue(value);
				},
				cancel: (reason) => reader.cancel(reason),
			},
			{ highWaterMark: 0 },
		);
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	};
	return { fetch: wrapped, pulls };
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

	/** Executes one transaction from `from` emitting `count` events; waits for both indexes. */
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

		it('streams a transaction with more than 50 events exactly as listTransactions and getTransaction return it', async () => {
			const include = { transaction: true, effects: true, events: true, bcs: true } as const;
			const streamed: Record<string, SuiClientTypes.TransactionResult<typeof include>> = {};
			for (const kind of KINDS) {
				const frames = await collect(
					client(kind).core.streamTransactions({
						...range(),
						filter: { sender: manySigner.address },
						include,
					}),
				);
				expect(frames, NAMES[kind]).toHaveLength(1);
				const [{ transaction }] = frames;
				expect(transaction.Transaction?.digest).toBe(manyEventsDigest);
				expect(
					await listTransactions(kind, {
						filter: { sender: manySigner.address },
						include,
						startCheckpoint: firstCheckpoint,
					}),
					NAMES[kind],
				).toEqual([transaction]);
				expect(
					await client(kind).core.getTransaction({ digest: manyEventsDigest, include }),
					NAMES[kind],
				).toEqual(transaction);
				streamed[kind] = transaction;
			}
			// GraphQL returns only the first 50 nested events.
			const grpcEvents = streamed.grpc.Transaction!.events;
			expect(grpcEvents).toHaveLength(MANY_EVENTS);
			expect(streamed.graphql.Transaction!.events).toHaveLength(NESTED_LIST_LIMIT);
			expect(streamed.graphql).toEqual({
				...streamed.grpc,
				Transaction: {
					...streamed.grpc.Transaction,
					events: grpcEvents.slice(0, NESTED_LIST_LIMIT),
				},
			});
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

		it.each(KINDS)(
			'reports history Page statuses while paging a finite read (%s)',
			async (kind) => {
				const { kinds, statuses, onStatus } = statusLog();
				const frames = await collect(
					client(kind).core.streamEvents({
						...range(),
						filter: { sender: manySigner.address },
						onStatus,
					}),
				);
				expect(frames).toHaveLength(MANY_EVENTS);
				expect(kinds().slice(0, 2)).toEqual(['Connecting', 'Connected']);
				expect(statuses()[0]).toEqual({ $kind: 'Connecting', attempt: 0 });
				expect(
					kinds()
						.slice(2)
						.every((k) => k === 'Page'),
				).toBe(true);
				const pages = statuses().filter((s) => s.$kind === 'Page');
				expect(pages.every((page) => page.stage === 'history')).toBe(true);
				expect(pages.at(-1)).toMatchObject({ end: 'bound' });
				if (kind === 'graphql')
					expect(pages.filter((page) => page.end === 'limit').length).toBeGreaterThan(0);
			},
		);

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

			it('resumes from checkpoint tokens to exactly the remaining checkpoints', async (context) => {
				context.skip(missingServerFixes(kind, 'checkpoints'), MISSING_SERVER_FIXES);
				// A fixed range: localnet keeps adding checkpoints while other files run.
				const checkpoints = await collect(
					client(kind).core.streamCheckpoints({
						start: { checkpoint: firstCheckpoint },
						end: { checkpoint: lastCheckpoint },
						signal: signal(),
					}),
				);
				expect(checkpoints.length).toBeGreaterThan(1);
				for (let i = 0; i < checkpoints.length; i += 2) {
					const remainder = await collect(
						client(kind).core.streamCheckpoints({
							start: { resumeToken: checkpoints[i].resumeToken },
							signal: signal(),
						}),
					);
					expect(remainder.map((frame) => frame.checkpoint)).toEqual(
						checkpoints.slice(i + 1).map((frame) => frame.checkpoint),
					);
				}
			});

			it('resumes a finite descending job without repeating its last delivered event', async () => {
				const stream = client(kind).core.streamEvents({
					...range('descending'),
					filter: { sender: signer.address },
				});
				const first = await take(stream, 1);
				const remainder = await collect(
					client(kind).core.streamEvents({
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
				const anchors = await take(
					client(kind).core.streamEvents({
						start: { checkpoint: firstCheckpoint },
						filter: { sender: signer.address },
						delivery: 'poll',
						signal: signal(),
					}),
					3,
				);
				const frames = await collect(
					client(kind).core.streamEvents({
						start: { resumeToken: anchors[0].resumeToken },
						end: { resumeToken: anchors[2].resumeToken },
						filter: { sender: signer.address },
						frames: { completion: true },
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
				const descending = await collect(
					client(kind).core.streamEvents({
						order: 'descending',
						start: { checkpoint: firstCheckpoint },
						end: { resumeToken: anchors[0].resumeToken },
						filter: { sender: signer.address },
						frames: { completion: true },
						signal: signal(),
					}),
				);
				expect(
					descending
						.filter((frame) => frame.$kind === 'Event')
						.map((frame) => frame.event.eventIndex),
				).toEqual([2, 1]);
				expect(descending.at(-1)).toMatchObject({
					$kind: 'Complete',
					completion: { reason: 'cursorBound' },
				});
			});

			it('completes empty filtered ranges without manufacturing an event', async () => {
				// System transactions emit events from the zero address, so match an unused address.
				const frames = await collect(
					client(kind).core.streamEvents({
						...range(),
						filter: { sender: `0x${'ab'.repeat(32)}` },
						frames: { completion: true },
					}),
				);
				expect(frames).toHaveLength(1);
				expect(frames[0]).toMatchObject({
					$kind: 'Complete',
					completion: { reason: 'checkpointBound' },
				});
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
		const include = { effects: true, events: true } as const;
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
							checkpoint: event.checkpoint,
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
		const delivered: Frame[] = [];
		if (options.resume) {
			await reader.until((frames) => frames.length >= 4);
			await reader.close();
			delivered.push(...reader.frames);
			reader = new Reader(open({ resumeToken: delivered.at(-1)!.resumeToken }), {
				delay: options.delay,
			});
		}
		await submitting;
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
		return { statuses: log.statuses(), log: log.log };
	}

	describe.each(LIVE)('live delivery (%s, %s)', (kind, delivery) => {
		const skip = missingSubscriptions(kind, delivery);

		it.for(['checkpoints', 'transactions', 'events'] as const)(
			'delivers %s exactly once from history into live while transactions are submitted, across a resume',
			async (family, context) => {
				if (missingSubscriptions(kind, delivery)) context.skip();
				context.skip(missingServerFixes(kind, family, delivery), MISSING_SERVER_FIXES);
				const { statuses } = await followWhileSubmitting({
					client: client(kind),
					kind,
					family,
					delivery,
					resume: true,
				});
				expect(statuses.filter((s) => s.$kind === 'Error' || s.$kind === 'Retrying')).toEqual([]);
				const all = attempts(statuses);
				expect(all).toHaveLength(2);
				expect(all[1].map((s) => s.$kind)).toContain('Live');
				for (const attempt of all) {
					expect(attempt[0]).toEqual({ $kind: 'Connecting', attempt: 0 });
					const kinds = attempt.map((s) => s.$kind);
					if (!kinds.includes('Live')) continue;
					const firstLive = kinds.indexOf('Live');
					const recovering = kinds.indexOf('Recovering');
					if (recovering !== -1) expect(recovering).toBeLessThan(firstLive);
					const historyPages = attempt
						.map((s, i) => [s, i] as const)
						.filter(([s]) => s.$kind === 'Page' && s.stage === 'history');
					if (delivery === 'subscribe') {
						expect(historyPages.every(([, i]) => i < firstLive)).toBe(true);
						if (recovering !== -1) expect(historyPages.every(([, i]) => i < recovering)).toBe(true);
					} else {
						expect(kinds).not.toContain('Recovering');
					}
				}
			},
		);

		it('delivers live checkpoints with all of their transactions, as getTransaction returns them', async (context) => {
			if (skip) context.skip();
			context.skip(
				missingServerFixes(kind, 'checkpoints', delivery) ||
					missingServerFixes(kind, 'transactions', delivery),
				MISSING_SERVER_FIXES,
			);
			const include = { effects: true, events: true, objectTypes: true } as const;
			const log = statusLog();
			const reader = new Reader<
				SuiClientTypes.StreamedCheckpoint<{ transactions: typeof include }>
			>((signal) => {
				async function* values() {
					for await (const frame of client(kind).core.streamCheckpoints({
						include: { transactions: include },
						delivery,
						onStatus: log.onStatus,
						signal,
					}))
						yield frame.checkpoint;
				}
				return values();
			});
			await waitFor(() => log.kinds().includes(listening(kind, delivery)));
			const { digest, checkpoint } = await emitEvents(await newSigner(), 2);
			await reader.until((frames) => frames.some((frame) => frame.sequenceNumber === checkpoint));
			// Closing first surfaces any failure the stream recorded after the checkpoint arrived.
			await reader.close();
			const delivered = reader.frames.find((frame) => frame.sequenceNumber === checkpoint)!;
			const fetched = await client(kind).core.getTransaction({ digest, include });
			expect(delivered.transactions.find((tx) => tx.digest === digest)).toEqual(
				fetched.Transaction,
			);
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

		it.skipIf(skip)(
			'continues unfiltered transaction data from history into live system transactions',
			async () => {
				const checkpoint = await tip();
				let sawHistory = false;
				let sawLiveSystem = false;
				for await (const frame of client(kind).core.streamTransactions({
					start: { checkpoint },
					include: { transaction: true },
					delivery,
					signal: signal(),
				})) {
					const tx = frame.transaction.Transaction ?? frame.transaction.FailedTransaction;
					expect(tx.transaction.kind.$kind).toBeTypeOf('string');
					expect(tx.bcs).toBeUndefined();
					if (tx.checkpoint === checkpoint) sawHistory = true;
					if (
						BigInt(tx.checkpoint!) > BigInt(checkpoint) &&
						tx.transaction.kind.$kind !== 'ProgrammableTransaction'
					) {
						sawLiveSystem = true;
						break;
					}
				}
				expect(sawHistory).toBe(true);
				expect(sawLiveSystem).toBe(true);
			},
		);

		it.skipIf(skip)(
			'reports Live for a sparse filter before its first match, and stays connected while quiet',
			async () => {
				const from = await newSigner();
				type Frame = SuiClientTypes.StreamEventResult<{ progress: true }>;
				const events = (frames: Frame[]) => frames.filter((frame) => frame.$kind === 'Event');
				let reader: Reader<Frame> | undefined;
				const log = statusLog(() => (reader ? events(reader.frames).length : 0));
				reader = new Reader((signal) =>
					client(kind).core.streamEvents({
						filter: { sender: from.address },
						delivery,
						frames: { progress: true },
						onStatus: log.onStatus,
						signal,
					}),
				);
				await waitFor(() => log.kinds().includes(listening(kind, delivery)));
				await sleep(5_000);
				const quiet = log.kinds();
				expect(quiet.filter((k) => k === 'Connecting')).toHaveLength(1);
				expect(quiet).not.toContain('Retrying');
				expect(quiet).not.toContain('Error');
				// A GraphQL subscription is Live once it reports a match or a progress edge.
				if (kind !== 'graphql' || delivery !== 'subscribe') expect(quiet).toContain('Live');
				const baseline = reader.frames.findLast((frame) => frame.$kind === 'Progress');
				expect(baseline).toBeDefined();
				expect(events(reader.frames)).toEqual([]);

				const { digest } = await emitEvents(from, 1);
				await reader.until((frames) => events(frames).length === 1);
				await reader.settle(1_000);
				expect(events(reader.frames).map((frame) => frame.event.transactionDigest)).toEqual([
					digest,
				]);
				const live = log.log.find(({ status }) => status.$kind === 'Live');
				expect(live?.frames).toBe(0);
				const [resumed] = await take(
					client(kind).core.streamEvents({
						start: { resumeToken: baseline!.resumeToken },
						filter: { sender: from.address },
						delivery,
						signal: signal(),
					}),
					1,
				);
				expect(resumed.event.transactionDigest).toBe(digest);
				expect(log.kinds()).not.toContain('Retrying');
			},
		);

		it.skipIf(skip)(
			'catches up through history and continues with a newly submitted event',
			async () => {
				const log = statusLog();
				const filter = { sender: signer.address };
				// Other tests add events from `signer`, so read the whole history first.
				const history = await listEvents(kind, { filter, startCheckpoint: firstCheckpoint });
				const stream = client(kind).core.streamEvents({
					start: { checkpoint: firstCheckpoint },
					filter,
					delivery,
					onStatus: log.onStatus,
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
					// Streams are pulled, so the live feed only opens while a read is pending.
					const pending = stream.next().then(
						(value) => ({ value }),
						(error: unknown) => ({ error }),
					);
					await waitFor(() => log.kinds().includes(listening(kind, delivery)));
					const live = await emitEvents(signer, 1);
					let next = await pending;
					if ('error' in next) throw next.error;
					while (!next.value.done && next.value.value.event.transactionDigest !== live.digest) {
						next = { value: await stream.next() };
					}
					expect(next.value.done).toBe(false);
				} finally {
					await stream.return(undefined);
				}
			},
		);

		it.skipIf(skip)('cancels a quiet filter while its next item is pending', async () => {
			const controller = new AbortController();
			const log = statusLog();
			const stream = client(kind).core.streamEvents({
				filter: { sender: `0x${'cd'.repeat(32)}` },
				delivery,
				onStatus: log.onStatus,
				signal: controller.signal,
			});
			const pending = stream.next();
			const rejection = expect(pending).rejects.toThrow('stream cancelled');
			try {
				await waitFor(() => log.kinds().includes(listening(kind, delivery)));
				controller.abort(new Error('stream cancelled'));
				await rejection;
			} finally {
				controller.abort(new Error('stream cancelled'));
				await rejection.catch(() => {});
				await stream.return(undefined);
			}
		});
	});

	describe.each(KINDS)('live items match the list methods (%s)', (kind) => {
		for (const family of ['transactions', 'events'] as const) {
			it.skipIf(missingSubscriptions(kind, 'subscribe'))(family, async (context) => {
				context.skip(missingServerFixes(kind, family, 'subscribe'), MISSING_SERVER_FIXES);
				const from = await newSigner();
				const filter = { sender: from.address };
				const include = {
					transaction: true,
					effects: true,
					events: true,
					balanceChanges: true,
					objectTypes: true,
				} as const;
				const log = statusLog();
				const reader = new Reader<unknown>((signal) => {
					async function* values() {
						if (family === 'transactions') {
							for await (const frame of client(kind).core.streamTransactions({
								filter,
								include,
								onStatus: log.onStatus,
								signal,
							}))
								yield frame.transaction;
						} else {
							for await (const frame of client(kind).core.streamEvents({
								filter,
								onStatus: log.onStatus,
								signal,
							}))
								yield frame.event;
						}
					}
					return values();
				});
				await waitFor(() => log.kinds().includes(listening(kind, 'subscribe')));
				await emitEvents(from, 1);
				await emitEvents(from, 1);
				await reader.until((frames) => frames.length >= 2);
				await reader.settle(1_000);
				const listed =
					family === 'transactions'
						? await listTransactions(kind, { filter, include })
						: await listEvents(kind, { filter });
				expect(reader.frames).toHaveLength(listed.length);
				expect(differingFields(reader.frames, listed)).toEqual([]);
			});
		}
	});

	describe.each(KINDS)('forced reconnects (%s)', (kind) => {
		it.for(['checkpoints', 'events'] as const)(
			'delivers %s exactly once when the live connection resets every 2 s',
			async (family, context) => {
				if (missingSubscriptions(kind, 'subscribe')) context.skip();
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
				}
				expect(statuses.filter((s) => s.$kind === 'Error')).toEqual([]);
				const [, ...reconnects] = attempts(statuses);
				expect(reconnects.length).toBeGreaterThan(0);
				expect(reconnects.some((attempt) => attempt.some((s) => s.$kind === 'Live'))).toBe(true);
				for (const attempt of reconnects) {
					const pages = attempt.filter((s) => s.$kind === 'Page');
					const history = pages.filter((page) => page.stage === 'history');
					expect(history.filter((page) => page.end !== 'limit').length).toBeLessThanOrEqual(1);
					expect(history.length).toBeLessThanOrEqual(2);
					if (attempt.some((s) => s.$kind === 'Live')) {
						const gap = pages.filter((page) => page.stage === 'gap');
						expect(gap.filter((page) => page.end === 'limit')).toEqual([]);
					}
				}
			},
		);
	});

	describe('gRPC slow consumer', () => {
		it('pauses a history scan without reconnecting and resumes in order', async () => {
			const log = statusLog();
			const stream = toolbox.grpcClient.streamCheckpoints({
				start: { checkpoint: '0' },
				end: { checkpoint: (BigInt(lastCheckpoint) + 1n).toString() },
				onStatus: log.onStatus,
				signal: signal(),
			});
			const sequence: bigint[] = [];
			for await (const frame of stream) {
				sequence.push(BigInt(frame.checkpoint.sequenceNumber));
				if (sequence.length === 3) await sleep(1_000);
			}
			expect(sequence).toEqual(
				Array.from({ length: Number(lastCheckpoint) + 1 }, (_, i) => BigInt(i)),
			);
			expect(log.kinds().filter((k) => k === 'Retrying' || k === 'Error')).toEqual([]);
		});

		it('pauses a live subscription without reading ahead or overflowing, and ends promptly on return', async () => {
			const { fetch, pulls } = countingFetch((url) => url.endsWith('/SubscribeCheckpoints'));
			const grpc = new SuiGrpcClient({
				network: 'localnet',
				baseUrl: `http://127.0.0.1:${inject('localnetPort')}`,
				fetch,
			});
			const log = statusLog();
			const start = await tip();
			const stream = grpc.streamCheckpoints({
				start: { checkpoint: start },
				delivery: 'subscribe',
				onStatus: log.onStatus,
				signal: signal(),
			});
			const sequence: bigint[] = [];
			const next = async () => {
				const result = await stream.next();
				expect(result.done).toBe(false);
				if (!result.done) sequence.push(BigInt(result.value.checkpoint.sequenceNumber));
			};
			while (!log.kinds().includes('Live')) await next();
			await next();
			const pulled = pulls.count;
			const before = BigInt(await tip());
			let after = before;
			const deadline = Date.now() + 60_000;
			while (after < before + 4n) {
				if (Date.now() > deadline) throw new Error('The ledger did not advance during the pause');
				await sleep(250);
				after = BigInt(await tip());
			}
			expect(pulls.count - pulled).toBeLessThanOrEqual(1);
			while (sequence.at(-1)! < after + 2n) await next();
			const pending = stream.next();
			const started = Date.now();
			await stream.return(undefined);
			await pending.catch(() => {});
			expect(Date.now() - started).toBeLessThan(1_000);
			await expect(stream.next()).resolves.toMatchObject({ done: true });

			expect(sequence[0]).toBe(BigInt(start));
			sequence.forEach((checkpoint, i) => expect(checkpoint).toBe(sequence[0] + BigInt(i)));
			expect(log.kinds().filter((k) => k === 'Retrying' || k === 'Error')).toEqual([]);
			expect(log.kinds().filter((k) => k === 'Connecting')).toHaveLength(1);
		});
	});

	describe('gRPC protocol assumptions', () => {
		const { QueryEndReason } = GrpcTypes;
		const eventKey = (event: GrpcTypes.Event | undefined) =>
			`${event?.transactionDigest}:${event?.eventIndex}`;

		async function listEventsRaw(request: Partial<GrpcTypes.ListEventsRequest>) {
			const call = toolbox.grpcClient.ledgerService.listEvents(
				{
					readMask: { paths: ['transaction_digest', 'event_index', 'checkpoint'] },
					...request,
				},
				{ abort: signal() },
			);
			const frames: GrpcTypes.ListEventsResponse[] = [];
			for await (const frame of call.responses) frames.push(frame);
			return frames;
		}

		it('ends a List at a Subscribe watermark cursor with CURSOR_BOUND while the tip moves on', async () => {
			const from = await newSigner();
			const filter = toGrpcEventFilter({ sender: from.address });
			const before = await emitEvents(from, 2);

			const controller = new AbortController();
			controllers.push(controller);
			const subscription = toolbox.grpcClient.subscriptionService.subscribeEvents(
				{ readMask: { paths: ['transaction_digest', 'event_index', 'checkpoint'] }, filter },
				{ abort: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]) },
			);
			const live = subscription.responses[Symbol.asyncIterator]();
			const first = await live.next();
			expect(first.done).toBe(false);
			const firstFrame = first.value as GrpcTypes.SubscribeEventsResponse;
			// A filtered subscription opens with a progress-only frame at its start position.
			expect(firstFrame.event).toBeUndefined();
			const cursor = firstFrame.watermark!.cursor!;

			// The tip moves on during the gap.
			const during = [await emitEvents(from, 2), await emitEvents(from, 1)];
			const liveKeys: string[] = [];
			while (liveKeys.length < 3) {
				const next = await live.next();
				expect(next.done).toBe(false);
				const frame = next.value as GrpcTypes.SubscribeEventsResponse;
				if (frame.event) liveKeys.push(eventKey(frame.event));
			}
			controller.abort();

			const gap = await listEventsRaw({
				filter,
				startCheckpoint: BigInt(before.checkpoint),
				options: { before: cursor },
			});
			const end = gap.at(-1)!;
			expect(end.end?.reason).toBe(QueryEndReason.CURSOR_BOUND);
			expect(end.event).toBeUndefined();
			// The terminal watermark is the bound itself.
			expect(end.watermark?.cursor).toEqual(cursor);
			const gapKeys = gap.filter((frame) => frame.event).map((frame) => eventKey(frame.event));
			// History before the cursor and live delivery from it meet exactly.
			expect(gapKeys).toEqual([`${before.digest}:0`, `${before.digest}:1`]);
			expect(liveKeys).toEqual([
				`${during[0].digest}:0`,
				`${during[0].digest}:1`,
				`${during[1].digest}:0`,
			]);
		});

		it('opens a filtered checkpoint subscription with progress and an unfiltered one with a checkpoint', async () => {
			const from = await newSigner();
			for (const filter of [toGrpcTransactionFilter({ sender: from.address }), undefined]) {
				const controller = new AbortController();
				controllers.push(controller);
				const call = toolbox.grpcClient.subscriptionService.subscribeCheckpoints(
					{ readMask: { paths: ['sequence_number'] }, filter },
					{ abort: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]) },
				);
				const { value } = await call.responses[Symbol.asyncIterator]().next();
				controller.abort();
				const frame = value as GrpcTypes.SubscribeCheckpointsResponse;
				expect(frame.cursor).toBeTypeOf('bigint');
				if (filter) {
					expect(frame.checkpoint).toBeUndefined();
				} else {
					expect(frame.checkpoint?.sequenceNumber).toBe(frame.cursor);
				}
			}
		});

		it('replays a filtered checkpoint stream’s progress-only first checkpoint without losing a match', async () => {
			const from = await newSigner();
			const history = await emitEvents(from, 1);
			const reader = new Reader((signal) =>
				toolbox.grpcClient.streamCheckpoints({
					start: { checkpoint: history.checkpoint },
					grpcFilter: toGrpcTransactionFilter({ sender: from.address }),
					signal,
				}),
			);
			const submitted = [history];
			for (let i = 0; i < 5; i++) {
				submitted.push(await emitEvents(from, 1, { fast: true }));
				await sleep(Math.random() * 400);
			}
			const expected = [...new Set(submitted.map(({ checkpoint }) => checkpoint))];
			await reader.until((frames) => frames.length >= expected.length);
			await reader.settle(2_000);
			expect(reader.frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(expected);
		});

		it('answers empty and reversed cursor intervals', async () => {
			const frames = await listEventsRaw({
				filter: toGrpcEventFilter({ sender: signer.address }),
				startCheckpoint: BigInt(firstCheckpoint),
			});
			const cursors = frames
				.filter((frame) => frame.event)
				.map((frame) => frame.watermark!.cursor!);
			expect(cursors.length).toBeGreaterThanOrEqual(3);
			const [a, , c] = cursors;
			const filter = toGrpcEventFilter({ sender: signer.address });

			const window = await listEventsRaw({ filter, options: { after: a, before: c } });
			expect(window.filter((frame) => frame.event)).toHaveLength(1);
			expect(window.at(-1)?.end?.reason).toBe(QueryEndReason.CURSOR_BOUND);

			// An empty interval ends at its bound without an item.
			const empty = await listEventsRaw({ filter, options: { after: a, before: a } });
			expect(empty.filter((frame) => frame.event)).toEqual([]);
			expect(empty.at(-1)?.end?.reason).toBe(QueryEndReason.CURSOR_BOUND);

			// So does a reversed one: the session's `reaches` check skips such a gap before asking.
			const reversed = await listEventsRaw({ filter, options: { after: c, before: a } });
			expect(reversed.filter((frame) => frame.event)).toEqual([]);
			expect(reversed.at(-1)?.end?.reason).toBe(QueryEndReason.CURSOR_BOUND);
		});

		it('skips the gap when history is already past the subscription’s first position', async () => {
			const from = await newSigner();
			await emitEvents(from, 1);
			const filter = { sender: from.address };
			const start = { checkpoint: (await emitEvents(from, 1)).checkpoint };

			// Open the subscription before the history scan, then advance the ledger past it.
			let subscribeRequest: { url: string; init: RequestInit } | undefined;
			let preopened: Promise<Response> | undefined;
			let hold: (() => Promise<void>) | undefined;
			const preopen = new AbortController();
			controllers.push(preopen);
			const fetchWithPreopen: typeof fetch = async (input, init) => {
				const url = String(input);
				if (url.endsWith('/SubscribeEvents')) {
					subscribeRequest ??= { url, init: { ...init, signal: undefined } };
					const response = preopened;
					preopened = undefined;
					if (response) return response;
				} else if (url.endsWith('/ListEvents') && hold && subscribeRequest) {
					const wait = hold;
					hold = undefined;
					preopened = fetch(subscribeRequest.url, {
						...subscribeRequest.init,
						signal: AbortSignal.any([preopen.signal, AbortSignal.timeout(60_000)]),
					});
					await preopened;
					await wait();
				}
				return fetch(input, init);
			};
			const grpc = new SuiGrpcClient({
				network: 'localnet',
				baseUrl: `http://127.0.0.1:${inject('localnetPort')}`,
				fetch: fetchWithPreopen,
			});
			const probeLog = statusLog();
			const probe = new Reader((signal) =>
				grpc.streamEvents({ filter, signal, onStatus: probeLog.onStatus }),
			);
			await waitFor(() => probeLog.kinds().includes('Live'));
			await probe.close();
			expect(subscribeRequest).toBeDefined();

			const ahead: Awaited<ReturnType<typeof emitEvents>>[] = [];
			hold = async () => {
				ahead.push(await emitEvents(from, 2), await emitEvents(from, 1));
			};
			let reader: Reader<SuiClientTypes.StreamEventFrame> | undefined;
			const log = statusLog(() => reader?.frames.length ?? 0);
			reader = new Reader((signal) =>
				grpc.streamEvents({ filter, start, signal, onStatus: log.onStatus }),
			);
			const delivered = (digest: string) => (frames: SuiClientTypes.StreamEventFrame[]) =>
				frames.some((frame) => frame.event.transactionDigest === digest);
			await waitFor(() => ahead.length === 2);
			await reader.until(delivered(ahead[1].digest));
			const after = await emitEvents(from, 1);
			await reader.until(delivered(after.digest));
			await reader.settle(2_000);
			expect(hold).toBeUndefined();
			expect(reader.frames.map((frame) => frame.event)).toEqual(
				await listEvents('grpc', { filter, startCheckpoint: start.checkpoint }),
			);
			expect(reader.frames.at(-1)?.event.transactionDigest).toBe(after.digest);
			// A progress cursor can't be ordered against an item cursor, so an empty gap may be read.
			const recovering = log.log.find(({ status }) => status.$kind === 'Recovering');
			const live = log.log.find(({ status }) => status.$kind === 'Live');
			if (recovering) {
				const gap = log.log.slice(log.log.indexOf(recovering) + 1, log.log.indexOf(live!));
				expect(gap.every(({ status }) => status.$kind === 'Page')).toBe(true);
				expect(live?.frames).toBe(recovering.frames);
			}
			expect(log.kinds()).toContain('Live');
			expect(log.kinds()).not.toContain('Retrying');
		});

		// Covered by unit tests: localnet never prunes and starts after genesis is indexed.
		it.skip('reports pruned history as HistoryUnavailable', () => {});
		it.skip('waits for the first indexed checkpoint on a new chain', () => {});
	});

	describe.skipIf(!graphqlSubscriptions)('GraphQL protocol assumptions', () => {
		type EdgeResult<Field extends string, Node> = Record<Field, { cursor: string; node: Node }>;

		it('accepts subscription edge cursors as query `after` cursors', async () => {
			const from = await newSigner();
			const eventsOpen = opening();
			const transactionsOpen = opening();
			const events = toolbox.graphqlClient.subscribe<
				EdgeResult<'events', { sequenceNumber: number; transaction: { digest: string } }>
			>({
				query: `subscription ($filter: EventFilter) {
					events(filter: $filter) { cursor node { sequenceNumber transaction { digest } } }
				}`,
				variables: { filter: { sender: from.address } },
				onOpen: eventsOpen.onOpen,
				signal: signal(),
			});
			const transactions = toolbox.graphqlClient.subscribe<
				EdgeResult<'transactions', { digest: string }>
			>({
				query: `subscription ($filter: TransactionFilter) {
					transactions(filter: $filter) { cursor node { digest } }
				}`,
				variables: { filter: { sentAddress: from.address } },
				onOpen: transactionsOpen.onOpen,
				signal: signal(),
			});
			const firstEvent = events.next();
			const firstTransaction = transactions.next();
			// Without `after`, subscriptions start live: submit once both are open.
			await Promise.all([eventsOpen.wait(firstEvent), transactionsOpen.wait(firstTransaction)]);
			const first = await emitEvents(from, 2);
			const second = await emitEvents(from, 2);

			const eventEdge = (await firstEvent).value!;
			expect(eventEdge.errors).toBeUndefined();
			expect(eventEdge.data?.events.node).toEqual({
				sequenceNumber: 0,
				transaction: { digest: first.digest },
			});
			const eventsAfter = await toolbox.graphqlClient.query<{
				events: { nodes: { sequenceNumber: number; transaction: { digest: string } }[] };
			}>({
				query: `query ($after: String, $filter: EventFilter) {
					events(after: $after, filter: $filter) { nodes { sequenceNumber transaction { digest } } }
				}`,
				variables: { after: eventEdge.data!.events.cursor, filter: { sender: from.address } },
			});
			expect(eventsAfter.errors).toBeUndefined();
			expect(eventsAfter.data?.events.nodes).toEqual([
				{ sequenceNumber: 1, transaction: { digest: first.digest } },
				{ sequenceNumber: 0, transaction: { digest: second.digest } },
				{ sequenceNumber: 1, transaction: { digest: second.digest } },
			]);

			const transactionEdge = (await firstTransaction).value!;
			expect(transactionEdge.errors).toBeUndefined();
			expect(transactionEdge.data?.transactions.node.digest).toBe(first.digest);
			const transactionsAfter = await toolbox.graphqlClient.query<{
				transactions: { nodes: { digest: string }[] };
			}>({
				query: `query ($after: String, $filter: TransactionFilter) {
					transactions(after: $after, filter: $filter) { nodes { digest } }
				}`,
				variables: {
					after: transactionEdge.data!.transactions.cursor,
					filter: { sentAddress: from.address },
				},
			});
			expect(transactionsAfter.errors).toBeUndefined();
			expect(transactionsAfter.data?.transactions.nodes).toEqual([{ digest: second.digest }]);
		});

		it('reports the checkpoint of live transactions', async () => {
			const from = await newSigner();
			const open = opening();
			const subscription = toolbox.graphqlClient.subscribe<
				EdgeResult<
					'transactions',
					{ digest: string; effects: { checkpoint: { sequenceNumber: number } | null } | null }
				>
			>({
				query: `subscription ($filter: TransactionFilter) {
					transactions(filter: $filter) {
						cursor node { digest effects { checkpoint { sequenceNumber } } }
					}
				}`,
				variables: { filter: { sentAddress: from.address } },
				onOpen: open.onOpen,
				signal: signal(),
			});
			const pending = subscription.next();
			await open.wait(pending);
			const { digest } = await emitEvents(from, 1, { fast: true });
			const edge = (await pending).value!;
			expect(edge.data?.transactions.node.digest).toBe(digest);
			const { Transaction: executed } = await toolbox.grpcClient.core.getTransaction({ digest });
			expect(String(edge.data?.transactions.node.effects?.checkpoint?.sequenceNumber)).toBe(
				executed!.checkpoint,
			);
		});

		it('backfills a subscription resumed after a query cursor, then continues live', async () => {
			const from = await newSigner();
			const first = await emitEvents(from, 1);
			const second = await emitEvents(from, 1);
			const listed = await toolbox.graphqlClient.query<{
				transactions: { edges: { cursor: string; node: { digest: string } }[] };
			}>({
				query: `query ($filter: TransactionFilter) {
					transactions(filter: $filter) { edges { cursor node { digest } } }
				}`,
				variables: { filter: { sentAddress: from.address } },
			});
			const [firstEdge] = listed.data!.transactions.edges;
			expect(firstEdge.node.digest).toBe(first.digest);
			const subscription = toolbox.graphqlClient.subscribe<
				EdgeResult<'transactions', { digest: string } | null>
			>({
				query: `subscription ($filter: TransactionFilter, $after: String) {
					transactions(filter: $filter, after: $after) { cursor node { digest } }
				}`,
				variables: { filter: { sentAddress: from.address }, after: firstEdge.cursor },
				signal: signal(),
			});
			// A backfilling filtered subscription also sends progress edges, whose node is null.
			const nextDigest = async () => {
				while (true) {
					const { value, done } = await subscription.next();
					if (done) throw new Error('Subscription ended');
					expect(value.errors).toBeUndefined();
					const node = value.data?.transactions.node;
					if (node) return node.digest;
				}
			};
			expect(await nextDigest()).toBe(second.digest);
			const third = await emitEvents(from, 1);
			expect(await nextDigest()).toBe(third.digest);
			await subscription.return(undefined);
		});

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

	describe('GraphQL history limits', () => {
		// Covered by unit tests: localnet never prunes.
		it.skip('reports a descending read to genesis on a pruned server as HistoryUnavailable', () => {});
	});
});
