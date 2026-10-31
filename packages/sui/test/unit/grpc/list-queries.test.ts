// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { toBase64 } from '@mysten/utils';

import { GrpcTypes, SuiGrpcClient } from '../../../src/grpc/index.js';

const { QueryEndReason } = GrpcTypes;

function makeClient() {
	return new SuiGrpcClient({
		baseUrl: 'http://localhost',
		network: 'testnet',
	});
}

function cursor(n: number) {
	return new Uint8Array([n]);
}

function cursorB64(n: number) {
	return toBase64(cursor(n));
}

function txFrame(n: number, end?: GrpcTypes.QueryEndReason): GrpcTypes.ListTransactionsResponse {
	return GrpcTypes.ListTransactionsResponse.create({
		watermark: { cursor: cursor(n) },
		transaction: { digest: `digest-${n}`, effects: { status: { success: true } } },
		...(end !== undefined && { end: { reason: end } }),
	});
}

function txEndFrame(
	n: number,
	reason: GrpcTypes.QueryEndReason,
): GrpcTypes.ListTransactionsResponse {
	return GrpcTypes.ListTransactionsResponse.create({
		watermark: { cursor: cursor(n) },
		end: { reason },
	});
}

function eventFrame(n: number, end?: GrpcTypes.QueryEndReason): GrpcTypes.ListEventsResponse {
	return GrpcTypes.ListEventsResponse.create({
		watermark: { cursor: cursor(n) },
		event: {
			packageId: '0x2',
			module: 'test',
			sender: '0x1',
			eventType: '0x2::test::Event',
			checkpoint: BigInt(100 + n),
			transactionDigest: `digest-${n}`,
			eventIndex: n,
		},
		...(end !== undefined && { end: { reason: end } }),
	});
}

function eventEndFrame(n: number, reason: GrpcTypes.QueryEndReason): GrpcTypes.ListEventsResponse {
	return GrpcTypes.ListEventsResponse.create({
		watermark: { cursor: cursor(n) },
		end: { reason },
	});
}

function checkpointFrame(
	n: number,
	end?: GrpcTypes.QueryEndReason,
): GrpcTypes.ListCheckpointsResponse {
	return GrpcTypes.ListCheckpointsResponse.create({
		watermark: { cursor: cursor(n) },
		checkpoint: {
			sequenceNumber: BigInt(n),
			digest: `checkpoint-${n}`,
			summary: {
				epoch: 7n,
				timestamp: { seconds: 1_700_000_000n + BigInt(n), nanos: 123_456_789 },
			},
		},
		...(end !== undefined && { end: { reason: end } }),
	});
}

function checkpointEndFrame(
	n: number,
	reason: GrpcTypes.QueryEndReason,
): GrpcTypes.ListCheckpointsResponse {
	return GrpcTypes.ListCheckpointsResponse.create({
		watermark: { cursor: cursor(n) },
		end: { reason },
	});
}

function mockListCheckpoints(client: SuiGrpcClient, frames: GrpcTypes.ListCheckpointsResponse[]) {
	let request: GrpcTypes.ListCheckpointsRequest | undefined;
	client.ledgerService.listCheckpoints = ((req: GrpcTypes.ListCheckpointsRequest) => {
		request = req;
		return {
			responses: (async function* () {
				yield* frames;
			})(),
		};
	}) as never;
	return () => request!;
}

function mockListTransactions(client: SuiGrpcClient, frames: GrpcTypes.ListTransactionsResponse[]) {
	let request: GrpcTypes.ListTransactionsRequest | undefined;
	client.ledgerService.listTransactions = ((req: GrpcTypes.ListTransactionsRequest) => {
		request = req;
		return {
			responses: (async function* () {
				yield* frames;
			})(),
		};
	}) as never;
	return () => request!;
}

function mockListEvents(client: SuiGrpcClient, frames: GrpcTypes.ListEventsResponse[]) {
	let request: GrpcTypes.ListEventsRequest | undefined;
	client.ledgerService.listEvents = ((req: GrpcTypes.ListEventsRequest) => {
		request = req;
		return {
			responses: (async function* () {
				yield* frames;
			})(),
		};
	}) as never;
	return () => request!;
}

describe('gRPC listTransactions pagination', () => {
	it('requests one extra item and reports no next page for exact-limit final pages', async () => {
		const client = makeClient();
		const getRequest = mockListTransactions(client, [
			txFrame(1),
			txFrame(2, QueryEndReason.LEDGER_TIP),
		]);

		const result = await client.core.listTransactions({ limit: 2 });

		expect(getRequest().options?.limit).toBe(3);
		expect(result.transactions).toHaveLength(2);
		expect(result.hasNextPage).toBe(false);
		expect(result.startCursor).toBe(cursorB64(1));
		expect(result.endCursor).toBe(cursorB64(2));
	});

	it('truncates the lookahead item and reports a next page', async () => {
		const client = makeClient();
		mockListTransactions(client, [txFrame(1), txFrame(2), txFrame(3, QueryEndReason.ITEM_LIMIT)]);

		const result = await client.core.listTransactions({ limit: 2 });

		expect(result.transactions).toHaveLength(2);
		expect(result.transactions.map((tx) => tx.Transaction?.digest)).toEqual([
			'digest-1',
			'digest-2',
		]);
		expect(result.hasNextPage).toBe(true);
		// The lookahead item's cursor must not leak into the page cursors
		expect(result.endCursor).toBe(cursorB64(2));
	});

	it('continues from the scan frontier when the scan limit interrupts a partially-filled page', async () => {
		const client = makeClient();
		mockListTransactions(client, [txFrame(1), txEndFrame(6, QueryEndReason.SCAN_LIMIT)]);

		const result = await client.core.listTransactions({ limit: 3 });

		expect(result.transactions).toHaveLength(1);
		expect(result.hasNextPage).toBe(true);
		expect(result.startCursor).toBe(cursorB64(1));
		// Resuming from the last item instead of the frontier would rescan positions the
		// server already covered
		expect(result.endCursor).toBe(cursorB64(6));
	});

	it('returns the scan frontier for item-less scan-limited pages', async () => {
		const client = makeClient();
		mockListTransactions(client, [txEndFrame(7, QueryEndReason.SCAN_LIMIT)]);

		const result = await client.core.listTransactions({ limit: 2 });

		expect(result.transactions).toHaveLength(0);
		expect(result.hasNextPage).toBe(true);
		expect(result.startCursor).toBeNull();
		expect(result.endCursor).toBe(cursorB64(7));
	});

	it('reports a next page when the server clamps the lookahead request to its own limit', async () => {
		const client = makeClient();
		// Requested limit 3 (lookahead 4), but the server clamps to its max of 3 and ends the
		// filled page with ITEM_LIMIT instead of producing the lookahead item
		mockListTransactions(client, [txFrame(1), txFrame(2), txFrame(3, QueryEndReason.ITEM_LIMIT)]);

		const result = await client.core.listTransactions({ limit: 3 });

		expect(result.transactions).toHaveLength(3);
		expect(result.hasNextPage).toBe(true);
		expect(result.endCursor).toBe(cursorB64(3));
	});

	it('returns null cursors for empty terminal pages', async () => {
		const client = makeClient();
		mockListTransactions(client, [txEndFrame(9, QueryEndReason.LEDGER_TIP)]);

		const result = await client.core.listTransactions({ limit: 2 });

		expect(result.transactions).toHaveLength(0);
		expect(result.hasNextPage).toBe(false);
		expect(result.startCursor).toBeNull();
		expect(result.endCursor).toBeNull();
	});
});

describe('gRPC listEvents pagination', () => {
	it('requests one extra item, truncates the lookahead item, and reports a next page', async () => {
		const client = makeClient();
		const getRequest = mockListEvents(client, [
			eventFrame(1),
			eventFrame(2),
			eventFrame(3, QueryEndReason.ITEM_LIMIT),
		]);

		const result = await client.core.listEvents({ limit: 2 });

		expect(getRequest().options?.limit).toBe(3);
		expect(result.events).toHaveLength(2);
		expect(result.events.map((event) => event.transactionDigest)).toEqual(['digest-1', 'digest-2']);
		expect(result.events.map((event) => event.checkpoint)).toEqual(['101', '102']);
		expect(result.hasNextPage).toBe(true);
		expect(result.endCursor).toBe(cursorB64(2));
	});

	it('reports no next page for exact-limit final pages', async () => {
		const client = makeClient();
		mockListEvents(client, [eventFrame(1), eventFrame(2, QueryEndReason.LEDGER_TIP)]);

		const result = await client.core.listEvents({ limit: 2 });

		expect(result.events).toHaveLength(2);
		expect(result.hasNextPage).toBe(false);
		expect(result.endCursor).toBe(cursorB64(2));
	});

	it('reports a next page when the server clamps the lookahead request to its own limit', async () => {
		const client = makeClient();
		mockListEvents(client, [eventFrame(1), eventFrame(2, QueryEndReason.ITEM_LIMIT)]);

		const result = await client.core.listEvents({ limit: 2 });

		expect(result.events).toHaveLength(2);
		expect(result.hasNextPage).toBe(true);
		expect(result.endCursor).toBe(cursorB64(2));
	});

	it('continues from the scan frontier when the scan limit interrupts a partially-filled page', async () => {
		const client = makeClient();
		mockListEvents(client, [eventFrame(1), eventEndFrame(6, QueryEndReason.SCAN_LIMIT)]);

		const result = await client.core.listEvents({ limit: 3 });

		expect(result.events).toHaveLength(1);
		expect(result.hasNextPage).toBe(true);
		expect(result.endCursor).toBe(cursorB64(6));
	});
});

describe('gRPC list query requests', () => {
	it('forwards checkpoint ranges, both cursor bounds, and the requested order', async () => {
		const client = makeClient();
		const getRequest = mockListTransactions(client, [txEndFrame(9, QueryEndReason.LEDGER_TIP)]);

		await client.core.listTransactions({
			after: cursorB64(1),
			before: cursorB64(5),
			order: 'descending',
			startCheckpoint: '10',
			endCheckpoint: 20,
		});

		const request = getRequest();
		expect(request.startCheckpoint).toBe(10n);
		expect(request.endCheckpoint).toBe(20n);
		expect(request.options?.after).toEqual(cursor(1));
		expect(request.options?.before).toEqual(cursor(5));
		expect(request.options?.ordering).toBe(GrpcTypes.Ordering.DESCENDING);
	});

	it('defaults to ascending when both cursor bounds are given', async () => {
		const client = makeClient();
		const getRequest = mockListEvents(client, [eventEndFrame(9, QueryEndReason.LEDGER_TIP)]);

		await client.core.listEvents({
			after: cursorB64(1),
			before: cursorB64(5),
			startCheckpoint: 3n,
		});

		const request = getRequest();
		expect(request.startCheckpoint).toBe(3n);
		expect(request.endCheckpoint).toBeUndefined();
		expect(request.options?.ordering).toBe(GrpcTypes.Ordering.ASCENDING);
	});

	it('omits the filter for empty filters and ANDs predicates in a single term', async () => {
		const client = makeClient();
		const getRequest = mockListTransactions(client, [txEndFrame(9, QueryEndReason.LEDGER_TIP)]);

		await client.core.listTransactions({ filter: {} });
		expect(getRequest().filter).toBeUndefined();

		await client.core.listTransactions({ filter: { sender: '0x1', affectedObject: '0x2' } });
		expect(getRequest().filter?.terms).toHaveLength(1);
		expect(
			getRequest().filter?.terms[0].literals.map((literal) => literal.predicate.oneofKind),
		).toEqual(['sender', 'affectedObject']);
	});

	it('rejects invalid checkpoint ranges before sending a request', async () => {
		const client = makeClient();
		const getRequest = mockListTransactions(client, []);

		await expect(
			client.core.listTransactions({ startCheckpoint: 5, endCheckpoint: 4 }),
		).rejects.toThrow('`endCheckpoint` must be greater than or equal to `startCheckpoint`');
		await expect(client.core.listEvents({ startCheckpoint: -1 })).rejects.toThrow(
			'Invalid startCheckpoint "-1"',
		);
		expect(getRequest()).toBeUndefined();
	});

	it.each([QueryEndReason.CHECKPOINT_BOUND, QueryEndReason.CURSOR_BOUND])(
		'treats end reason %s as terminal',
		async (reason) => {
			const client = makeClient();
			mockListTransactions(client, [txFrame(1), txFrame(2), txEndFrame(4, reason)]);

			const result = await client.core.listTransactions({ limit: 5 });

			expect(result.transactions).toHaveLength(2);
			expect(result.hasNextPage).toBe(false);
			expect(result.startCursor).toBe(cursorB64(1));
			expect(result.endCursor).toBe(cursorB64(2));

			const events = makeClient();
			mockListEvents(events, [eventFrame(1), eventEndFrame(4, reason)]);
			const eventResult = await events.core.listEvents({ limit: 5 });
			expect(eventResult.hasNextPage).toBe(false);
			expect(eventResult.endCursor).toBe(cursorB64(1));
		},
	);

	it('reports an event without a checkpoint as null', async () => {
		const client = makeClient();
		mockListEvents(client, [
			GrpcTypes.ListEventsResponse.create({
				watermark: { cursor: cursor(1) },
				event: {
					packageId: '0x2',
					module: 'test',
					sender: '0x1',
					eventType: '0x2::test::Event',
					transactionDigest: 'digest-1',
					eventIndex: 0,
				},
				end: { reason: QueryEndReason.LEDGER_TIP },
			}),
		]);

		const { events } = await client.core.listEvents({});
		expect(events[0].checkpoint).toBeNull();
	});
});

describe('gRPC listCheckpoints', () => {
	it('requests summary fields, the checkpoint range, and one lookahead item', async () => {
		const client = makeClient();
		const getRequest = mockListCheckpoints(client, [
			checkpointEndFrame(9, QueryEndReason.LEDGER_TIP),
		]);

		await client.core.listCheckpoints({
			limit: 4,
			startCheckpoint: 10,
			endCheckpoint: '20',
			after: cursorB64(1),
			before: cursorB64(5),
			order: 'descending',
		});

		const request = getRequest();
		expect(request.readMask?.paths).toEqual([
			'sequence_number',
			'digest',
			'summary.epoch',
			'summary.timestamp',
		]);
		expect(request.startCheckpoint).toBe(10n);
		expect(request.endCheckpoint).toBe(20n);
		expect(request.filter).toBeUndefined();
		expect(request.options?.limit).toBe(5);
		expect(request.options?.after).toEqual(cursor(1));
		expect(request.options?.before).toEqual(cursor(5));
		expect(request.options?.ordering).toBe(GrpcTypes.Ordering.DESCENDING);
	});

	it('maps checkpoint summaries and converts timestamps to milliseconds', async () => {
		const client = makeClient();
		mockListCheckpoints(client, [checkpointFrame(1, QueryEndReason.LEDGER_TIP)]);

		const result = await client.core.listCheckpoints({});

		expect(result.checkpoints).toEqual([
			{
				sequenceNumber: '1',
				digest: 'checkpoint-1',
				epoch: '7',
				// Sub-millisecond nanos are truncated
				timestampMs: 1700000001123,
			},
		]);
		expect(result.hasNextPage).toBe(false);
		expect(result.startCursor).toBe(cursorB64(1));
		expect(result.endCursor).toBe(cursorB64(1));
	});

	it('truncates the lookahead item and reports a next page', async () => {
		const client = makeClient();
		mockListCheckpoints(client, [
			checkpointFrame(1),
			checkpointFrame(2),
			checkpointFrame(3, QueryEndReason.ITEM_LIMIT),
		]);

		const result = await client.core.listCheckpoints({ limit: 2 });

		expect(result.checkpoints.map((checkpoint) => checkpoint.sequenceNumber)).toEqual(['1', '2']);
		expect(result.hasNextPage).toBe(true);
		expect(result.endCursor).toBe(cursorB64(2));
	});

	it('treats CHECKPOINT_BOUND as terminal', async () => {
		const client = makeClient();
		mockListCheckpoints(client, [
			checkpointFrame(1),
			checkpointEndFrame(2, QueryEndReason.CHECKPOINT_BOUND),
		]);

		const result = await client.core.listCheckpoints({ limit: 5 });

		expect(result.checkpoints).toHaveLength(1);
		expect(result.hasNextPage).toBe(false);
		expect(result.endCursor).toBe(cursorB64(1));
	});

	it('throws when a checkpoint is missing its summary', async () => {
		const client = makeClient();
		mockListCheckpoints(client, [
			GrpcTypes.ListCheckpointsResponse.create({
				watermark: { cursor: cursor(1) },
				checkpoint: { sequenceNumber: 1n, digest: 'checkpoint-1' },
				end: { reason: QueryEndReason.LEDGER_TIP },
			}),
		]);

		await expect(client.core.listCheckpoints({})).rejects.toThrow(
			'listCheckpoints response is missing expected checkpoint fields',
		);
	});

	it('rejects invalid checkpoint ranges before sending a request', async () => {
		const client = makeClient();
		const getRequest = mockListCheckpoints(client, []);

		await expect(
			client.core.listCheckpoints({ startCheckpoint: 5, endCheckpoint: 4 }),
		).rejects.toThrow('`endCheckpoint` must be greater than or equal to `startCheckpoint`');
		expect(getRequest()).toBeUndefined();
	});
});
