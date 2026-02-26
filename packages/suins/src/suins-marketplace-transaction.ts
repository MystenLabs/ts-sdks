// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import { normalizeSuiNSName } from '@mysten/sui/utils';

import * as auction from './contracts/suins_auction/auction.js';
import * as offer from './contracts/suins_auction/offer.js';
import type { SuinsClient } from './suins-client.js';
import type {
	AcceptCounterOfferParams,
	AcceptOfferParams,
	BuyListingParams,
	CancelAuctionParams,
	CancelListingParams,
	CancelOfferParams,
	CreateAuctionParams,
	CreateListingParams,
	DeclineOfferParams,
	FinalizeAuctionParams,
	MakeCounterOfferParams,
	PlaceBidParams,
	PlaceOfferParams,
	SealApproveParams,
} from './types.js';

export class SuinsMarketplaceTransaction {
	suinsClient: SuinsClient;
	transaction: Transaction;

	constructor(client: SuinsClient, transaction: Transaction) {
		this.suinsClient = client;
		this.transaction = transaction;

		if (!this.suinsClient.config.marketplace) {
			throw new Error(
				'Marketplace config not found. Make sure marketplace is configured for your network.',
			);
		}
	}

	private get marketplaceConfig() {
		return this.suinsClient.config.marketplace!;
	}

	/**
	 * Creates a fixed-price listing for a SuiNS domain.
	 *
	 * The caller must own the SuinsRegistration NFT being listed.
	 * The domain must not be expired, and if an expiry is set,
	 * the domain must not expire before the listing does.
	 *
	 * @param params - The listing parameters
	 * @param params.coinType - The coin type to price the listing in (e.g. '0x2::sui::SUI')
	 * @param params.price - The fixed price in base units of the coin
	 * @param params.expiresAt - Optional expiration timestamp in seconds
	 * @param params.suinsRegistration - The SuinsRegistration NFT to list
	 */
	createListing(params: CreateListingParams): void {
		const config = this.marketplaceConfig;

		this.transaction.add(
			offer.createListing({
				package: config.packageId,
				arguments: {
					offerTable: config.offerTableId,
					price: params.price,
					expiresAt: params.expiresAt ?? null,
					suinsRegistration: params.suinsRegistration as string,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Buys a listed domain at the fixed listing price.
	 *
	 * The payment coin must match the listing price exactly.
	 * The domain NFT is transferred to the buyer, and the
	 * payment (minus service fee) goes to the listing owner.
	 *
	 * @param params - The buy parameters
	 * @param params.coinType - The coin type the listing is priced in
	 * @param params.domainName - The domain name (e.g. 'example.sui')
	 * @param params.payment - The payment coin object
	 * @returns The SuinsRegistration NFT as a TransactionObjectArgument
	 */
	buyListing(params: BuyListingParams): TransactionObjectArgument {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		return this.transaction.add(
			offer.buyListing({
				package: config.packageId,
				arguments: {
					suins: this.suinsClient.config.suins,
					offerTable: config.offerTableId,
					domainName,
					payment: params.payment as string,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Cancels an active listing and returns the domain NFT to the owner.
	 *
	 * Only the original listing owner can cancel a listing.
	 *
	 * @param params - The cancel parameters
	 * @param params.coinType - The coin type the listing was created with
	 * @param params.domainName - The domain name to cancel the listing for
	 * @returns The SuinsRegistration NFT as a TransactionObjectArgument
	 */
	cancelListing(params: CancelListingParams): TransactionObjectArgument {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		return this.transaction.add(
			offer.cancelListing({
				package: config.packageId,
				arguments: {
					offerTable: config.offerTableId,
					domainName,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	// ─── Offers ──────────────────────────────────────────────────────

	/**
	 * Places an offer on a registered domain.
	 *
	 * The domain must exist and not be expired. The caller attaches a payment
	 * coin as the offer value. An optional expiration timestamp can be set.
	 *
	 * @param params.coinType - The coin type for the offer
	 * @param params.domainName - The domain name to make an offer on
	 * @param params.coin - The payment coin for the offer
	 * @param params.expiresAt - Optional expiration timestamp in seconds
	 */
	placeOffer(params: PlaceOfferParams): void {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		this.transaction.add(
			offer.placeOffer({
				package: config.packageId,
				arguments: {
					suins: this.suinsClient.config.suins,
					offerTable: config.offerTableId,
					domainName,
					coin: params.coin as string,
					expiresAt: params.expiresAt ?? null,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Cancels an offer and returns the payment coin to the caller.
	 *
	 * Only the original offer maker can cancel their offer.
	 *
	 * @param params.coinType - The coin type of the offer
	 * @param params.domainName - The domain name the offer was placed on
	 * @returns The refunded coin as a TransactionObjectArgument
	 */
	cancelOffer(params: CancelOfferParams): TransactionObjectArgument {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		return this.transaction.add(
			offer.cancelOffer({
				package: config.packageId,
				arguments: {
					offerTable: config.offerTableId,
					domainName,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Accepts an offer on a domain the caller owns.
	 *
	 * Transfers the SuinsRegistration NFT to the buyer, deducts the service
	 * fee, and returns the remaining payment to the domain owner.
	 *
	 * @param params.coinType - The coin type of the offer
	 * @param params.suinsRegistration - The SuinsRegistration NFT to transfer
	 * @param params.buyerAddress - The address of the offer maker
	 * @returns The payment coin (minus service fee) as a TransactionObjectArgument
	 */
	acceptOffer(params: AcceptOfferParams): TransactionObjectArgument {
		const config = this.marketplaceConfig;

		return this.transaction.add(
			offer.acceptOffer({
				package: config.packageId,
				arguments: {
					suins: this.suinsClient.config.suins,
					offerTable: config.offerTableId,
					suinsRegistration: params.suinsRegistration as string,
					address: params.buyerAddress,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Declines an offer on a domain the caller owns.
	 *
	 * Refunds the payment coin to the offer maker.
	 *
	 * @param params.coinType - The coin type of the offer
	 * @param params.suinsRegistration - The SuinsRegistration NFT (read-only)
	 * @param params.buyerAddress - The address of the offer maker to refund
	 */
	declineOffer(params: DeclineOfferParams): void {
		const config = this.marketplaceConfig;

		this.transaction.add(
			offer.declineOffer({
				package: config.packageId,
				arguments: {
					offerTable: config.offerTableId,
					suinsRegistration: params.suinsRegistration as string,
					address: params.buyerAddress,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Makes a counter offer on an existing offer.
	 *
	 * The counter offer value must be higher than the current offer.
	 * Only the domain owner can make a counter offer.
	 *
	 * @param params.coinType - The coin type of the original offer
	 * @param params.suinsRegistration - The SuinsRegistration NFT (read-only)
	 * @param params.buyerAddress - The address of the original offer maker
	 * @param params.counterOfferValue - The counter price (must exceed original)
	 */
	makeCounterOffer(params: MakeCounterOfferParams): void {
		const config = this.marketplaceConfig;

		this.transaction.add(
			offer.makeCounterOffer({
				package: config.packageId,
				arguments: {
					offerTable: config.offerTableId,
					suinsRegistration: params.suinsRegistration as string,
					address: params.buyerAddress,
					counterOfferValue: params.counterOfferValue,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Accepts a counter offer by topping up the payment.
	 *
	 * The payment coin must equal `counter_offer_value - original_offer_value`.
	 * Only the original offer maker can accept the counter offer.
	 *
	 * @param params.coinType - The coin type of the counter offer
	 * @param params.domainName - The domain name
	 * @param params.coin - The top-up payment coin
	 */
	acceptCounterOffer(params: AcceptCounterOfferParams): void {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		this.transaction.add(
			offer.acceptCounterOffer({
				package: config.packageId,
				arguments: {
					offerTable: config.offerTableId,
					domainName,
					coin: params.coin as string,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	// ─── Auctions ───────────────────────────────────────────────────

	/**
	 * Creates a timed auction for a SuiNS domain.
	 *
	 * The caller must own the SuinsRegistration NFT. The domain must not expire
	 * before the auction ends. An optional encrypted reserve price can be set
	 * using Seal encryption.
	 *
	 * @param params.coinType - The coin type for the auction
	 * @param params.startTime - Auction start time (Unix timestamp in seconds)
	 * @param params.endTime - Auction end time (Unix timestamp in seconds)
	 * @param params.minBid - Minimum bid amount in base units of the coin
	 * @param params.suinsRegistration - The SuinsRegistration NFT to auction
	 * @param params.encryptedReservePrice - Optional pre-encrypted reserve price bytes
	 */
	createAuction(params: CreateAuctionParams): void {
		const config = this.marketplaceConfig;

		this.transaction.add(
			auction.createAuction({
				package: config.packageId,
				arguments: {
					auctionTable: config.auctionTableId,
					startTime: params.startTime,
					endTime: params.endTime,
					minBid: params.minBid,
					encryptedReservePrice: params.encryptedReservePrice
						? Array.from(params.encryptedReservePrice)
						: null,
					suinsRegistration: params.suinsRegistration as string,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Places a bid on an active auction.
	 *
	 * The bid must be at least 5% higher than the current highest bid.
	 * If the bid is placed within the last 5 minutes, the auction is
	 * automatically extended.
	 *
	 * @param params.coinType - The coin type the auction is denominated in
	 * @param params.domainName - The domain name being auctioned
	 * @param params.bid - The bid payment coin
	 */
	placeBid(params: PlaceBidParams): void {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		this.transaction.add(
			auction.placeBid({
				package: config.packageId,
				arguments: {
					auctionTable: config.auctionTableId,
					domainName,
					coin: params.bid as string,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Finalizes an auction after its end time has passed.
	 *
	 * If the auction has an encrypted reserve price, derived keys and key
	 * server addresses must be provided for on-chain decryption.
	 * If the highest bid meets the reserve (or there is no reserve),
	 * the domain is transferred to the winner and payment to the owner.
	 *
	 * @param params.coinType - The coin type the auction is denominated in
	 * @param params.domainName - The domain name to finalize
	 * @param params.derivedKeys - Optional Seal derived keys for reserve decryption
	 * @param params.keyServers - Optional key server addresses for reserve decryption
	 */
	finalizeAuction(params: FinalizeAuctionParams): void {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		const hasSealData =
			params.derivedKeys &&
			params.keyServers &&
			params.derivedKeys.length > 0 &&
			params.keyServers.length > 0;

		this.transaction.add(
			auction.finalizeAuction({
				package: config.packageId,
				arguments: {
					suins: this.suinsClient.config.suins,
					auctionTable: config.auctionTableId,
					domainName,
					derivedKeys: hasSealData ? params.derivedKeys! : null,
					keyServers: hasSealData ? params.keyServers! : null,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Cancels an auction before any bids are placed.
	 *
	 * Only the original auction owner can cancel. Returns the SuinsRegistration NFT.
	 *
	 * @param params.coinType - The coin type the auction is denominated in
	 * @param params.domainName - The domain name to cancel the auction for
	 * @returns The SuinsRegistration NFT as a TransactionObjectArgument
	 */
	cancelAuction(params: CancelAuctionParams): TransactionObjectArgument {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		return this.transaction.add(
			auction.cancelAuction({
				package: config.packageId,
				arguments: {
					auctionTable: config.auctionTableId,
					domainName,
				},
				typeArguments: [params.coinType],
			}),
		);
	}

	/**
	 * Builds the `seal_approve` moveCall used for Seal key derivation.
	 *
	 * This is needed when finalizing an auction that has an encrypted reserve
	 * price. The caller builds a transaction containing this moveCall, then
	 * passes the transaction bytes to `SealClient.getDerivedKeys()` to obtain
	 * the derived keys needed for `finalizeAuction`.
	 *
	 * The encryption ID is constructed as: BCS(start_time as u64) ++ domain_name_bytes,
	 * matching the format in `decryption.move::get_encryption_id`.
	 *
	 * @param params.coinType - The coin type the auction is denominated in
	 * @param params.domainName - The domain name being auctioned
	 * @param params.startTime - The auction start time in seconds
	 */
	sealApprove(params: SealApproveParams): void {
		const config = this.marketplaceConfig;
		const domainName = normalizeSuiNSName(params.domainName, 'dot');

		// Build the encryption ID: BCS-encoded start_time (u64 LE) + domain name bytes
		const startTimeBytes = new Uint8Array(8);
		const view = new DataView(startTimeBytes.buffer);
		view.setBigUint64(0, BigInt(params.startTime), true); // little-endian

		const domainNameBytes = new TextEncoder().encode(domainName);
		const encryptionId = new Uint8Array(startTimeBytes.length + domainNameBytes.length);
		encryptionId.set(startTimeBytes, 0);
		encryptionId.set(domainNameBytes, startTimeBytes.length);

		this.transaction.add(
			auction.sealApprove({
				package: config.packageId,
				arguments: {
					id: Array.from(encryptionId),
					auctionTable: config.auctionTableId,
				},
				typeArguments: [params.coinType],
			}),
		);
	}
}
