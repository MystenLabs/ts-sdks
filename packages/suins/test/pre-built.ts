// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { MIST_PER_SUI, normalizeSuiAddress } from '@mysten/sui/utils';
import { expect } from 'vitest';

import { ALLOWED_METADATA, SuinsClient } from '../src/index.js';

export const e2eLiveNetworkDryRunFlow = async (network: 'mainnet' | 'testnet') => {
	const client = new SuiClient({ url: getFullnodeUrl(network), network }).$extend(
		SuinsClient.experimental_asClientExtension(),
	);

	const sender = normalizeSuiAddress('0x2');

	// Getting price lists accurately
	const priceList = await client.suins.getPriceList();
	const renewalPriceList = await client.suins.getRenewalPriceList();
	const coinDiscount = await client.suins.getCoinTypeDiscount();

	// Expected lists
	const expectedPriceList = new Map([
		[[3, 3], 500000000],
		[[4, 4], 100000000],
		[[5, 63], 10000000],
	]);

	const expectedRenewalPriceList = new Map([
		[[3, 3], 150000000],
		[[4, 4], 50000000],
		[[5, 63], 5000000],
	]);

	const expectedCoinDiscount = new Map([
		[client.suins.config.coins.USDC.type.slice(2), 0],
		[client.suins.config.coins.SUI.type.slice(2), 0],
		[client.suins.config.coins.NS.type.slice(2), 25],
	]);
	expect(priceList).toEqual(expectedPriceList);
	expect(renewalPriceList).toEqual(expectedRenewalPriceList);
	expect(coinDiscount).toEqual(expectedCoinDiscount);

	const tx = new Transaction();
	const coinConfig = client.suins.config.coins.SUI; // Specify the coin type used for the transaction
	const priceInfoObjectId =
		coinConfig !== client.suins.config.coins.USDC
			? (await client.suins.getPriceInfoObject(tx, coinConfig.feed))[0]
			: null;

	const uniqueName =
		(Date.now().toString(36) + Math.random().toString(36).substring(2)).repeat(2) + '.sui';

	const [coinInput] = tx.splitCoins(tx.gas, [10n * MIST_PER_SUI]);
	// register test.sui for 2 years.
	const nft = tx.add(
		client.suins.calls.register({
			domain: uniqueName,
			years: 2,
			coinConfig: client.suins.config.coins.SUI,
			coin: coinInput,
			priceInfoObjectId,
		}),
	);
	// Sets the target address of the NFT.
	tx.add(
		client.suins.calls.setTargetAddress({
			nft,
			address: sender,
			isSubname: false,
		}),
	);

	tx.add(client.suins.calls.setDefault(uniqueName));

	// Sets the avatar of the NFT.
	tx.add(
		client.suins.calls.setUserData({
			nft,
			key: ALLOWED_METADATA.avatar,
			value: '0x0',
		}),
	);

	tx.add(
		client.suins.calls.setUserData({
			nft,
			key: ALLOWED_METADATA.contentHash,
			value: '0x1',
		}),
	);

	tx.add(
		client.suins.calls.setUserData({
			nft,
			key: ALLOWED_METADATA.walrusSiteId,
			value: '0x2',
		}),
	);

	const subNft = tx.add(
		client.suins.calls.createSubName({
			parentNft: nft,
			name: 'node.' + uniqueName,
			expirationTimestampMs: Date.now() + 1000 * 60 * 60 * 24 * 30,
			allowChildCreation: true,
			allowTimeExtension: true,
		}),
	);

	// create/remove some leaf names as an NFT
	tx.add(
		client.suins.calls.createLeafSubName({
			parentNft: nft,
			name: 'leaf.' + uniqueName,
			targetAddress: sender,
		}),
	);
	tx.add(client.suins.calls.removeLeafSubName({ parentNft: nft, name: 'leaf.' + uniqueName }));

	// do it for sub nft too
	tx.add(
		client.suins.calls.createLeafSubName({
			parentNft: subNft,
			name: 'leaf.node.' + uniqueName,
			targetAddress: sender,
		}),
	);
	tx.add(
		client.suins.calls.removeLeafSubName({ parentNft: subNft, name: 'leaf.node.' + uniqueName }),
	);

	// extend expiration a bit further for the subNft
	tx.add(
		client.suins.calls.extendExpiration({
			nft: subNft,
			expirationTimestampMs: Date.now() + 1000 * 60 * 60 * 24 * 30 * 2,
		}),
	);

	tx.add(
		client.suins.calls.editSetup({
			parentNft: nft,
			name: 'node.' + uniqueName,
			allowChildCreation: true,
			allowTimeExtension: false,
		}),
	);

	// let's go 2 levels deep and edit setups!
	const moreNestedNft = tx.add(
		client.suins.calls.createSubName({
			parentNft: subNft,
			name: 'more.node.' + uniqueName,
			allowChildCreation: true,
			allowTimeExtension: true,
			expirationTimestampMs: Date.now() + 1000 * 60 * 60 * 24 * 30,
		}),
	);

	tx.add(
		client.suins.calls.editSetup({
			parentNft: subNft,
			name: 'more.node.' + uniqueName,
			allowChildCreation: false,
			allowTimeExtension: false,
		}),
	);

	// do it for sub nft too
	tx.transferObjects([moreNestedNft, subNft, nft, coinInput], tx.pure.address(sender));

	tx.setSender(sender);

	if (network === 'mainnet') {
		tx.setGasPayment([
			{
				objectId: '0xc7fcf957faeb0cdd9809b2ab43e0a8bf7a945cfdac13e8cba527261fecefa4dd',
				version: '86466933',
				digest: '2F8iuFVJm55J96FnJ99Th493D254BaJkUccbwz5rHFDc',
			},
		]);
	} else if (network === 'testnet') {
		tx.setGasPayment([
			{
				objectId: '0xeb709b97ca3e87e385d019ccb7da4a9bd99f9405f9b0d692f21c9d2e5714f27a',
				version: '169261602',
				digest: 'HJehhEV1N8rqjjHbwDgjeCZJkHPRavMmihTvyTJme2rA',
			},
		]);
	}

	return client.dryRunTransactionBlock({
		transactionBlock: await tx.build({
			client,
		}),
	});
};
