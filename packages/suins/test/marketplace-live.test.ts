// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
	e2eMarketplaceListingFlow,
	e2eMarketplaceOfferFlow,
	e2eMarketplaceAuctionFlow,
} from './marketplace-pre-built.js';

describe('marketplace listings should work on live networks', () => {
	it('should work on testnet', async () => {
		const res = await e2eMarketplaceListingFlow('testnet');
		if (res.FailedTransaction) {
			throw new Error(`Transaction failed: ${JSON.stringify(res.FailedTransaction?.status.error)}`);
		}

		expect(res.Transaction.status.success).toEqual(true);
	});
});

describe('marketplace offers should work on live networks', () => {
	it('should work on testnet', async () => {
		const res = await e2eMarketplaceOfferFlow('testnet');
		if (res.FailedTransaction) {
			throw new Error(`Transaction failed: ${JSON.stringify(res.FailedTransaction?.status.error)}`);
		}

		expect(res.Transaction.status.success).toEqual(true);
	});
});

describe('marketplace auctions should work on live networks', () => {
	it('should work on testnet', async () => {
		const res = await e2eMarketplaceAuctionFlow('testnet');
		if (res.FailedTransaction) {
			throw new Error(`Transaction failed: ${JSON.stringify(res.FailedTransaction?.status.error)}`);
		}

		expect(res.Transaction.status.success).toEqual(true);
	});
});
