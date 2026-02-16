// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { normalizeSuiNSName } from '@mysten/sui/utils';

import type { SuinsClient } from './suins-client.js';
import type { MarketplacePackageInfo } from './types.js';

// ─── Response Types ───────────────────────────────────────────────

export type ListingData = {
	/** Object ID of the listing */
	objectId: string;
	/** Address of the listing owner */
	owner: string;
	/** Listing price in base units */
	price: string;
	/** Optional expiration timestamp in seconds */
	expiresAt: string | null;
	/** The SuinsRegistration NFT ID held by the listing */
	suinsRegistrationId: string;
};

export type AuctionData = {
	/** Object ID of the auction */
	objectId: string;
	/** Address of the auction owner */
	owner: string;
	/** Start time as Unix timestamp in seconds */
	startTime: string;
	/** End time as Unix timestamp in seconds */
	endTime: string;
	/** Minimum bid amount in base units */
	minBid: string;
	/** Whether the auction has an encrypted reserve price */
	hasReservePrice: boolean;
	/** Address of the current highest bidder */
	highestBidder: string;
	/** Current highest bid value in base units */
	highestBidValue: string;
	/** The SuinsRegistration NFT ID held by the auction */
	suinsRegistrationId: string;
};

export type OfferData = {
	/** Offer value in base units */
	value: string;
	/** Counter offer value set by the domain owner (0 if none) */
	counterOffer: string;
	/** Optional expiration timestamp in seconds */
	expiresAt: string | null;
};

export type SealConfig = {
	/** Key server object addresses */
	keyServers: string[];
	/** Public keys for each key server (as hex strings) */
	publicKeys: string[];
	/** Threshold for the vote */
	threshold: number;
};

// ─── Marketplace Client ───────────────────────────────────────────

/**
 * Read-only client for querying marketplace state from on-chain data.
 *
 * All methods are pure RPC reads — no gas, no signing, no wallet required.
 *
 * @example
 * ```ts
 * const suinsClient = new SuinsClient({ client, network: 'testnet' });
 * const marketplace = new SuinsMarketplaceClient(suinsClient);
 *
 * const listing = await marketplace.getListing('example.sui');
 * const auction = await marketplace.getAuction('example.sui');
 * const sealConfig = await marketplace.getSealConfig();
 * ```
 */
export class SuinsMarketplaceClient {
	suinsClient: SuinsClient;

	constructor(client: SuinsClient) {
		this.suinsClient = client;
	}

	private get marketplaceConfig(): MarketplacePackageInfo {
		const config = this.suinsClient.config.marketplace;
		if (!config) {
			throw new Error(
				'Marketplace config is not set. Make sure you are using a network that supports marketplace operations.',
			);
		}
		return config;
	}

	// ─── Listings ─────────────────────────────────────────────────

	/**
	 * Fetches a fixed-price listing for a domain.
	 *
	 * Looks up the domain in the OfferTable's `listings` ObjectBag,
	 * then fetches the child Listing object.
	 *
	 * @param domainName - The domain name (e.g. 'example.sui')
	 * @returns The listing data, or null if no listing exists
	 */
	async getListing(domainName: string): Promise<ListingData | null> {
		const normalizedName = normalizeSuiNSName(domainName, 'dot');

		try {
			// 1. Get the inner ObjectBag ID for listings
			const listingsId = await this.getOfferListingsId();
			if (!listingsId) return null;

			// 2. Look up the child object in the ObjectBag
			const domainNameBytes = new TextEncoder().encode(normalizedName);
			const nameBcs = bcs.vector(bcs.u8()).serialize(Array.from(domainNameBytes)).toBytes();

			const result = await this.suinsClient.client.core.getDynamicField({
				parentId: listingsId,
				name: { type: 'vector<u8>', bcs: nameBcs },
			});

			if (!result.dynamicField?.value?.bcs) {
				return null;
			}

			// 3. Fetch the child Listing object content
			const objectId = bcs.Address.parse(result.dynamicField.value.bcs);

			const objResult = await this.suinsClient.client.core.getObject({
				objectId,
				include: { json: true },
			});

			if (!objResult.object?.json) {
				return null;
			}

			return this.parseListingJson(objectId, objResult.object.json);
		} catch {
			return null;
		}
	}

	// ─── Auctions ─────────────────────────────────────────────────

	/**
	 * Fetches an auction for a domain.
	 *
	 * Looks up the domain in the AuctionTable's `bag` ObjectBag,
	 * then fetches the child Auction object.
	 *
	 * @param domainName - The domain name (e.g. 'example.sui')
	 * @returns The auction data, or null if no auction exists
	 */
	async getAuction(domainName: string): Promise<AuctionData | null> {
		const normalizedName = normalizeSuiNSName(domainName, 'dot');

		try {
			const bagId = await this.getAuctionBagId();
			if (!bagId) return null;

			const domainNameBytes = new TextEncoder().encode(normalizedName);
			const nameBcs = bcs.vector(bcs.u8()).serialize(Array.from(domainNameBytes)).toBytes();

			const result = await this.suinsClient.client.core.getDynamicField({
				parentId: bagId,
				name: { type: 'vector<u8>', bcs: nameBcs },
			});

			if (!result.dynamicField?.value?.bcs) {
				return null;
			}

			const objectId = bcs.Address.parse(result.dynamicField.value.bcs);

			const objResult = await this.suinsClient.client.core.getObject({
				objectId,
				include: { json: true },
			});

			if (!objResult.object?.json) {
				return null;
			}

			return this.parseAuctionJson(objectId, objResult.object.json);
		} catch {
			return null;
		}
	}

	// ─── Seal Config ──────────────────────────────────────────────

	/**
	 * Fetches the Seal encryption configuration from the AuctionTable.
	 *
	 * This is needed before encrypting a reserve price for `createAuction`
	 * or before calling `sealApprove` + `getDerivedKeys` for finalization.
	 *
	 * @returns The Seal configuration (key servers, public keys, threshold)
	 */
	async getSealConfig(): Promise<SealConfig> {
		const config = this.marketplaceConfig;

		const result = await this.suinsClient.client.core.getObject({
			objectId: config.auctionTableId,
			include: { json: true },
		});

		if (!result.object?.json) {
			throw new Error('Failed to fetch AuctionTable');
		}

		const json = result.object.json;
		const keyServers = (json.key_servers as string[]) || [];
		const publicKeys = (json.public_keys as string[]) || [];
		const threshold = Number(json.threshold || 0);

		if (keyServers.length === 0 || publicKeys.length === 0 || threshold === 0) {
			throw new Error('Seal configuration not set in AuctionTable');
		}

		return { keyServers, publicKeys, threshold };
	}

	// ─── Service Fee ──────────────────────────────────────────────

	/**
	 * Fetches the current service fee percentage from the OfferTable.
	 *
	 * The fee is expressed in basis points out of 100,000.
	 * For example, 2,500 = 2.5%.
	 *
	 * @returns The service fee as a number
	 */
	async getOfferServiceFee(): Promise<number> {
		const config = this.marketplaceConfig;

		const result = await this.suinsClient.client.core.getObject({
			objectId: config.offerTableId,
			include: { json: true },
		});

		if (!result.object?.json) {
			throw new Error('Failed to fetch OfferTable');
		}

		return Number(result.object.json.service_fee || 0);
	}

	/**
	 * Fetches the current service fee percentage from the AuctionTable.
	 *
	 * @returns The service fee as a number
	 */
	async getAuctionServiceFee(): Promise<number> {
		const config = this.marketplaceConfig;

		const result = await this.suinsClient.client.core.getObject({
			objectId: config.auctionTableId,
			include: { json: true },
		});

		if (!result.object?.json) {
			throw new Error('Failed to fetch AuctionTable');
		}

		return Number(result.object.json.service_fee || 0);
	}

	// ─── Helpers ──────────────────────────────────────────────────

	private async getOfferListingsId(): Promise<string | null> {
		const config = this.marketplaceConfig;
		const result = await this.suinsClient.client.core.getObject({
			objectId: config.offerTableId,
			include: { json: true },
		});

		if (!result.object?.json) return null;

		const json = result.object.json as Record<string, unknown>;
		const listings = json.listings as Record<string, unknown> | undefined;
		const id = (listings?.fields as Record<string, unknown>)?.id as
			| Record<string, unknown>
			| undefined;
		return id?.id ? String(id.id) : null;
	}

	private async getAuctionBagId(): Promise<string | null> {
		const config = this.marketplaceConfig;
		const result = await this.suinsClient.client.core.getObject({
			objectId: config.auctionTableId,
			include: { json: true },
		});

		if (!result.object?.json) return null;

		const json = result.object.json as Record<string, unknown>;
		const bag = json.bag as Record<string, unknown> | undefined;
		const id = (bag?.fields as Record<string, unknown>)?.id as Record<string, unknown> | undefined;
		return id?.id ? String(id.id) : null;
	}

	// ─── Private parsers ──────────────────────────────────────────

	private parseListingJson(objectId: string, json: Record<string, unknown>): ListingData {
		const expiresAtObj = json.expires_at as Record<string, unknown> | null;
		let expiresAtValue: string | null = null;
		if (expiresAtObj) {
			const vec = expiresAtObj.vec as unknown[] | undefined;
			if (vec && vec.length > 0) {
				expiresAtValue = String(vec[0]);
			}
		}

		const suinsReg = json.suins_registration as Record<string, unknown> | undefined;
		const suinsRegId = suinsReg
			? String((suinsReg.id as Record<string, unknown>)?.id ?? suinsReg.id ?? '')
			: '';

		return {
			objectId,
			owner: String(json.owner ?? ''),
			price: String(json.price ?? '0'),
			expiresAt: expiresAtValue,
			suinsRegistrationId: suinsRegId,
		};
	}

	private parseAuctionJson(objectId: string, json: Record<string, unknown>): AuctionData {
		const reservePrice = json.reserve_price as Record<string, unknown> | null;
		let hasReservePrice = false;
		if (reservePrice) {
			const vec = reservePrice.vec as unknown[] | undefined;
			hasReservePrice = !!vec && vec.length > 0;
		}

		const highestBidBalance = json.highest_bid_balance as Record<string, unknown> | undefined;
		const bidValue = highestBidBalance ? String(highestBidBalance.value ?? '0') : '0';

		const suinsReg = json.suins_registration as Record<string, unknown> | undefined;
		const suinsRegId = suinsReg
			? String((suinsReg.id as Record<string, unknown>)?.id ?? suinsReg.id ?? '')
			: '';

		return {
			objectId,
			owner: String(json.owner ?? ''),
			startTime: String(json.start_time ?? '0'),
			endTime: String(json.end_time ?? '0'),
			minBid: String(json.min_bid ?? '0'),
			hasReservePrice,
			highestBidder: String(json.highest_bidder ?? ''),
			highestBidValue: bidValue,
			suinsRegistrationId: suinsRegId,
		};
	}
}
