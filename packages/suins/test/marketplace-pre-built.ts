// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { MIST_PER_SUI, normalizeSuiAddress, SUI_TYPE_ARG } from '@mysten/sui/utils';

import { SuinsMarketplaceTransaction, SuinsTransaction, suins } from '../src/index.js';

/**
 * Registers a unique SuiNS name and returns the NFT + remaining coin.
 * Helper used by all marketplace flows.
 */
async function registerName(client: any, tx: Transaction, _sender: string) {
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

	const nft = suinsTx.register({
		domain: uniqueName,
		years: 2,
		coinConfig,
		coin: coinInput,
		priceInfoObjectId,
	});

	return { nft, uniqueName, coinInput, pythFeeCoin };
}

/**
 * Listing flow: register → createListing → buyListing → createListing → cancelListing
 *
 * Tests all three listing operations in a single transaction.
 */
export const e2eMarketplaceListingFlow = async (network: 'testnet') => {
	const client = new SuiGrpcClient({ baseUrl: getJsonRpcFullnodeUrl(network), network }).$extend(
		suins(),
	);

	const sender = normalizeSuiAddress('0x2');
	const tx = new Transaction();

	// Register a name to get the NFT
	const { nft, uniqueName, coinInput, pythFeeCoin } = await registerName(client, tx, sender);

	const marketplaceTx = new SuinsMarketplaceTransaction(client.suins, tx);

	// 1) Create a listing for the registered name
	marketplaceTx.createListing({
		coinType: SUI_TYPE_ARG,
		price: 1_000_000_000n,
		suinsRegistration: nft,
	});

	// 2) Buy the listing back (returns the NFT)
	const [paymentCoin] = tx.splitCoins(tx.gas, [1_000_000_000n]);
	const boughtNft = marketplaceTx.buyListing({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
		payment: paymentCoin,
	});

	// 3) Create another listing with the NFT we just bought
	marketplaceTx.createListing({
		coinType: SUI_TYPE_ARG,
		price: 2_000_000_000n,
		suinsRegistration: boughtNft,
	});

	// 4) Cancel the listing (returns the NFT)
	const cancelledNft = marketplaceTx.cancelListing({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
	});

	tx.transferObjects([cancelledNft, coinInput, pythFeeCoin], tx.pure.address(sender));
	tx.setSender(sender);

	return client.simulateTransaction({
		transaction: tx,
		include: { effects: true },
	});
};

/**
 * Offer flow: register → placeOffer → cancelOffer → placeOffer → declineOffer
 *   → placeOffer → makeCounterOffer → acceptCounterOffer → acceptOffer
 *
 * Tests all six offer operations in a single transaction.
 */
export const e2eMarketplaceOfferFlow = async (network: 'testnet') => {
	const client = new SuiGrpcClient({ baseUrl: getJsonRpcFullnodeUrl(network), network }).$extend(
		suins(),
	);

	const sender = normalizeSuiAddress('0x2');
	const tx = new Transaction();

	// Register a name so the domain exists on-chain
	const { nft, uniqueName, coinInput, pythFeeCoin } = await registerName(client, tx, sender);

	const marketplaceTx = new SuinsMarketplaceTransaction(client.suins, tx);

	// 1) Place an offer
	const [offerCoin1] = tx.splitCoins(tx.gas, [1n * MIST_PER_SUI]);
	marketplaceTx.placeOffer({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
		coin: offerCoin1,
	});

	// 2) Cancel the offer (returns the refunded coin)
	const refundedCoin = marketplaceTx.cancelOffer({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
	});

	// 3) Place another offer
	const [offerCoin2] = tx.splitCoins(tx.gas, [1n * MIST_PER_SUI]);
	marketplaceTx.placeOffer({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
		coin: offerCoin2,
	});

	// 4) Owner declines the offer (refunds the buyer)
	marketplaceTx.declineOffer({
		coinType: SUI_TYPE_ARG,
		suinsRegistration: nft,
		buyerAddress: sender,
	});

	// 5) Place another offer
	const [offerCoin3] = tx.splitCoins(tx.gas, [1n * MIST_PER_SUI]);
	marketplaceTx.placeOffer({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
		coin: offerCoin3,
	});

	// 6) Owner makes a counter offer (2 SUI)
	marketplaceTx.makeCounterOffer({
		coinType: SUI_TYPE_ARG,
		suinsRegistration: nft,
		buyerAddress: sender,
		counterOfferValue: 2n * MIST_PER_SUI,
	});

	// 7) Buyer accepts the counter offer (top-up of 1 SUI)
	const [topUpCoin] = tx.splitCoins(tx.gas, [1n * MIST_PER_SUI]);
	marketplaceTx.acceptCounterOffer({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
		coin: topUpCoin,
	});

	// 8) Owner accepts the offer (returns the payment, NFT transferred by contract)
	const paymentCoin = marketplaceTx.acceptOffer({
		coinType: SUI_TYPE_ARG,
		suinsRegistration: nft,
		buyerAddress: sender,
	});

	tx.transferObjects([refundedCoin, paymentCoin, coinInput, pythFeeCoin], tx.pure.address(sender));
	tx.setSender(sender);

	return client.simulateTransaction({
		transaction: tx,
		include: { effects: true },
	});
};

/**
 * Auction flow: register → createAuction → cancelAuction → createAuction → placeBid
 *
 * Tests createAuction, cancelAuction, and placeBid in a single transaction.
 * finalizeAuction is not tested because it requires the auction to have ended (time-based).
 * sealApprove is not tested because it requires Seal encryption infrastructure.
 * Times are in seconds. Min duration: 1h, Max duration: 30d.
 */
export const e2eMarketplaceAuctionFlow = async (network: 'testnet') => {
	const client = new SuiGrpcClient({ baseUrl: getJsonRpcFullnodeUrl(network), network }).$extend(
		suins(),
	);
	const sender = normalizeSuiAddress('0x2');
	const tx = new Transaction();

	// Register a name to get the NFT
	const { nft, uniqueName, coinInput, pythFeeCoin } = await registerName(client, tx, sender);

	const nowSec = Math.floor(Date.now() / 1000);
	const startTime = nowSec - 60; // slightly in the past so auction is active during simulation
	const endTime = nowSec + 7_200; // 2 hours

	const marketplaceTx = new SuinsMarketplaceTransaction(client.suins, tx);

	// 1) Create an auction for the registered name
	marketplaceTx.createAuction({
		coinType: SUI_TYPE_ARG,
		startTime,
		endTime,
		minBid: 1_000_000_000n,
		suinsRegistration: nft,
	});

	// 2) Cancel the auction before any bids (returns the NFT)
	const cancelledNft = marketplaceTx.cancelAuction({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
	});

	// 3) Create another auction with the returned NFT
	marketplaceTx.createAuction({
		coinType: SUI_TYPE_ARG,
		startTime,
		endTime,
		minBid: 1_000_000_000n,
		suinsRegistration: cancelledNft,
	});

	// 4) Place a bid on the auction
	const [bidCoin] = tx.splitCoins(tx.gas, [1n * MIST_PER_SUI]);
	marketplaceTx.placeBid({
		coinType: SUI_TYPE_ARG,
		domainName: uniqueName,
		bid: bidCoin,
	});

	tx.transferObjects([coinInput, pythFeeCoin], tx.pure.address(sender));
	tx.setSender(sender);

	return client.simulateTransaction({
		transaction: tx,
		include: { effects: true },
	});
};
