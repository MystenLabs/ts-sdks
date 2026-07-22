// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lookupVout, lookupAllVouts, getTxConfirmations } from '../../src/btc-rpc.js';

const BTC_RPC_URL = 'http://localhost:18443';

function mockFetch(result: unknown, error?: { message: string }) {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
		json: async () => ({ result, error }),
	} as Response);
}

const TX_WITH_OUTPUTS = {
	vout: [
		{ n: 0, value: 0.001, scriptPubKey: { address: 'bcrt1paddr0' } },
		{ n: 1, value: 0.05, scriptPubKey: { address: 'bcrt1ptarget' } },
		{ n: 2, value: 0.002, scriptPubKey: { address: 'bcrt1ptarget' } },
		{ n: 3, value: 0.003, scriptPubKey: { address: 'bcrt1pother' } },
	],
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('lookupVout', () => {
	it('returns the first matching output', async () => {
		mockFetch(TX_WITH_OUTPUTS);

		const result = await lookupVout(BTC_RPC_URL, 'abc123', 'bcrt1ptarget');
		expect(result).toEqual({ vout: 1, amountSats: 5_000_000n });
	});

	it('returns null when no output matches', async () => {
		mockFetch(TX_WITH_OUTPUTS);

		const result = await lookupVout(BTC_RPC_URL, 'abc123', 'bcrt1pnomatch');
		expect(result).toBeNull();
	});

	it('throws on RPC error', async () => {
		mockFetch(undefined, { message: 'Transaction not found' });

		await expect(lookupVout(BTC_RPC_URL, 'abc123', 'addr')).rejects.toThrow(
			'Transaction not found',
		);
	});

	it('sends correct JSON-RPC payload', async () => {
		const spy = mockFetch(TX_WITH_OUTPUTS);

		await lookupVout(BTC_RPC_URL, 'txid123', 'addr');

		expect(spy).toHaveBeenCalledWith(BTC_RPC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '1.0',
				id: 'hashi-lookup-vout',
				method: 'getrawtransaction',
				params: ['txid123', true],
			}),
		});
	});
});

describe('lookupAllVouts', () => {
	it('returns all matching outputs', async () => {
		mockFetch(TX_WITH_OUTPUTS);

		const results = await lookupAllVouts(BTC_RPC_URL, 'abc123', 'bcrt1ptarget');
		expect(results).toHaveLength(2);
		expect(results[0]).toEqual({ vout: 1, amountSats: 5_000_000n });
		expect(results[1]).toEqual({ vout: 2, amountSats: 200_000n });
	});

	it('returns empty array when no output matches', async () => {
		mockFetch(TX_WITH_OUTPUTS);

		const results = await lookupAllVouts(BTC_RPC_URL, 'abc123', 'bcrt1pnomatch');
		expect(results).toEqual([]);
	});

	it('throws on RPC error', async () => {
		mockFetch(undefined, { message: 'bad txid' });

		await expect(lookupAllVouts(BTC_RPC_URL, 'abc123', 'addr')).rejects.toThrow('bad txid');
	});
});

describe('getTxConfirmations', () => {
	it('returns confirmation count', async () => {
		mockFetch({ confirmations: 6 });

		const count = await getTxConfirmations(BTC_RPC_URL, 'abc123');
		expect(count).toBe(6);
	});

	it('returns 0 when confirmations field is absent (mempool tx)', async () => {
		mockFetch({});

		const count = await getTxConfirmations(BTC_RPC_URL, 'abc123');
		expect(count).toBe(0);
	});

	it('throws on RPC error', async () => {
		mockFetch(undefined, { message: 'No such mempool transaction' });

		await expect(getTxConfirmations(BTC_RPC_URL, 'abc123')).rejects.toThrow(
			'No such mempool transaction',
		);
	});
});
