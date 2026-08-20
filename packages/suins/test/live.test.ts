// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { e2eLiveNetworkDryRunFlow } from './pre-built.js';

// The live flow hits the keyed Pyth Hermes endpoint, which needs an access token.
// Skip when it is not provided so the suite doesn't fail for contributors without one.
const hasPythKey = Boolean(process.env.VITE_PYTH_ACCESS_TOKEN);

describe('it should work on live networks', () => {
	it.skipIf(!hasPythKey)('should work on mainnet', async () => {
		const res = await e2eLiveNetworkDryRunFlow('mainnet');
		if (res.FailedTransaction) {
			throw new Error(`Transaction failed: ${JSON.stringify(res.FailedTransaction?.status.error)}`);
		}

		expect(res.Transaction.status.success).toEqual(true);
	});

	it.skipIf(!hasPythKey)('should work on testnet', async () => {
		const res = await e2eLiveNetworkDryRunFlow('testnet');
		if (res.FailedTransaction) {
			throw new Error(`Transaction failed: ${JSON.stringify(res.FailedTransaction?.status.error)}`);
		}

		expect(res.Transaction.status.success).toEqual(true);
	});
});
