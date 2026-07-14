// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import type { SuiClientTypes } from '../../../../src/client/index.js';

// TODO: Set this to [] once SUI_TOOLS_TAG points at an image that serves the
// gRPC ListCheckpoints/ListTransactions/ListEvents RPCs, so these tests cover
// all three transports.
const EXCLUDE: Array<'jsonrpc' | 'grpc' | 'graphql'> = ['grpc'];

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

	function normalizeEvents(result: SuiClientTypes.ListEventsResponse) {
		return {
			...stripCursors(result),
			// JSON-RPC does not expose checkpoint information for queried events
			events: result.events.map((event) => ({ ...event, checkpoint: null })),
		};
	}

	beforeAll(async () => {
		toolbox = await setup();
		packageId = await toolbox.getPackage('test_data');

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
					['jsonrpc', toolbox.jsonRpcClient],
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

		testWithAllClients('should reject conflicting pagination bounds', async (client) => {
			await expect(client.core.listTransactions({ after: 'A', before: 'B' })).rejects.toThrow(
				'Only one of `after` or `before` may be provided',
			);
			await expect(
				client.core.listTransactions({ after: 'A', order: 'descending' }),
			).rejects.toThrow('`after` can not be combined with descending queries');
			await expect(
				client.core.listTransactions({ before: 'B', order: 'ascending' }),
			).rejects.toThrow('`before` can not be combined with ascending queries');
		});

		testWithAllClients('should reject filters with multiple predicates', async (client) => {
			await expect(
				client.core.listTransactions({
					filter: { sender: senderAddress, function: `${packageId}::test_objects` } as never,
				}),
			).rejects.toThrow('exactly one of sender, function');
		});

		testWithAllClients('should reject invalid function filters', async (client) => {
			await expect(
				client.core.listTransactions({ filter: { function: '0x2::a::b::c' } }),
			).rejects.toThrow('Invalid function filter');
		});
	});

	describe('listEvents', () => {
		it('all clients return same data: no filter', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.listEvents({ limit: 5 }),
				normalizeEvents,
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
					normalizeEvents,
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
						firstPage: normalizeEvents(firstPage),
						secondPage: normalizeEvents(secondPage),
					};
				},
				undefined,
				{ exclude: EXCLUDE },
			);
		});

		it('all clients return same data: event checkpoints', async () => {
			// JSON-RPC cannot provide checkpoint information for queried events, so
			// checkpoint parity only applies to the other transports
			await toolbox.expectAllClientsReturnSameData(
				async (client) => {
					const result = await client.core.listEvents({
						filter: { sender: senderAddress },
						limit: 10,
					});
					return result.events.map((event) => event.checkpoint);
				},
				undefined,
				{ exclude: [...EXCLUDE, 'jsonrpc'] },
			);
		});

		testWithAllClients(
			'should list events with ledger positions',
			async (client, kind) => {
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

					if (kind === 'jsonrpc') {
						expect(event.checkpoint).toBeNull();
					} else {
						expect(event.checkpoint).toMatch(/^\d+$/);
					}
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

		testWithAllClients('should reject module-less event filters', async (client) => {
			await expect(client.core.listEvents({ filter: { emitModule: packageId } })).rejects.toThrow(
				'Invalid emitModule filter',
			);
			await expect(client.core.listEvents({ filter: { eventType: packageId } })).rejects.toThrow(
				'Invalid eventType filter',
			);
		});
	});
});
