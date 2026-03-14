// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import type { TransactionObjectArgument, TransactionObjectInput } from '@mysten/sui/transactions';

// Interfaces
// -----------------

export interface CoinConfig {
	type: string;
	feed: string;
}

export interface DiscountInfo {
	discountNft: TransactionObjectInput;
	type: string;
	isFreeClaim?: boolean;
}

export interface MarketplacePackageInfo {
	packageId: string;
	originalPackageId: string;
	auctionTableId: string;
	offerTableId: string;
}

export interface PackageInfo {
	packageId: string;
	packageIdV1: string;
	packageIdPricing: string;
	suins: string;
	discountsPackage: {
		packageId: string;
		discountHouseId: string;
	};
	subNamesPackageId: string;
	tempSubdomainsProxyPackageId: string;
	coupons: {
		packageId: string;
	};
	payments: {
		packageId: string;
	};
	bbb: {
		packageId: string;
		vault: string;
	};
	registryTableId?: string;
	pyth: {
		pythStateId: string;
		wormholeStateId: string;
	};
	utils?: {
		packageId: string;
	};
	coins: Record<string, CoinConfig>;
	marketplace?: MarketplacePackageInfo;
}

export interface NameRecord {
	name: string;
	nftId: string;
	targetAddress: string;
	expirationTimestampMs: number;
	data: Record<string, string>;
	avatar?: string;
	contentHash?: string;
	walrusSiteId?: string;
}

// Types
// -----------------

export type VersionedPackageId = {
	latest: string;
	v1: string;
	[key: string]: string;
};

export type Config = Record<'mainnet' | 'testnet', PackageInfo>;

export type BaseParams = {
	years: number;
	coinConfig: CoinConfig;
	coin?: TransactionObjectInput;
	couponCode?: string;
	discountInfo?: DiscountInfo;
	maxAmount?: bigint;
	priceInfoObjectId?: string | null;
};

export type RegistrationParams = BaseParams & {
	domain: string;
};

export type RenewalParams = BaseParams & {
	nft: TransactionObjectInput;
};

export type ReceiptParams = {
	paymentIntent: TransactionObjectArgument;
	priceAfterDiscount: TransactionObjectArgument;
	coinConfig: CoinConfig;
	coin?: TransactionObjectInput;
	maxAmount?: bigint;
	priceInfoObjectId?: string | null;
};

export type SuinsClientConfig = {
	client: ClientWithCoreApi;
	network?: SuiClientTypes.Network;
	packageInfo?: PackageInfo;
};

export type SuinsPriceList = Map<[number, number], number>;

export type CoinTypeDiscount = Map<string, number>;

// Marketplace types
// -----------------

export type CreateListingParams = {
	/** The coin type to list in (e.g. '0x2::sui::SUI') */
	coinType: string;
	/** The fixed price for the listing (in base units of the coin) */
	price: bigint;
	/** Optional expiration timestamp in seconds */
	expiresAt?: number;
	/** The SuinsRegistration NFT to list */
	suinsRegistration: TransactionObjectInput;
};

export type BuyListingParams = {
	/** The coin type the listing is priced in */
	coinType: string;
	/** The domain name (e.g. 'example.sui') */
	domainName: string;
	/** The payment coin (must match the listing price exactly) */
	payment: TransactionObjectInput;
};

export type CancelListingParams = {
	/** The coin type the listing was created with */
	coinType: string;
	/** The domain name to cancel the listing for */
	domainName: string;
};

export type PlaceOfferParams = {
	/** The coin type for the offer (e.g. '0x2::sui::SUI') */
	coinType: string;
	/** The domain name to make an offer on (e.g. 'example.sui') */
	domainName: string;
	/** The payment coin for the offer */
	coin: TransactionObjectInput;
	/** Optional expiration timestamp in seconds */
	expiresAt?: number;
};

export type CancelOfferParams = {
	/** The coin type of the offer */
	coinType: string;
	/** The domain name the offer was placed on */
	domainName: string;
};

export type AcceptOfferParams = {
	/** The coin type of the offer being accepted */
	coinType: string;
	/** The SuinsRegistration NFT to transfer to the buyer */
	suinsRegistration: TransactionObjectInput;
	/** The address of the offer maker (buyer) */
	buyerAddress: string;
};

export type DeclineOfferParams = {
	/** The coin type of the offer being declined */
	coinType: string;
	/** The SuinsRegistration NFT (read-only reference) */
	suinsRegistration: TransactionObjectInput;
	/** The address of the offer maker to refund */
	buyerAddress: string;
};

export type MakeCounterOfferParams = {
	/** The coin type of the original offer */
	coinType: string;
	/** The SuinsRegistration NFT (read-only reference) */
	suinsRegistration: TransactionObjectInput;
	/** The address of the original offer maker */
	buyerAddress: string;
	/** The counter offer value (must be higher than original offer) */
	counterOfferValue: bigint;
};

export type AcceptCounterOfferParams = {
	/** The coin type of the counter offer */
	coinType: string;
	/** The domain name */
	domainName: string;
	/** The top-up payment coin (counter_offer_value - original_offer_value) */
	coin: TransactionObjectInput;
};

// Auction types
// -------------

export type CreateAuctionParams = {
	/** The coin type for the auction (e.g. '0x2::sui::SUI') */
	coinType: string;
	/** Auction start time as a Unix timestamp in seconds */
	startTime: number;
	/** Auction end time as a Unix timestamp in seconds */
	endTime: number;
	/** Minimum bid amount in base units of the coin */
	minBid: bigint;
	/** The SuinsRegistration NFT to auction */
	suinsRegistration: TransactionObjectInput;
	/**
	 * Optional encrypted reserve price as a byte array (pre-encrypted using Seal).
	 * If not provided, the auction will have no reserve price.
	 */
	encryptedReservePrice?: number[] | Uint8Array;
};

export type PlaceBidParams = {
	/** The coin type the auction is denominated in */
	coinType: string;
	/** The domain name being auctioned (e.g. 'example.sui') */
	domainName: string;
	/** The bid payment coin */
	bid: TransactionObjectInput;
};

export type FinalizeAuctionParams = {
	/** The coin type the auction is denominated in */
	coinType: string;
	/** The domain name to finalize (e.g. 'example.sui') */
	domainName: string;
	/**
	 * Optional derived keys from Seal key servers for decrypting the reserve price.
	 * Required only if the auction has an encrypted reserve price.
	 */
	derivedKeys?: number[][];
	/**
	 * Optional key server addresses corresponding to the derived keys.
	 * Required only if the auction has an encrypted reserve price.
	 */
	keyServers?: string[];
};

export type CancelAuctionParams = {
	/** The coin type the auction is denominated in */
	coinType: string;
	/** The domain name to cancel the auction for */
	domainName: string;
};

export type SealApproveParams = {
	/** The coin type the auction is denominated in */
	coinType: string;
	/** The domain name being auctioned */
	domainName: string;
	/** The auction start time in seconds (must match the on-chain auction) */
	startTime: number;
};
