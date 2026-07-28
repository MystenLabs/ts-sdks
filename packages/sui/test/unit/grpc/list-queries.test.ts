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

	it('continues from the scan frontier when the scan limit interrupts a partially-filled page', async () => {
		const client = makeClient();
		mockListEvents(client, [eventFrame(1), eventEndFrame(6, QueryEndReason.SCAN_LIMIT)]);

		const result = await client.core.listEvents({ limit: 3 });

		expect(result.events).toHaveLength(1);
		expect(result.hasNextPage).toBe(true);
		expect(result.endCursor).toBe(cursorB64(6));
	});
});
