// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { buildTransactionResult } from '../../../src/utils/transaction-result.js';

// `TransactionEffects::V2` with a `Success` status: the prefix the status is read from.
const SUCCESS_EFFECTS = new Uint8Array([1, 0]);

describe('buildTransactionResult', () => {
	it('returns an Unknown kind for transaction bytes this SDK cannot decode', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		// `TransactionData::V1` whose kind uses a variant index this SDK does not know.
		const result = buildTransactionResult(
			'digest',
			'signature',
			new Uint8Array([0, 200]),
			SUCCESS_EFFECTS,
		);

		expect(result.Transaction?.transaction).toEqual({
			version: 2,
			sender: null,
			gasData: { budget: null, owner: null, payment: null, price: null },
			expiration: null,
			kind: { $kind: 'Unknown', Unknown: true },
		});
		expect(result.Transaction?.status).toEqual({ success: true, error: null });
		warn.mockRestore();
	});
});
