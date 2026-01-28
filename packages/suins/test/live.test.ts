// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { e2eLiveNetworkDryRunFlow } from './pre-built.js';

describe('it should work on live networks', () => {
	it('should work on mainnet', async () => {
		const res = await e2eLiveNetworkDryRunFlow('mainnet');
		if (res.FailedTransaction) {
			throw new Error(`Transaction failed: ${JSON.stringify(res.FailedTransaction?.status.error)}`);
		}

		expect(res.Transaction.status.success).toEqual(true);
	});

	it('should work on testnet', async () => {
		const res = await e2eLiveNetworkDryRunFlow('testnet');
		if (res.FailedTransaction) {
			throw new Error(`Transaction failed: ${JSON.stringify(res.FailedTransaction?.status.error)}`);
		}

		expect(res.Transaction.status.success).toEqual(true);
	});
});
