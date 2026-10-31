// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import {
	publishPackage,
	setup,
	TestToolbox,
	createTestWithAllClients,
	getRandomAddresses,
} from '../../utils/setup.js';
import type { ClientKind } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import type { SuiClientTypes } from '../../../../src/client/index.js';
import { Ed25519Keypair } from '../../../../src/keypairs/ed25519/index.js';

const EXCLUDE: ClientKind[] = [];

/**
 * Asserts that a page reaching the end of a window ends the read. gRPC reports no next page.
 * GraphQL treats cursors as inclusive bounds, so it can report a next page, which must be empty.
 * A transaction or event window can take one more empty page to end; `strict` allows only one
 * (checkpoint windows).
 */
async function expectWindowEnd(
	kind: ClientKind,
	page: { hasNextPage: boolean; endCursor: string | null },
	fetchNext: (
		cursor: string | null,
	) => Promise<{ items: unknown[]; hasNextPage: boolean; endCursor: string | null }>,
	{ strict = false } = {},
) {
	if (kind === 'grpc') {
		expect(page.hasNextPage).toBe(false);
		return;
	}
	if (!page.hasNextPage) return;
	let next = await fetchNext(page.endCursor);
	expect(next.items).toEqual([]);
	if (next.hasNextPage && !strict) next = await fetchNext(next.endCursor);
	expect({ items: next.items, hasNextPage: next.hasNextPage }).toEqual({
		items: [],
		hasNextPage: false,
	});
}

describe('Core API - Queries', () => {
	let toolbox: TestToolbox;
	let senderAddress: string;
	let senderKeypair: Awaited<ReturnType<TestToolbox['getSigner']>>['keypair'];
	let packageId: string;
	let digests: string[];

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	function stripCursors<T extends { startCursor: string | null; endCursor: string | null }>(
		result: T,
	) {
		return {
			...result,
			startCursor: result.startCursor === null ? null : '<cursor>',
			endCursor: result.endCursor === null ? null : '<cursor>',
		};
	}

	beforeAll(async () => {
		toolbox = await setup();

		// Publish a fresh copy of the test package so package-scoped filters only
		// match this file's transactions, keeping results deterministic while other
		// test files execute transactions against the same localnet
		const published = await publishPackage('shared/test_data', toolbox);
		packageId = published.packageId;
		await toolbox.waitForTransaction({ digest: published.publishTxn.digest });

		const { keypair, address } = await toolbox.getSigner({ coins: [1_000_000_000n] });
		senderAddress = address;
		senderKeypair = keypair;

		digests = [];
		for (let i = 0; i < 3; i++) {
			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [tx.pure.u64(i)],
			});

			const result = await toolbox.signAndExecuteTransaction({
				transaction: tx,
				signer: keypair,
				include: { effects: true },
			});

			if (result.$kind !== 'Transaction') {
				throw new Error(
					`Setup tx failed: ${result.FailedTransaction.status.error?.message ?? 'unknown error'}`,
				);
			}

			digests.push(result.Transaction.digest);
		}
	});

	describe('listTransactions', () => {
		it('all clients return same data: no filter', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.listTransactions({ limit: 3 }),
				stripCursors,
				{ exclude: EXCLUDE },
			);
		});

		it('all clients return same data: filter by sender with all includes', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) =>
					client.core.listTransactions({
						filter: { sender: senderAddress },
						limit: 10,
						include: {
							transaction: true,
							effects: true,
							events: true,
							balanceChanges: true,
							objectTypes: true,
						},
					}),
				stripCursors,
				{ exclude: EXCLUDE },
			);
		});

		it('all clients return same data: filter by function at each specificity', async () => {
			for (const fn of [
				packageId,
				`${packageId}::test_objects`,
				`${packageId}::test_objects::create_object_with_event`,
			]) {
				await toolbox.expectAllClientsReturnSameData(
					(client) => client.core.listTransactions({ filter: { function: fn }, limit: 10 }),
					stripCursors,
					{ exclude: EXCLUDE },
				);
			}

			// Fully qualified function filters also support pagination bounds
			await toolbox.expectAllClientsReturnSameData(
				async (client) => {
					const fn = `${packageId}::test_objects::create_object_with_event`;
					const page = await client.core.listTransactions({ filter: { function: fn }, limit: 3 });
					return client.core.listTransactions({
						filter: { function: fn },
						before: page.endCursor,
					});
				},
				stripCursors,
				{ exclude: EXCLUDE },
			);
		});

		it('all clients return same data: descending order and pagination', async () => {
			await toolbox.expectAllClientsReturnSameData(
				async (client) => {
					const firstPage = await client.core.listTransactions({
						filter: { sender: senderAddress },
						limit: 2,
						order: 'descending',
					});
					const secondPage = await client.core.listTransactions({
						filter: { sender: senderAddress },
						limit: 2,
						before: firstPage.endCursor,
					});
					return { firstPage: stripCursors(firstPage), secondPage: stripCursors(secondPage) };
				},
				undefined,
				{ exclude: EXCLUDE },
			);
		});

		testWithAllClients(
			'should list transactions filtered by sender',
			async (client) => {
				const result = await client.core.listTransactions({
					filter: { sender: senderAddress },
					include: { events: true },
				});

				expect(result.transactions.map((tx) => tx.Transaction?.digest)).toEqual(digests);
				expect(result.hasNextPage).toBe(false);
				expect(result.transactions[0].Transaction?.events?.length).toBeGreaterThan(0);
			},
			{ skip: EXCLUDE },
		);

		testWithAllClients(
			'should paginate transactions',
			async (client) => {
				const firstPage = await client.core.listTransactions({
					filter: { sender: senderAddress },
					limit: 2,
				});

				expect(firstPage.transactions.map((tx) => tx.Transaction?.digest)).toEqual(
					digests.slice(0, 2),
				);
				expect(firstPage.hasNextPage).toBe(true);

				const secondPage = await client.core.listTransactions({
					filter: { sender: senderAddress },
					limit: 2,
					after: firstPage.endCursor,
				});

				expect(secondPage.transactions.map((tx) => tx.Transaction?.digest)).toEqual(
					digests.slice(2),
				);
			},
			{ skip: EXCLUDE },
		);

		testWithAllClients(
			'should list transactions in descending order',
			async (client) => {
				const result = await client.core.listTransactions({
					filter: { sender: senderAddress },
					order: 'descending',
				});

				expect(result.transactions.map((tx) => tx.Transaction?.digest)).toEqual(
					[...digests].reverse(),
				);
			},
			{ skip: EXCLUDE },
		);

		it('all clients return same data: polling for new transactions', async () => {
			const clients = (
				[
					['grpc', toolbox.grpcClient],
					['graphql', toolbox.graphqlClient],
				] as const
			).filter(([kind]) => !EXCLUDE.includes(kind));

			// Anchor at the most recent transaction from the sender on every client
			const anchors = await Promise.all(
				clients.map(([, client]) =>
					client.core.listTransactions({
						filter: { sender: senderAddress },
						order: 'descending',
						limit: 1,
					}),
				),
			);

			// Execute a new transaction after the anchors were established
			const tx = new Transaction();
			const [coin] = tx.splitCoins(tx.gas, [1n]);
			tx.transferObjects([coin], senderAddress);
			const result = await toolbox.signAndExecuteTransaction({
				transaction: tx,
				signer: senderKeypair,
			});

			// Polling after each anchor's startCursor returns exactly the new transaction
			const polls = await Promise.all(
				clients.map(([, client], index) =>
					client.core.listTransactions({
						filter: { sender: senderAddress },
						after: anchors[index].startCursor,
					}),
				),
			);

			for (const poll of polls) {
				expect(poll.transactions.map((transaction) => transaction.Transaction?.digest)).toEqual([
					result.Transaction?.digest,
				]);
				expect(poll.hasNextPage).toBe(false);
			}
		});

		testWithAllClients('should reject invalid checkpoint ranges', async (client) => {
			await expect(
				client.core.listTransactions({ startCheckpoint: 5, endCheckpoint: 4 }),
			).rejects.toThrow('`endCheckpoint` must be greater than or equal to `startCheckpoint`');
			await expect(
				client.core.listEvents({ startCheckpoint: 5, endCheckpoint: 4 }),
			).rejects.toThrow('`endCheckpoint` must be greater than or equal to `startCheckpoint`');
			await expect(client.core.listTransactions({ startCheckpoint: -1 })).rejects.toThrow(
				'Invalid startCheckpoint "-1": expected a non-negative integer',
			);
		});

		testWithAllClients('should reject conflicting filter predicates', async (client) => {
			await expect(
				client.core.listTransactions({
					filter: {
						function: `${packageId}::test_objects`,
						affectedAddress: senderAddress,
					} as never,
				}),
			).rejects.toThrow(
				'A transaction filter may specify at most one of affectedAddress, affectedObject, function',
			);
		});

		testWithAllClients('should reject invalid function filters', async (client) => {
			await expect(
				client.core.listTransactions({ filter: { function: '0x2::a::b::c' } }),
			).rejects.toThrow('Invalid function filter');
		});

		testWithAllClients(
			'should return empty pages with null cursors',
			async (client) => {
				const [emptyAddress] = getRandomAddresses(1);

				expect(await client.core.listTransactions({ filter: { sender: emptyAddress } })).toEqual({
					transactions: [],
					hasNextPage: false,
					startCursor: null,
					endCursor: null,
				});

				expect(await client.core.listEvents({ filter: { sender: emptyAddress } })).toEqual({
					events: [],
					hasNextPage: false,
					startCursor: null,
					endCursor: null,
				});
			},
			{ skip: EXCLUDE },
		);
	});

	describe('listEvents', () => {
		it('all clients return same data: no filter', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.listEvents({ limit: 5 }),
				stripCursors,
				{ exclude: EXCLUDE },
			);
		});

		it('all clients return same data: each filter predicate', async () => {
			const filters: SuiClientTypes.EventFilter[] = [
				{ sender: senderAddress },
				{ emitModule: `${packageId}::test_objects` },
				{ eventType: `${packageId}::test_objects` },
				{ eventType: `${packageId}::test_objects::ObjectCreated` },
			];

			for (const filter of filters) {
				await toolbox.expectAllClientsReturnSameData(
					(client) => client.core.listEvents({ filter, limit: 10 }),
					stripCursors,
					{ exclude: EXCLUDE },
				);
			}
		});

		it('all clients return same data: descending order and pagination', async () => {
			await toolbox.expectAllClientsReturnSameData(
				async (client) => {
					const firstPage = await client.core.listEvents({
						filter: { sender: senderAddress },
						limit: 2,
						order: 'descending',
					});
					const secondPage = await client.core.listEvents({
						filter: { sender: senderAddress },
						limit: 2,
						before: firstPage.endCursor,
					});
					return {
						firstPage: stripCursors(firstPage),
						secondPage: stripCursors(secondPage),
					};
				},
				undefined,
				{ exclude: EXCLUDE },
			);
		});

		it('all clients return same data: event checkpoints', async () => {
			await toolbox.expectAllClientsReturnSameData(
				async (client) => {
					const result = await client.core.listEvents({
						filter: { sender: senderAddress },
						limit: 10,
					});
					return result.events.map((event) => event.checkpoint);
				},
				undefined,
				{ exclude: EXCLUDE },
			);

			// Every event reports the checkpoint of the transaction that emitted it
			const { events } = await toolbox.grpcClient.core.listEvents({
				filter: { sender: senderAddress },
			});
			expect(events.length).toBeGreaterThan(0);
			for (const event of events) {
				const { Transaction } = await toolbox.grpcClient.core.getTransaction({
					digest: event.transactionDigest,
				});
				expect(event.checkpoint).toBe(Transaction?.checkpoint);
			}
		});

		testWithAllClients(
			'should list events with ledger positions',
			async (client) => {
				const result = await client.core.listEvents({
					filter: { eventType: `${packageId}::test_objects::ObjectCreated` },
				});

				expect(result.events.length).toBe(digests.length);
				expect(result.events.map((event) => event.transactionDigest)).toEqual(digests);

				for (const event of result.events) {
					expect(event.packageId).toBe(packageId);
					expect(event.module).toBe('test_objects');
					expect(event.sender).toBe(senderAddress);
					expect(event.eventType).toBe(`${packageId}::test_objects::ObjectCreated`);
					expect(event.bcs).toBeInstanceOf(Uint8Array);
					expect(event.eventIndex).toBe(0);

					expect(event.checkpoint).toMatch(/^\d+$/);
				}
			},
			{ skip: EXCLUDE },
		);

		testWithAllClients(
			'should paginate events in descending order',
			async (client) => {
				const firstPage = await client.core.listEvents({
					filter: { sender: senderAddress },
					limit: 2,
					order: 'descending',
				});

				expect(firstPage.events.map((event) => event.transactionDigest)).toEqual(
					[...digests].reverse().slice(0, 2),
				);
				expect(firstPage.hasNextPage).toBe(true);

				const secondPage = await client.core.listEvents({
					filter: { sender: senderAddress },
					limit: 2,
					before: firstPage.endCursor,
				});

				expect(secondPage.events.map((event) => event.transactionDigest)).toEqual(
					[...digests].reverse().slice(2),
				);
			},
			{ skip: EXCLUDE },
		);

		testWithAllClients(
			'should paginate events in ascending order',
			async (client) => {
				const firstPage = await client.core.listEvents({
					filter: { sender: senderAddress },
					limit: 2,
				});

				expect(firstPage.events.map((event) => event.transactionDigest)).toEqual(
					digests.slice(0, 2),
				);
				expect(firstPage.hasNextPage).toBe(true);

				const secondPage = await client.core.listEvents({
					filter: { sender: senderAddress },
					limit: 2,
					after: firstPage.endCursor,
				});

				expect(secondPage.events.map((event) => event.transactionDigest)).toEqual(digests.slice(2));
			},
			{ skip: EXCLUDE },
		);

		it('all clients return same data: eventIndex for multi-event transactions', async () => {
			const { keypair, address } = await toolbox.getSigner({ coins: [1_000_000_000n] });

			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [tx.pure.u64(1)],
			});
			tx.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [tx.pure.u64(2)],
			});
			const result = await toolbox.signAndExecuteTransaction({
				transaction: tx,
				signer: keypair,
			});

			if (result.$kind !== 'Transaction') {
				throw new Error(
					`Setup tx failed: ${result.FailedTransaction.status.error?.message ?? 'unknown error'}`,
				);
			}

			await toolbox.expectAllClientsReturnSameData(
				async (client) => {
					const page = await client.core.listEvents({ filter: { sender: address } });
					return page.events.map((event) => ({
						transactionDigest: event.transactionDigest,
						eventIndex: event.eventIndex,
					}));
				},
				undefined,
				{ exclude: EXCLUDE },
			);

			const { events } = await toolbox.graphqlClient.core.listEvents({
				filter: { sender: address },
			});
			expect(events.map((event) => event.eventIndex)).toEqual([0, 1]);
		});

		testWithAllClients(
			'should reject malformed cursors',
			async (client) => {
				await expect(
					client.core.listEvents({ filter: { sender: senderAddress }, after: 'not-a-cursor!' }),
				).rejects.toThrow();
			},
			{ skip: EXCLUDE },
		);

		testWithAllClients('should reject malformed event filters', async (client) => {
			await expect(client.core.listEvents({ filter: { emitModule: '0x2::' } })).rejects.toThrow(
				'Invalid emitModule filter',
			);
			await expect(client.core.listEvents({ filter: { eventType: '0x2::' } })).rejects.toThrow(
				'Invalid eventType filter',
			);
			await expect(
				client.core.listEvents({
					filter: { emitModule: packageId, eventType: packageId } as never,
				}),
			).rejects.toThrow('An event filter may specify at most one of emitModule, eventType');
		});
	});

	// Runs last: these transactions call the same package as the setup transactions above, so
	// creating them earlier would change the results the package-scoped tests expect.
	describe('filters, checkpoint ranges, and windows', () => {
		type ClientWithCore = Parameters<
			Parameters<TestToolbox['expectAllClientsReturnSameData']>[0]
		>[0];

		let actorKeypair: Ed25519Keypair;
		let actorAddress: string;
		let recipientAddress: string;
		let objectId: string;
		/** Every transaction sent by the actor, in execution order. */
		let actorDigests: string[];
		let objectDigests: string[];
		let transferDigest: string;
		let genericDigests: string[];
		let abortedDigest: string;
		const checkpoints = new Map<string, bigint>();

		function digestsOf(result: SuiClientTypes.ListTransactionsResponse) {
			return result.transactions.map(
				(tx) => (tx.Transaction ?? tx.FailedTransaction)?.digest ?? null,
			);
		}

		async function recordCheckpoint(digest: string) {
			await toolbox.waitForTransaction({ digest });
			const result = await toolbox.grpcClient.core.getTransaction({ digest });
			const checkpoint = (result.Transaction ?? result.FailedTransaction)?.checkpoint;
			if (checkpoint == null) {
				throw new Error(`Transaction ${digest} has no checkpoint`);
			}
			checkpoints.set(digest, BigInt(checkpoint));
		}

		async function run(tx: Transaction) {
			const result = await toolbox.signAndExecuteTransaction({
				transaction: tx,
				signer: actorKeypair,
				include: { effects: true, objectTypes: true },
			});

			if (result.$kind !== 'Transaction') {
				throw new Error(
					`Setup tx failed: ${result.FailedTransaction.status.error?.message ?? 'unknown error'}`,
				);
			}

			actorDigests.push(result.Transaction.digest);
			await recordCheckpoint(result.Transaction.digest);
			return result.Transaction;
		}

		/** Builds a transaction with explicit gas so it can be executed without a dry run. */
		async function buildWithoutSimulation(
			tx: Transaction,
			sender: string,
			gasOwner: { address: string },
		) {
			const coins = await toolbox.grpcClient.core.listCoins({ owner: gasOwner.address });
			tx.setSender(sender);
			tx.setGasOwner(gasOwner.address);
			tx.setGasBudget(50_000_000);
			tx.setGasPrice(
				await toolbox.grpcClient.core.getReferenceGasPrice().then((r) => r.referenceGasPrice),
			);
			tx.setGasPayment([
				{
					objectId: coins.objects[0].objectId,
					version: coins.objects[0].version,
					digest: coins.objects[0].digest,
				},
			]);
			return tx.build({});
		}

		/** Returns the cursor for the next page, failing if it is missing or repeats an earlier one. */
		function nextCursor(page: { endCursor: string | null }, seen: Set<string>) {
			expect(page.endCursor).not.toBeNull();
			expect(seen).not.toContain(page.endCursor);
			seen.add(page.endCursor!);
			return page.endCursor!;
		}

		/** Pages through a query to the end, returning every item's transaction digest. */
		async function collectTransactions(
			client: ClientWithCore,
			options: SuiClientTypes.ListTransactionsOptions,
		) {
			const order =
				options.order ??
				(options.before != null && options.after == null ? 'descending' : 'ascending');
			let after = options.after;
			let before = options.before;
			const digests: (string | null)[] = [];
			const seen = new Set<string>();
			for (;;) {
				const page = await client.core.listTransactions({ ...options, after, before, order });
				digests.push(...digestsOf(page));
				if (!page.hasNextPage) return digests;
				// Keep the fixed bound and move the other one
				if (order === 'ascending') after = nextCursor(page, seen);
				else before = nextCursor(page, seen);
			}
		}

		async function collectEvents(
			client: ClientWithCore,
			options: SuiClientTypes.ListEventsOptions,
		) {
			const order =
				options.order ??
				(options.before != null && options.after == null ? 'descending' : 'ascending');
			let after = options.after;
			let before = options.before;
			const events: { transactionDigest: string; eventIndex: number; eventType: string }[] = [];
			const seen = new Set<string>();
			for (;;) {
				const page = await client.core.listEvents({ ...options, after, before, order });
				events.push(
					...page.events.map(({ transactionDigest, eventIndex, eventType }) => ({
						transactionDigest,
						eventIndex,
						eventType,
					})),
				);
				if (!page.hasNextPage) return events;
				if (order === 'ascending') after = nextCursor(page, seen);
				else before = nextCursor(page, seen);
			}
		}

		/** The startCursor of every item of the actor's transactions, collected one item per page. */
		async function actorCursors(client: ClientWithCore) {
			const cursors: string[] = [];
			let after: string | null = null;
			const seen = new Set<string>();
			for (;;) {
				const page: SuiClientTypes.ListTransactionsResponse = await client.core.listTransactions({
					filter: { sender: actorAddress },
					limit: 1,
					after,
				});
				if (page.transactions.length) cursors.push(page.startCursor!);
				if (!page.hasNextPage) return cursors;
				after = nextCursor(page, seen);
			}
		}

		beforeAll(async () => {
			({ keypair: actorKeypair, address: actorAddress } = await toolbox.getSigner({
				coins: [1_000_000_000n],
			}));
			[recipientAddress] = getRandomAddresses(1);
			actorDigests = [];

			// Create, update, and delete an object, so it is affected by exactly three transactions
			const create = new Transaction();
			create.transferObjects(
				[
					create.moveCall({
						target: `${packageId}::test_objects::create_simple_object`,
						arguments: [create.pure.u64(1)],
					}),
				],
				actorAddress,
			);
			const created = await run(create);
			objectId = created.effects.changedObjects.find(
				(change) =>
					change.idOperation === 'Created' &&
					created.objectTypes[change.objectId]?.endsWith('::test_objects::SimpleObject'),
			)!.objectId;

			const update = new Transaction();
			update.moveCall({
				target: `${packageId}::test_objects::update_value`,
				arguments: [update.object(objectId), update.pure.u64(2)],
			});
			await run(update);

			const remove = new Transaction();
			remove.moveCall({
				target: `${packageId}::test_objects::delete_simple_object`,
				arguments: [remove.object(objectId)],
			});
			await run(remove);
			objectDigests = [...actorDigests];

			// Emit two instantiations of the same generic event
			genericDigests = [];
			for (const typeArgument of ['u8', 'u64']) {
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::emit_generic`,
					typeArguments: [typeArgument],
					arguments: [tx.pure.u64(7)],
				});
				genericDigests.push((await run(tx)).digest);
			}

			// Send funds to an address that has never been used
			const transfer = new Transaction();
			transfer.transferObjects([transfer.splitCoins(transfer.gas, [1])], recipientAddress);
			transferDigest = (await run(transfer)).digest;

			// Execute an aborting call directly, skipping the dry run that would reject it
			const aborting = new Transaction();
			aborting.moveCall({ target: `${packageId}::test_objects::abort_always` });
			const bytes = await buildWithoutSimulation(aborting, actorAddress, {
				address: actorAddress,
			});
			const { signature } = await actorKeypair.signTransaction(bytes);
			const aborted = await toolbox.grpcClient.core.executeTransaction({
				transaction: bytes,
				signatures: [signature],
			});
			if (aborted.$kind !== 'FailedTransaction') {
				throw new Error('Expected abort_always to fail');
			}
			abortedDigest = aborted.FailedTransaction.digest;
			actorDigests.push(abortedDigest);
			await recordCheckpoint(abortedDigest);
		});

		describe('affectedAddress and affectedObject', () => {
			it('all clients return same data: affectedAddress', async () => {
				for (const affectedAddress of [recipientAddress, actorAddress]) {
					await toolbox.expectAllClientsReturnSameData(
						(client) => client.core.listTransactions({ filter: { affectedAddress } }),
						stripCursors,
						{ exclude: EXCLUDE, attempts: 3 },
					);
				}
			});

			testWithAllClients(
				'should list transactions affecting an address',
				async (client) => {
					const recipient = await client.core.listTransactions({
						filter: { affectedAddress: recipientAddress },
					});
					expect(digestsOf(recipient)).toEqual([transferDigest]);

					const actor = await collectTransactions(client, {
						filter: { affectedAddress: actorAddress },
					});
					expect(actor).toEqual(expect.arrayContaining(actorDigests));
				},
				{ skip: EXCLUDE },
			);

			it('all clients return same data: affectedAddress for the sponsor, not the signer, of a sponsored transaction', async () => {
				const sponsor = await toolbox.getSigner({ coins: [1_000_000_000n] });
				const sender = new Ed25519Keypair();
				const senderAddress = sender.toSuiAddress();

				// The sender owns nothing the transaction touches, so `affectedAddress` doesn't match it;
				// `sender` does. The sponsor matches because its gas coin changed.
				const tx = new Transaction();
				tx.moveCall({ target: '0x2::tx_context::sender' });
				const bytes = await buildWithoutSimulation(tx, senderAddress, sponsor);
				const result = await toolbox.grpcClient.core.executeTransaction({
					transaction: bytes,
					signatures: [
						(await sender.signTransaction(bytes)).signature,
						(await sponsor.keypair.signTransaction(bytes)).signature,
					],
				});
				if (result.$kind !== 'Transaction') {
					throw new Error('Sponsored transaction failed');
				}
				const digest = result.Transaction.digest;
				await toolbox.waitForTransaction({ digest });

				const affectingSender = (client: ClientWithCore) =>
					client.core.listTransactions({ filter: { affectedAddress: senderAddress } });
				const sentBy = (client: ClientWithCore) =>
					client.core.listTransactions({ filter: { sender: senderAddress } });
				const sponsoredBy = (client: ClientWithCore) =>
					client.core.listTransactions({
						filter: { affectedAddress: sponsor.address },
						order: 'descending',
						limit: 1,
					});

				for (const client of [toolbox.grpcClient, toolbox.graphqlClient]) {
					// The sponsor's match shows this client's index has the transaction.
					expect(digestsOf(await sponsoredBy(client))).toEqual([digest]);
					expect(digestsOf(await affectingSender(client))).toEqual([]);
					expect(digestsOf(await sentBy(client))).toEqual([digest]);
				}
				await toolbox.expectAllClientsReturnSameData(affectingSender, stripCursors, {
					exclude: EXCLUDE,
					attempts: 3,
				});
				await toolbox.expectAllClientsReturnSameData(sentBy, stripCursors, {
					exclude: EXCLUDE,
					attempts: 3,
				});
				await toolbox.expectAllClientsReturnSameData(sponsoredBy, stripCursors, {
					exclude: EXCLUDE,
					attempts: 3,
				});

				// Streams read history the same way.
				const { Transaction: executed } = await toolbox.grpcClient.core.getTransaction({ digest });
				const checkpoint = BigInt(executed!.checkpoint!);
				const streamed = async (
					client: ClientWithCore,
					filter: SuiClientTypes.TransactionFilter,
				) => {
					const digests: string[] = [];
					for await (const frame of client.core.streamTransactions({
						filter,
						start: { checkpoint: checkpoint.toString() },
						end: { checkpoint: (checkpoint + 1n).toString() },
					})) {
						const tx = frame.transaction.Transaction ?? frame.transaction.FailedTransaction;
						digests.push(tx.digest);
					}
					return digests;
				};
				for (const client of [toolbox.grpcClient, toolbox.graphqlClient]) {
					expect(await streamed(client, { affectedAddress: sponsor.address })).toEqual([digest]);
					expect(await streamed(client, { affectedAddress: senderAddress })).toEqual([]);
					expect(await streamed(client, { sender: senderAddress })).toEqual([digest]);
				}
			});

			it('all clients return same data: affectedObject', async () => {
				await toolbox.expectAllClientsReturnSameData(
					(client) => client.core.listTransactions({ filter: { affectedObject: objectId } }),
					stripCursors,
					{ exclude: EXCLUDE, attempts: 3 },
				);
			});

			testWithAllClients(
				'should list transactions affecting an object',
				async (client) => {
					const result = await client.core.listTransactions({
						filter: { affectedObject: objectId },
					});
					expect(digestsOf(result)).toEqual(objectDigests);
					expect(result.hasNextPage).toBe(false);
				},
				{ skip: EXCLUDE },
			);
		});

		describe('combined predicates', () => {
			it('all clients return same data: ANDed transaction predicates', async () => {
				const [stranger] = getRandomAddresses(1);
				const filters: SuiClientTypes.TransactionFilter[] = [
					{ sender: actorAddress, function: packageId },
					{ sender: stranger, function: packageId },
					{ sender: actorAddress, affectedObject: objectId },
					{ sender: actorAddress, affectedAddress: recipientAddress },
				];

				for (const filter of filters) {
					await toolbox.expectAllClientsReturnSameData(
						(client) => client.core.listTransactions({ filter }),
						stripCursors,
						{ exclude: EXCLUDE, attempts: 3 },
					);
				}
			});

			testWithAllClients(
				'should AND transaction predicates',
				async (client) => {
					const [stranger] = getRandomAddresses(1);

					expect(
						digestsOf(
							await client.core.listTransactions({
								filter: { sender: actorAddress, function: `${packageId}::test_objects` },
							}),
						),
					).toEqual(actorDigests.filter((digest) => digest !== transferDigest));
					expect(
						digestsOf(
							await client.core.listTransactions({
								filter: { sender: stranger, function: packageId },
							}),
						),
					).toEqual([]);
					expect(
						digestsOf(
							await client.core.listTransactions({
								filter: { sender: actorAddress, affectedAddress: recipientAddress },
							}),
						),
					).toEqual([transferDigest]);
				},
				{ skip: EXCLUDE },
			);

			it('all clients return same data: ANDed event predicates', async () => {
				const filters: SuiClientTypes.EventFilter[] = [
					{ sender: actorAddress, eventType: `${packageId}::test_objects::GenericEvent` },
					{ sender: actorAddress, emitModule: packageId },
					{ sender: senderAddress, eventType: `${packageId}::test_objects::GenericEvent` },
				];

				for (const filter of filters) {
					await toolbox.expectAllClientsReturnSameData(
						(client) => client.core.listEvents({ filter }),
						stripCursors,
						{ exclude: EXCLUDE, attempts: 3 },
					);
				}
			});
		});

		describe('package-only prefixes and generic event types', () => {
			it('all clients return same data: package and generic event filters', async () => {
				const filters: SuiClientTypes.EventFilter[] = [
					{ emitModule: packageId },
					{ eventType: packageId },
					{ eventType: `${packageId}::test_objects::GenericEvent` },
					{ eventType: `${packageId}::test_objects::GenericEvent<u8>` },
				];

				for (const filter of filters) {
					await toolbox.expectAllClientsReturnSameData(
						(client) => client.core.listEvents({ filter }),
						stripCursors,
						{ exclude: EXCLUDE, attempts: 3 },
					);
				}
			});

			testWithAllClients(
				'should match generic event types by name or exact instantiation',
				async (client) => {
					const any = await client.core.listEvents({
						filter: { eventType: `${packageId}::test_objects::GenericEvent` },
					});
					expect(any.events.map((event) => event.eventType)).toEqual([
						`${packageId}::test_objects::GenericEvent<u8>`,
						`${packageId}::test_objects::GenericEvent<u64>`,
					]);
					expect(any.events.map((event) => event.transactionDigest)).toEqual(genericDigests);

					const exact = await client.core.listEvents({
						filter: { eventType: `${packageId}::test_objects::GenericEvent<u8>` },
					});
					expect(exact.events.map((event) => event.transactionDigest)).toEqual([genericDigests[0]]);
				},
				{ skip: EXCLUDE },
			);

			testWithAllClients(
				'should match package-only event prefixes',
				async (client) => {
					const byModule = await collectEvents(client, { filter: { emitModule: packageId } });
					const byType = await collectEvents(client, { filter: { eventType: packageId } });

					// Every event whose type is defined in the package, ending with this suite's object
					// and generic events
					const typeDigests = byType.map((event) => event.transactionDigest);
					expect(typeDigests).toEqual(expect.arrayContaining(digests));
					expect(typeDigests.slice(-4)).toEqual([...objectDigests.slice(0, 2), ...genericDigests]);
					expect(byType.every((event) => event.eventType.startsWith(`${packageId}::`))).toBe(true);

					// Emitting modules also cover events of other packages' types, such as the
					// `0x2::display` events emitted by the package's initializers on publish
					expect(byModule).toEqual(expect.arrayContaining(byType));
					expect(
						byModule.some((event) =>
							event.eventType.startsWith(
								'0x0000000000000000000000000000000000000000000000000000000000000002::display::',
							),
						),
					).toBe(true);
				},
				{ skip: EXCLUDE },
			);
		});

		describe('partial function filters', () => {
			it('all clients return same data: paginating partial function filters', async () => {
				for (const fn of [packageId, `${packageId}::test_objects`]) {
					for (const order of ['ascending', 'descending'] as const) {
						await toolbox.expectAllClientsReturnSameData(
							(client) =>
								collectTransactions(client, { filter: { function: fn }, order, limit: 1 }),
							undefined,
							{ exclude: EXCLUDE, attempts: 3 },
						);
					}
				}
			});

			testWithAllClients(
				'should paginate partial function filters one item at a time',
				async (client) => {
					const all = digestsOf(
						await client.core.listTransactions({ filter: { function: packageId } }),
					);
					expect(
						await collectTransactions(client, { filter: { function: packageId }, limit: 1 }),
					).toEqual(all);
					expect(
						await collectTransactions(client, {
							filter: { function: `${packageId}::test_objects` },
							limit: 1,
							order: 'descending',
						}),
					).toEqual([...all].reverse());
				},
				{ skip: EXCLUDE },
			);
		});

		describe('aborted transactions', () => {
			it('all clients return same data: function filters match aborted calls', async () => {
				await toolbox.expectAllClientsReturnSameData(
					(client) =>
						client.core.listTransactions({
							filter: { function: `${packageId}::test_objects::abort_always` },
						}),
					stripCursors,
					{ exclude: EXCLUDE, attempts: 3 },
				);
			});

			testWithAllClients(
				'should match aborted transactions by function',
				async (client) => {
					const result = await client.core.listTransactions({
						filter: { function: `${packageId}::test_objects::abort_always` },
					});
					expect(result.transactions.map((tx) => tx.$kind)).toEqual(['FailedTransaction']);
					expect(digestsOf(result)).toEqual([abortedDigest]);
				},
				{ skip: EXCLUDE },
			);
		});

		describe('checkpoint ranges', () => {
			function checkpointOf(digest: string) {
				return checkpoints.get(digest)!;
			}

			it('all clients return same data: transaction and event checkpoint ranges', async () => {
				const first = checkpointOf(actorDigests[0]);
				const last = checkpointOf(actorDigests[actorDigests.length - 1]);
				const middle = checkpointOf(actorDigests[1]);

				const ranges: Pick<
					SuiClientTypes.ListTransactionsOptions,
					'startCheckpoint' | 'endCheckpoint' | 'order'
				>[] = [
					{ startCheckpoint: first, endCheckpoint: last + 1n },
					{ startCheckpoint: middle, endCheckpoint: middle + 1n },
					{ startCheckpoint: first, endCheckpoint: last + 1n, order: 'descending' },
					{ startCheckpoint: middle },
					{ endCheckpoint: middle },
					{ startCheckpoint: middle, endCheckpoint: middle },
					{ startCheckpoint: 0, endCheckpoint: last + 1000n },
				];

				for (const range of ranges) {
					await toolbox.expectAllClientsReturnSameData(
						(client) =>
							client.core.listTransactions({ filter: { sender: actorAddress }, ...range }),
						stripCursors,
						{ exclude: EXCLUDE, attempts: 3 },
					);
					await toolbox.expectAllClientsReturnSameData(
						(client) => client.core.listEvents({ filter: { sender: actorAddress }, ...range }),
						stripCursors,
						{ exclude: EXCLUDE, attempts: 3 },
					);
				}
			});

			testWithAllClients(
				'should bound transactions and events by checkpoint',
				async (client) => {
					const first = checkpointOf(actorDigests[0]);
					const last = checkpointOf(actorDigests[actorDigests.length - 1]);
					const middle = checkpointOf(actorDigests[1]);
					const filter = { sender: actorAddress };

					const all = await client.core.listTransactions({
						filter,
						startCheckpoint: first,
						endCheckpoint: last + 1n,
					});
					expect(digestsOf(all)).toEqual(actorDigests);
					expect(all.hasNextPage).toBe(false);

					const single = await client.core.listTransactions({
						filter,
						startCheckpoint: middle.toString(),
						endCheckpoint: Number(middle + 1n),
					});
					expect(digestsOf(single)).toEqual(
						actorDigests.filter((digest) => checkpointOf(digest) === middle),
					);

					const descending = await client.core.listTransactions({
						filter,
						startCheckpoint: first,
						endCheckpoint: last + 1n,
						order: 'descending',
					});
					expect(digestsOf(descending)).toEqual([...actorDigests].reverse());

					expect(
						await client.core.listTransactions({
							filter,
							startCheckpoint: middle,
							endCheckpoint: middle,
						}),
					).toEqual({ transactions: [], hasNextPage: false, startCursor: null, endCursor: null });

					// Bounds past the ledger tip still end the query
					const pastTip = await client.core.listTransactions({
						filter,
						endCheckpoint: last + 1000n,
					});
					expect(digestsOf(pastTip)).toEqual(actorDigests);
					expect(pastTip.hasNextPage).toBe(false);

					// Events report checkpoints inside the requested range
					const events = await client.core.listEvents({
						filter,
						startCheckpoint: middle,
						endCheckpoint: middle + 1n,
					});
					for (const event of events.events) {
						expect(event.checkpoint).toBe(middle.toString());
						expect(event.checkpoint).toBe(checkpointOf(event.transactionDigest).toString());
					}
				},
				{ skip: EXCLUDE },
			);

			it('all clients return same data: paging within a checkpoint range', async () => {
				const range = {
					startCheckpoint: checkpointOf(actorDigests[1]),
					endCheckpoint: checkpointOf(actorDigests[actorDigests.length - 2]) + 1n,
				};

				for (const order of ['ascending', 'descending'] as const) {
					await toolbox.expectAllClientsReturnSameData(
						async (client) => ({
							transactions: await collectTransactions(client, {
								filter: { sender: actorAddress },
								...range,
								order,
								limit: 1,
							}),
							events: await collectEvents(client, {
								filter: { sender: actorAddress },
								...range,
								order,
								limit: 1,
							}),
						}),
						undefined,
						{ exclude: EXCLUDE, attempts: 3 },
					);
				}
			});

			testWithAllClients(
				'should page within a checkpoint range',
				async (client) => {
					const expected = actorDigests.slice(1, -1);
					const range = {
						startCheckpoint: checkpointOf(expected[0]),
						endCheckpoint: checkpointOf(expected[expected.length - 1]) + 1n,
					};

					expect(
						await collectTransactions(client, {
							filter: { sender: actorAddress },
							...range,
							limit: 1,
						}),
					).toEqual(expected);
					expect(
						await collectTransactions(client, {
							filter: { sender: actorAddress },
							...range,
							order: 'descending',
							limit: 2,
						}),
					).toEqual([...expected].reverse());
				},
				{ skip: EXCLUDE },
			);
		});

		describe('pagination windows', () => {
			it('all clients return same data: windows and reversed bounds', async () => {
				await toolbox.expectAllClientsReturnSameData(
					async (client) => {
						const cursors = await actorCursors(client);
						const filter = { sender: actorAddress };
						// Reads that end at a cursor bound, where `hasNextPage` differs by transport
						const bounded: SuiClientTypes.ListTransactionsOptions[] = [
							{ filter, after: cursors[0], before: cursors[3] },
							{ filter, after: cursors[0], before: cursors[3], order: 'descending' },
							{ filter, after: cursors[1], order: 'descending' },
							{ filter, before: cursors[4], order: 'ascending' },
						];
						const empty: SuiClientTypes.ListTransactionsOptions[] = [
							{ filter, after: cursors[3], before: cursors[1] },
							{ filter, after: cursors[2], before: cursors[2] },
						];

						return {
							count: cursors.length,
							bounded: await Promise.all(
								bounded.map(async (query) => {
									const { hasNextPage: _, ...page } = stripCursors(
										await client.core.listTransactions(query),
									);
									return page;
								}),
							),
							// Only the items: GraphQL can report a next page for an empty window (see
							// expectWindowEnd).
							empty: await Promise.all(
								empty.map(
									async (query) => (await client.core.listTransactions(query)).transactions,
								),
							),
							windowed: await collectTransactions(client, {
								filter,
								after: cursors[0],
								before: cursors[cursors.length - 1],
								order: 'descending',
								limit: 1,
							}),
						};
					},
					undefined,
					{ exclude: EXCLUDE, attempts: 3 },
				);
			});

			testWithAllClients(
				'should read windows between two cursors in either order',
				async (client, kind) => {
					const cursors = await actorCursors(client);
					const filter = { sender: actorAddress };
					expect(cursors).toHaveLength(actorDigests.length);

					const window = await client.core.listTransactions({
						filter,
						after: cursors[0],
						before: cursors[3],
					});
					expect(digestsOf(window)).toEqual(actorDigests.slice(1, 3));
					await expectWindowEnd(kind, window, async (cursor) => {
						const next = await client.core.listTransactions({
							filter,
							after: cursor,
							before: cursors[3],
						});
						return {
							items: next.transactions,
							hasNextPage: next.hasNextPage,
							endCursor: next.endCursor,
						};
					});

					const reversed = await client.core.listTransactions({
						filter,
						after: cursors[0],
						before: cursors[3],
						order: 'descending',
					});
					expect(digestsOf(reversed)).toEqual(actorDigests.slice(1, 3).reverse());

					// A lone `after` can be read newest first, and a lone `before` oldest first
					expect(
						digestsOf(
							await client.core.listTransactions({
								filter,
								after: cursors[1],
								order: 'descending',
							}),
						),
					).toEqual(actorDigests.slice(2).reverse());
					expect(
						digestsOf(
							await client.core.listTransactions({
								filter,
								before: cursors[4],
								order: 'ascending',
							}),
						),
					).toEqual(actorDigests.slice(0, 4));

					// Paging a window keeps the fixed bound and moves the other one
					expect(
						await collectTransactions(client, {
							filter,
							after: cursors[0],
							before: cursors[cursors.length - 1],
							order: 'descending',
							limit: 1,
						}),
					).toEqual(actorDigests.slice(1, -1).reverse());

					// Inverted and equal bounds select nothing
					for (const [after, before] of [
						[cursors[3], cursors[1]],
						[cursors[2], cursors[2]],
					]) {
						const page = await client.core.listTransactions({ filter, after, before });
						expect(page.transactions).toEqual([]);
						// GraphQL can report a next page here (see expectWindowEnd).
						if (kind === 'grpc') {
							expect(page).toMatchObject({
								hasNextPage: false,
								startCursor: null,
								endCursor: null,
							});
						}
					}
				},
				{ skip: EXCLUDE },
			);

			testWithAllClients(
				'should read event windows between two cursors',
				async (client) => {
					const filter = { sender: actorAddress };
					const all = await client.core.listEvents({ filter });
					expect(all.events.length).toBeGreaterThanOrEqual(4);

					const first = await client.core.listEvents({ filter, limit: 1 });
					const last = await client.core.listEvents({ filter, limit: 1, order: 'descending' });

					const window = await collectEvents(client, {
						filter,
						after: first.endCursor,
						before: last.endCursor,
						limit: 1,
					});
					expect(window.map((event) => event.transactionDigest)).toEqual(
						all.events.slice(1, -1).map((event) => event.transactionDigest),
					);
				},
				{ skip: EXCLUDE },
			);

			testWithAllClients(
				'should end exhausted windows',
				async (client, kind) => {
					const cursors = await actorCursors(client);
					const filter = { sender: actorAddress };
					const after = cursors[0];
					const before = cursors[3];

					const ascending = await client.core.listTransactions({ filter, after, before });
					expect(digestsOf(ascending)).toEqual(actorDigests.slice(1, 3));
					await expectWindowEnd(kind, ascending, async (cursor) => {
						const next = await client.core.listTransactions({ filter, after: cursor, before });
						return {
							items: next.transactions,
							hasNextPage: next.hasNextPage,
							endCursor: next.endCursor,
						};
					});

					const descending = await client.core.listTransactions({
						filter,
						after,
						before,
						order: 'descending',
					});
					expect(digestsOf(descending)).toEqual(actorDigests.slice(1, 3).reverse());
					await expectWindowEnd(kind, descending, async (cursor) => {
						const next = await client.core.listTransactions({
							filter,
							after,
							before: cursor,
							order: 'descending',
						});
						return {
							items: next.transactions,
							hasNextPage: next.hasNextPage,
							endCursor: next.endCursor,
						};
					});

					const first = await client.core.listEvents({ filter, limit: 1 });
					const last = await client.core.listEvents({ filter, limit: 1, order: 'descending' });
					for (const order of ['ascending', 'descending'] as const) {
						const events = await client.core.listEvents({
							filter,
							after: first.endCursor,
							before: last.endCursor,
							order,
						});
						expect(events.events.length).toBeGreaterThan(0);
						await expectWindowEnd(kind, events, async (cursor) => {
							const next = await client.core.listEvents({
								filter,
								after: order === 'ascending' ? cursor : first.endCursor,
								before: order === 'ascending' ? last.endCursor : cursor,
								order,
							});
							return {
								items: next.events,
								hasNextPage: next.hasNextPage,
								endCursor: next.endCursor,
							};
						});
					}
				},
				{ skip: EXCLUDE },
			);
		});
	});

	describe('listCheckpoints', () => {
		type ClientWithCore = Parameters<
			Parameters<TestToolbox['expectAllClientsReturnSameData']>[0]
		>[0];

		let transaction: SuiClientTypes.Transaction;
		let first: bigint;
		let range: { startCheckpoint: bigint; endCheckpoint: bigint };

		/** Pages through a checkpoint query, keeping the fixed bound and moving the other one. */
		async function collectCheckpointPages(
			client: ClientWithCore,
			options: SuiClientTypes.ListCheckpointsOptions,
		) {
			const order =
				options.order ??
				(options.before != null && options.after == null ? 'descending' : 'ascending');
			let after = options.after;
			let before = options.before;
			const pages: { sequenceNumbers: string[]; hasNextPage: boolean }[] = [];
			for (;;) {
				const page = await client.core.listCheckpoints({ ...options, after, before, order });
				pages.push({
					sequenceNumbers: page.checkpoints.map((checkpoint) => checkpoint.sequenceNumber),
					hasNextPage: page.hasNextPage,
				});
				if (!page.hasNextPage) return pages;
				if (order === 'ascending') after = page.endCursor;
				else before = page.endCursor;
			}
		}

		/**
		 * Pages through a window between two cursors, keeping the fixed bound and moving the other one.
		 * Every page but the last reports a next page, and the last one ends the window as
		 * `expectWindowEnd` describes.
		 */
		async function collectCheckpointWindow(
			client: ClientWithCore,
			kind: ClientKind,
			options: SuiClientTypes.ListCheckpointsOptions,
		) {
			const descending = options.order === 'descending';
			const read = (cursor: string | null) =>
				client.core.listCheckpoints({
					...options,
					after: descending ? options.after : cursor,
					before: descending ? cursor : options.before,
				});
			const pages: {
				sequenceNumbers: string[];
				startCursor: string | null;
				endCursor: string | null;
			}[] = [];
			let page = await client.core.listCheckpoints(options);
			for (;;) {
				pages.push({
					sequenceNumbers: page.checkpoints.map((checkpoint) => checkpoint.sequenceNumber),
					startCursor: page.startCursor,
					endCursor: page.endCursor,
				});
				if (!page.hasNextPage) return pages;
				const next = await read(page.endCursor);
				if (!next.checkpoints.length) {
					await expectWindowEnd(
						kind,
						page,
						async () => ({
							items: next.checkpoints,
							hasNextPage: next.hasNextPage,
							endCursor: next.endCursor,
						}),
						{ strict: true },
					);
					return pages;
				}
				page = next;
			}
		}

		/** The cursor of a single checkpoint, as both ends of a page holding only that checkpoint. */
		async function cursorOf(client: ClientWithCore, sequenceNumber: bigint) {
			const page = await client.core.listCheckpoints({
				startCheckpoint: sequenceNumber,
				endCheckpoint: sequenceNumber + 1n,
			});
			expect(page.startCursor).toBe(page.endCursor);
			return page.startCursor;
		}

		/** Sequence numbers from `start` to `end` (inclusive) as strings. */
		function sequence(start: bigint, end: bigint) {
			const result: string[] = [];
			for (let n = start; n <= end; n++) result.push(n.toString());
			return result;
		}

		beforeAll(async () => {
			await toolbox.waitForTransaction({ digest: digests[0] });
			const result = await toolbox.grpcClient.core.getTransaction({ digest: digests[0] });
			if (result.$kind !== 'Transaction' || result.Transaction.checkpoint == null) {
				throw new Error(`Transaction ${digests[0]} has no checkpoint`);
			}
			transaction = result.Transaction;
			first = BigInt(transaction.checkpoint!);
			range = { startCheckpoint: first, endCheckpoint: first + 5n };

			// Wait until every transport has indexed the whole range
			for (const client of [toolbox.grpcClient, toolbox.graphqlClient]) {
				for (let attempt = 0; ; attempt++) {
					const last = await client.core.listCheckpoints({
						startCheckpoint: range.endCheckpoint - 1n,
						endCheckpoint: range.endCheckpoint,
					});
					if (last.checkpoints.length) break;
					if (attempt >= 60) throw new Error('Timed out waiting for checkpoints');
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			}
		});

		it('all clients return same data: checkpoint ranges in both orders', async () => {
			for (const order of ['ascending', 'descending'] as const) {
				await toolbox.expectAllClientsReturnSameData(
					(client) => client.core.listCheckpoints({ ...range, order }),
					stripCursors,
					{ exclude: EXCLUDE, attempts: 3 },
				);
			}
		});

		it('all clients return same data: pagination and windows', async () => {
			await toolbox.expectAllClientsReturnSameData(
				async (client, kind) => {
					const oldest = await client.core.listCheckpoints({ ...range, limit: 1 });
					const newest = await client.core.listCheckpoints({
						...range,
						limit: 1,
						order: 'descending',
					});
					const window = { after: oldest.startCursor, before: newest.startCursor };

					return {
						ascending: await collectCheckpointPages(client, { ...range, limit: 2 }),
						descending: await collectCheckpointPages(client, {
							...range,
							limit: 2,
							order: 'descending',
						}),
						windowAscending: (
							await collectCheckpointWindow(client, kind, { ...window, limit: 2 })
						).map(stripCursors),
						windowDescending: (
							await collectCheckpointWindow(client, kind, {
								...window,
								limit: 2,
								order: 'descending',
							})
						).map(stripCursors),
					};
				},
				undefined,
				{ exclude: EXCLUDE, attempts: 3 },
			);
		});

		it('all clients return same data: unbounded from genesis', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.listCheckpoints({ limit: 3 }),
				stripCursors,
				{ exclude: EXCLUDE },
			);
		});

		testWithAllClients(
			'should list checkpoints in a range',
			async (client) => {
				const last = range.endCheckpoint - 1n;

				const ascending = await client.core.listCheckpoints(range);
				expect(ascending.checkpoints.map((checkpoint) => checkpoint.sequenceNumber)).toEqual(
					sequence(first, last),
				);
				expect(ascending.hasNextPage).toBe(false);

				const descending = await client.core.listCheckpoints({ ...range, order: 'descending' });
				expect(descending.checkpoints).toEqual([...ascending.checkpoints].reverse());

				// The checkpoint agrees with the transaction it contains
				expect(ascending.checkpoints[0]).toMatchObject({
					sequenceNumber: transaction.checkpoint,
					epoch: transaction.epoch,
					timestampMs: transaction.timestampMs,
				});
				expect(ascending.checkpoints[0].digest).toBeTruthy();

				const pages = await collectCheckpointPages(client, { ...range, limit: 2 });
				expect(pages).toEqual([
					{ sequenceNumbers: sequence(first, first + 1n), hasNextPage: true },
					{ sequenceNumbers: sequence(first + 2n, first + 3n), hasNextPage: true },
					{ sequenceNumbers: [last.toString()], hasNextPage: false },
				]);

				const genesis = await client.core.listCheckpoints({ limit: 3 });
				expect(genesis.checkpoints.map((checkpoint) => checkpoint.sequenceNumber)).toEqual([
					'0',
					'1',
					'2',
				]);
				expect(genesis.hasNextPage).toBe(true);
			},
			{ skip: EXCLUDE },
		);

		testWithAllClients(
			'should page checkpoint windows in both directions',
			async (client, kind) => {
				const cursors = await Promise.all(
					sequence(first, first + 4n).map((n) => cursorOf(client, BigInt(n))),
				);
				const window = { after: cursors[0], before: cursors[4] };

				expect(await collectCheckpointWindow(client, kind, { ...window, limit: 2 })).toEqual([
					{
						sequenceNumbers: sequence(first + 1n, first + 2n),
						startCursor: cursors[1],
						endCursor: cursors[2],
					},
					{
						sequenceNumbers: [(first + 3n).toString()],
						startCursor: cursors[3],
						endCursor: cursors[3],
					},
				]);
				expect(
					await collectCheckpointWindow(client, kind, { ...window, limit: 2, order: 'descending' }),
				).toEqual([
					{
						sequenceNumbers: [(first + 3n).toString(), (first + 2n).toString()],
						startCursor: cursors[3],
						endCursor: cursors[2],
					},
					{
						sequenceNumbers: [(first + 1n).toString()],
						startCursor: cursors[1],
						endCursor: cursors[1],
					},
				]);
			},
			{ skip: EXCLUDE },
		);

		testWithAllClients(
			'should reject ranges that end before they start',
			async (client) => {
				await expect(
					client.core.listCheckpoints({ startCheckpoint: first, endCheckpoint: first - 1n }),
				).rejects.toThrow('`endCheckpoint` must be greater than or equal to `startCheckpoint`');
			},
			{ skip: EXCLUDE },
		);
	});
});
