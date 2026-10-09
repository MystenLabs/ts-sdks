// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest';

import { ExpiryMarket } from '../../src/contracts/deepbook_predict/expiry_market.js';
import { SHIPPED_FEE_POLICY } from '../../src/predict/cost.js';
import { marketFeePolicy } from '../../src/predict/reads/markets.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';

// A market's fee policy is its creation-time snapshot of the protocol template, stored in the
// `ExpiryMarket` object itself.
describe('marketFeePolicy', () => {
	const zero = ExpiryMarket.parse(new Uint8Array(4096));
	// Testnet's template on 2026-10-09, which no longer matches SHIPPED_FEE_POLICY.
	const config = {
		backing_buffer_lambda: 310_000_000n,
		base_fee: 204_000_000n,
		min_fee: 22_000_000n,
		min_entry_probability: 250_000_000n,
		max_entry_probability: 750_000_000n,
		expiry_fee_window_ms: 60_000n,
		expiry_fee_max_multiplier: 3_000_000_000n,
		inventory_impact_max_rate: 0n,
	};
	const content = ExpiryMarket.serialize({
		...zero,
		strike_exposure: { ...zero.strike_exposure, config, inventory_impact_scale: 7_000_000_000n },
	}).toBytes();
	const reads: string[] = [];
	const client = {
		core: {
			async getObject({ objectId }: { objectId: string }) {
				reads.push(objectId);
				return { object: { content } };
			},
		},
	} as unknown as ReadClient;

	test("reads the market's own snapshot into the cost functions' FeePolicy", async () => {
		const policy = await marketFeePolicy(client, '0x1');
		expect(reads).toEqual(['0x1']);
		expect(policy).toEqual({
			baseFee: 204_000_000n,
			minFee: 22_000_000n,
			expiryFeeWindowMs: 60_000n,
			expiryFeeMaxMultiplier: 3_000_000_000n,
			minEntryProbability: 250_000_000n,
			maxEntryProbability: 750_000_000n,
			inventoryImpactMaxRate: 0n,
			inventoryImpactScale: 7_000_000_000n,
			backingBufferLambda: 310_000_000n,
		});
		expect(policy).not.toEqual(SHIPPED_FEE_POLICY);
	});
});
