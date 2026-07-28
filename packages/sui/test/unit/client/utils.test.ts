// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { transactionBytesHaveEmptyGasPayment } from '../../../src/client/utils.js';
import { Transaction } from '../../../src/transactions/index.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';

async function buildTransactionBytes(
	payment: { objectId: string; version: string; digest: string }[],
) {
	const tx = new Transaction();
	tx.setSender(normalizeSuiAddress('0x2'));
	tx.setGasPrice(1000);
	tx.setGasBudget(1_000_000);
	tx.setGasPayment(payment);
	tx.setExpiration({ None: true });
	return await tx.build();
}

describe('transactionBytesHaveEmptyGasPayment', () => {
	it('returns true for transaction bytes with an explicitly empty gas payment', async () => {
		const bytes = await buildTransactionBytes([]);
		expect(transactionBytesHaveEmptyGasPayment(bytes)).toBe(true);
	});

	it('returns false for transaction bytes with gas coins set', async () => {
		const bytes = await buildTransactionBytes([
			{
				objectId: normalizeSuiAddress('0x123'),
				version: '1',
				digest: 'EnUgYyLmnaBJcCf6ZHU3PbXbcS4gTM6r89kQwPebfsAn',
			},
		]);
		expect(transactionBytesHaveEmptyGasPayment(bytes)).toBe(false);
	});

	it('returns false for bytes that cannot be parsed as TransactionData', () => {
		expect(transactionBytesHaveEmptyGasPayment(new Uint8Array([1, 2, 3]))).toBe(false);
		expect(transactionBytesHaveEmptyGasPayment(new Uint8Array())).toBe(false);
	});
});
