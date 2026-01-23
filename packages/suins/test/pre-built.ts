// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { MIST_PER_SUI, normalizeSuiAddress } from '@mysten/sui/utils';
import { expect } from 'vitest';

import { ALLOWED_METADATA, SuinsTransaction, suins } from '../src/index.js';

export const e2eLiveNetworkDryRunFlow = async (network: 'mainnet' | 'testnet') => {
	const client = new SuiGrpcClient({ baseUrl: getJsonRpcFullnodeUrl(network), network }).$extend(
		suins(),
	);

	const sender = normalizeSuiAddress('0x2');

	// Getting price lists accurately
	const priceList = await client.suins.getPriceList();
	const renewalPriceList = await client.suins.getRenewalPriceList();
	const coinDiscount = await client.suins.getCoinTypeDiscount();

	// Expected lists - mainnet and testnet have different prices
	const expectedPriceList =
		network === 'mainnet'
			? new Map([
					[[3, 3], 500000000],
					[[4, 4], 100000000],
					[[5, 63], 10000000],
				])
			: new Map([
					[[3, 3], 50000000],
					[[4, 4], 10000000],
					[[5, 63], 1000000],
				]);

	const expectedRenewalPriceList =
		network === 'mainnet'
			? new Map([
					[[3, 3], 150000000],
					[[4, 4], 50000000],
					[[5, 63], 5000000],
				])
			: new Map([
					[[3, 3], 15000000],
					[[4, 4], 5000000],
					[[5, 63], 500000],
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

	// Split coins for registration and Pyth fee upfront
	const [coinInput, pythFeeCoin] = tx.splitCoins(tx.gas, [10n * MIST_PER_SUI, MIST_PER_SUI]);

	const priceInfoObjectId =
		coinConfig !== client.suins.config.coins.USDC
			? (await client.suins.getPriceInfoObject(tx, coinConfig.feed, pythFeeCoin))[0]
			: null;

	const suinsTx = new SuinsTransaction(client.suins, tx);

	const uniqueName =
		(Date.now().toString(36) + Math.random().toString(36).substring(2)).repeat(2) + '.sui';
	// register test.sui for 2 years.
	const nft = suinsTx.register({
		domain: uniqueName,
		years: 2,
		coinConfig: client.suins.config.coins.SUI,
		coin: coinInput,
		priceInfoObjectId,
	});
	// Sets the target address of the NFT.
	suinsTx.setTargetAddress({
		nft,
		address: sender,
		isSubname: false,
	});

	suinsTx.setDefault(uniqueName);

	// Sets the avatar of the NFT.
	suinsTx.setUserData({
		nft,
		key: ALLOWED_METADATA.avatar,
		value: '0x0',
	});

	suinsTx.setUserData({
		nft,
		key: ALLOWED_METADATA.contentHash,
		value: '0x1',
	});

	suinsTx.setUserData({
		nft,
		key: ALLOWED_METADATA.walrusSiteId,
		value: '0x2',
	});

	const subNft = suinsTx.createSubName({
		parentNft: nft,
		name: 'node.' + uniqueName,
		expirationTimestampMs: Date.now() + 1000 * 60 * 60 * 24 * 30,
		allowChildCreation: true,
		allowTimeExtension: true,
	});

	// create/remove some leaf names as an NFT
	suinsTx.createLeafSubName({
		parentNft: nft,
		name: 'leaf.' + uniqueName,
		targetAddress: sender,
	});
	suinsTx.removeLeafSubName({ parentNft: nft, name: 'leaf.' + uniqueName });

	// do it for sub nft too
	suinsTx.createLeafSubName({
		parentNft: subNft,
		name: 'leaf.node.' + uniqueName,
		targetAddress: sender,
	});
	suinsTx.removeLeafSubName({ parentNft: subNft, name: 'leaf.node.' + uniqueName });

	// extend expiration a bit further for the subNft
	suinsTx.extendExpiration({
		nft: subNft,
		expirationTimestampMs: Date.now() + 1000 * 60 * 60 * 24 * 30 * 2,
	});

	suinsTx.editSetup({
		parentNft: nft,
		name: 'node.' + uniqueName,
		allowChildCreation: true,
		allowTimeExtension: false,
	});

	// let's go 2 levels deep and edit setups!
	const moreNestedNft = suinsTx.createSubName({
		parentNft: subNft,
		name: 'more.node.' + uniqueName,
		allowChildCreation: true,
		allowTimeExtension: true,
		expirationTimestampMs: Date.now() + 1000 * 60 * 60 * 24 * 30,
	});

	suinsTx.editSetup({
		parentNft: subNft,
		name: 'more.node.' + uniqueName,
		allowChildCreation: false,
		allowTimeExtension: false,
	});

	// do it for sub nft too
	tx.transferObjects([moreNestedNft, subNft, nft, coinInput, pythFeeCoin], tx.pure.address(sender));

	tx.setSender(sender);

	return client.simulateTransaction({
		transaction: tx,
		include: {
			effects: true,
		},
	});
};
