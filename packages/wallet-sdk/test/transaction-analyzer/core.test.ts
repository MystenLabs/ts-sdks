// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it, vi } from 'vitest';

import { analyze } from '../../src/transaction-analyzer/analyzer.js';
import { transactionResponse } from '../../src/transaction-analyzer/rules/core.js';
import { DEFAULT_SENDER } from '../mocks/mockData.js';
import { MockSuiClient } from '../mocks/MockSuiClient.js';

/** A fully-resolved transaction so `build()` never dry-runs for gas estimation. */
function resolvedTransaction() {
	const tx = new Transaction();
	tx.setSender(DEFAULT_SENDER);
	tx.setGasBudget(2_000_000n);
	tx.setGasPrice(1000n);
	return tx;
}

describe('TransactionAnalyzer - transactionResponse', () => {
	it('dry-runs with the requested include plus the forced effects', async () => {
		const client = new MockSuiClient();
		const spy = vi.spyOn(client, 'simulateTransaction');

		const results = await analyze(
			{ tx: transactionResponse<{ events: true }>() },
			{ client, transaction: await resolvedTransaction().toJSON(), include: { events: true } },
		);

		expect(spy).toHaveBeenCalledTimes(1);
		// The requested `events` is merged with the always-on `effects`.
		expect(spy.mock.calls[0][0].include).toEqual({ events: true, effects: true });
		expect(results.tx.result?.effects).toBeDefined();
	});

	it('skips the dry-run when a response is injected (include is ignored)', async () => {
		const client = new MockSuiClient();
		const spy = vi.spyOn(client, 'simulateTransaction');

		const injected = {
			digest: 'injected-digest',
			signatures: [],
			epoch: '1',
			status: { success: true, error: null },
			effects: { status: { success: true, error: null } },
		} as unknown as SuiClientTypes.Transaction<{ effects: true }>;

		const results = await analyze(
			{ tx: transactionResponse() },
			{ client, transaction: await resolvedTransaction().toJSON(), transactionResponse: injected },
		);

		// Injection takes precedence — the dry-run never runs, and the injected
		// response is returned verbatim.
		expect(spy).not.toHaveBeenCalled();
		expect(results.tx.result).toBe(injected);
	});
});
