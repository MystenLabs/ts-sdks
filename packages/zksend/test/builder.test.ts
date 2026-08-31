// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { normalizeStructTag } from '@mysten/sui/utils';
import { describe, expect, it, vi } from 'vitest';

import { ZkSendLinkBuilder } from '../src/links/builder.js';

const SENDER = `0x${'1'.repeat(64)}`;
const COIN_TYPE = normalizeStructTag('0x2::usdsui::USDSUI');

describe('ZkSendLinkBuilder', () => {
	function setup() {
		const listCoins = vi.fn().mockResolvedValue({
			objects: [],
			hasNextPage: false,
			cursor: null,
		});
		const client = {
			network: 'testnet',
			core: { listCoins },
		} as unknown as ClientWithCoreApi;
		const link = new ZkSendLinkBuilder({ client, sender: SENDER });

		link.addClaimableBalance(COIN_TYPE, 100n);
		return { link, listCoins };
	}

	function expectCoinIntent(
		transaction: Awaited<ReturnType<ZkSendLinkBuilder['createSendTransaction']>>,
	) {
		const coinIntents = transaction
			.getData()
			.commands.filter((command) => command.$Intent?.name === 'CoinWithBalance');

		expect(coinIntents).toHaveLength(1);
		expect(coinIntents[0].$Intent?.data).toMatchObject({
			type: COIN_TYPE,
			balance: 100n,
			outputKind: 'coin',
		});
	}

	it('sources link balances through a CoinWithBalance intent', async () => {
		const { link, listCoins } = setup();

		const transaction = await link.createSendTransaction();

		expect(listCoins).not.toHaveBeenCalled();
		expectCoinIntent(transaction);
	});

	it('sources address-transfer balances through a CoinWithBalance intent', async () => {
		const { link, listCoins } = setup();

		const transaction = await link.createSendToAddressTransaction({ address: SENDER });

		expect(listCoins).not.toHaveBeenCalled();
		expectCoinIntent(transaction);
	});
});
