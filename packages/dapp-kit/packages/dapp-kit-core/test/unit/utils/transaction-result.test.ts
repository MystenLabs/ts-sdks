// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { buildTransactionResult } from '../../../src/utils/transaction-result.js';

// `TransactionEffects::V2` with a `Success` status: the prefix the status is read from.
const SUCCESS_EFFECTS = new Uint8Array([1, 0]);

describe('buildTransactionResult', () => {
	it('throws for transaction bytes this SDK cannot decode', () => {
		// `TransactionData::V1` whose kind uses a variant index this SDK does not know.
		const build = () =>
			buildTransactionResult('digest', 'signature', new Uint8Array([0, 100]), SUCCESS_EFFECTS);
		expect(build).toThrow(
			expect.objectContaining({
				message: expect.stringContaining(
					'Failed to parse the transaction data returned by the wallet',
				),
				cause: expect.objectContaining({
					message: 'Unknown value 100 for enum TransactionKind',
				}),
			}),
		);
	});
});
