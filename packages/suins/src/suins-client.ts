// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
import { isValidSuiNSName, normalizeSuiNSName } from '@mysten/sui/utils';

import { mainPackage } from './constants.js';
import {
	getCoinDiscountConfigType,
	getConfigType,
	getDomainType,
	getPricelistConfigType,
	getRenewalPricelistConfigType,
	isSubName,
	validateYears,
} from './helpers.js';
import { SuiPriceServiceConnection, SuiPythClient } from './pyth/pyth.js';
import type { NameRecord, SuinsClientExtensionConfig } from './types.js';
import type {
	CoinTypeDiscount,
	PackageInfo,
	SuinsClientConfig,
	SuiNSCompatibleClient,
	SuinsPriceList,
} from './types.js';
import { SuinsCalls } from './suins-calls.js';
import type { Experimental_SuiClientTypes } from '@mysten/sui/src/experimental/types.js';
import type { BcsType } from '@mysten/sui/bcs';
import {
	NameRecord as NameRecordBcs,
	PaymentsConfig,
	PricingConfig,
	RenewalConfig,
} from './bcs.js';

/// The SuinsClient is the main entry point for the Suins SDK.
/// It allows you to interact with SuiNS.
export class SuinsClient {
	#client: SuiNSCompatibleClient;
	#network: Experimental_SuiClientTypes.Network;
	config: PackageInfo;
	calls: SuinsCalls;

	constructor(config: SuinsClientConfig) {
		this.#client = config.client;
		this.#network = config.network || 'mainnet';

		if (this.#network === 'mainnet') {
			this.config = mainPackage.mainnet;
		} else if (this.#network === 'testnet') {
			this.config = mainPackage.testnet;
		} else {
			throw new Error('Invalid network');
		}

		this.calls = new SuinsCalls(this.config);
	}

	async #loadDynamicField<T extends BcsType<any>>(
		type: T,
		options: Experimental_SuiClientTypes.GetDynamicFieldOptions,
	): Promise<T['$inferType'] | null> {
		const { dynamicField } = await this.#client.core.getDynamicField(options);

		console.log('dynamicField', dynamicField);

		if (!dynamicField) {
			return null;
		}

		return type.parse(dynamicField.value.bcs);
	}

	/**
	 * Returns the price list for SuiNS names in the base asset.
	 */

	// Format:
	// {
	// 	[ 3, 3 ] => 500000000,
	// 	[ 4, 4 ] => 100000000,
	// 	[ 5, 63 ] => 20000000
	// }
	async getPriceList(): Promise<SuinsPriceList> {
		if (!this.config.suins) throw new Error('Suins object ID is not set');
		if (!this.config.packageId) throw new Error('Price list config not found');

		const priceList = await this.#loadDynamicField(PricingConfig, {
			parentId: this.config.suins,
			name: {
				type: getConfigType(
					this.config.packageIdV1,
					getPricelistConfigType(this.config.packageIdPricing),
				),
				bcs: new Uint8Array([]),
			},
		});

		console.log('priceList', priceList);

		if (!priceList) {
			throw new Error('Pricing fields not found in the price list');
		}

		const contentArray = priceList.pricing.contents;
		const priceMap = new Map<[number, number], number>();

		for (const entry of contentArray) {
			priceMap.set([Number(entry.key[0]), Number(entry.key[1])], Number(entry.value));
		}

		return priceMap;
	}

	/**
	 * Returns the renewal price list for SuiNS names in the base asset.
	 */

	// Format:
	// {
	// 	[ 3, 3 ] => 500000000,
	// 	[ 4, 4 ] => 100000000,
	// 	[ 5, 63 ] => 20000000
	// }
	async getRenewalPriceList(): Promise<SuinsPriceList> {
		if (!this.config.suins) throw new Error('Suins object ID is not set');
		if (!this.config.packageId) throw new Error('Price list config not found');

		const priceList = await this.#loadDynamicField(RenewalConfig, {
			parentId: this.config.suins,
			name: {
				type: getConfigType(
					this.config.packageIdV1,
					getRenewalPricelistConfigType(this.config.packageIdPricing),
				),
				bcs: new Uint8Array(),
			},
		});

		if (!priceList) {
			throw new Error('Price list not found or content structure is invalid');
		}

		const contentArray = priceList.config.pricing.contents;
		const priceMap = new Map();

		for (const entry of contentArray) {
			priceMap.set([Number(entry.key[0]), Number(entry.key[1])], Number(entry.value));
		}

		return priceMap;
	}

	/**
	 * Returns the coin discount list for SuiNS names.
	 */

	// Format:
	// {
	// 	'b48aac3f53bab328e1eb4c5b3c34f55e760f2fb3f2305ee1a474878d80f650f0::TESTUSDC::TESTUSDC' => 0,
	// 	'0000000000000000000000000000000000000000000000000000000000000002::sui::SUI' => 0,
	// 	'b48aac3f53bab328e1eb4c5b3c34f55e760f2fb3f2305ee1a474878d80f650f0::TESTNS::TESTNS' => 25
	// }
	async getCoinTypeDiscount(): Promise<CoinTypeDiscount> {
		if (!this.config.suins) throw new Error('Suins object ID is not set');
		if (!this.config.packageId) throw new Error('Price list config not found');

		const dfValue = await this.#loadDynamicField(PaymentsConfig, {
			parentId: this.config.suins,
			name: {
				type: getConfigType(
					this.config.packageIdV1,
					getCoinDiscountConfigType(this.config.payments.packageId),
				),
				bcs: new Uint8Array(),
			},
		});

		if (!dfValue) {
			throw new Error('dfValue not found or content structure is invalid');
		}

		const currencyDiscounts = dfValue.currencies.contents;
		const discountMap = new Map();

		for (const entry of currencyDiscounts) {
			const key = entry.key;
			const value = Number(entry.value.discount_percentage);

			discountMap.set(key, value);
		}

		return discountMap;
	}

	async getNameRecord(name: string): Promise<NameRecord | null> {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		if (!this.config.registryTableId) throw new Error('Suins package ID is not set');

		const nameRecord = await this.#loadDynamicField(NameRecordBcs, {
			parentId: this.config.registryTableId,
			name: {
				type: getDomainType(this.config.packageIdV1),
				bcs: new Uint8Array(),
			},
		});

		if (!nameRecord) {
			return null;
		}

		const data: Record<string, string> = {};
		nameRecord.data.contents.forEach((item) => {
			data[item.key as string] = item.value;
		});

		return {
			name,
			nftId: nameRecord.nft_id,
			targetAddress: nameRecord.target_address!,
			expirationTimestampMs: Number.parseInt(nameRecord.expiration_timestamp_ms),
			data,
			avatar: data.avatar,
			contentHash: data.content_hash,
			walrusSiteId: data.walrus_site_id,
		};
	}

	/**
	 * Calculates the registration or renewal price for an SLD (Second Level Domain).
	 * It expects a domain name, the number of years and a `SuinsPriceList` object,
	 * as returned from `suinsClient.getPriceList()` function, or `suins.getRenewalPriceList()` function.
	 *
	 * It throws an error:
	 * 1. if the name is a subdomain
	 * 2. if the name is not a valid SuiNS name
	 * 3. if the years are not between 1 and 5
	 */
	async calculatePrice({
		name,
		years,
		isRegistration = true,
	}: {
		name: string;
		years: number;
		isRegistration?: boolean;
	}) {
		if (!isValidSuiNSName(name)) {
			throw new Error('Invalid SuiNS name');
		}
		validateYears(years);

		if (isSubName(name)) {
			throw new Error('Subdomains do not have a registration fee');
		}

		const length = normalizeSuiNSName(name, 'dot').split('.')[0].length;
		const priceList = await this.getPriceList();
		const renewalPriceList = await this.getRenewalPriceList();
		let yearsRemain = years;
		let price = 0;

		if (isRegistration) {
			for (const [[minLength, maxLength], pricePerYear] of priceList.entries()) {
				if (length >= minLength && length <= maxLength) {
					price += pricePerYear; // Registration is always 1 year
					yearsRemain -= 1;
					break;
				}
			}
		}

		for (const [[minLength, maxLength], pricePerYear] of renewalPriceList.entries()) {
			if (length >= minLength && length <= maxLength) {
				price += yearsRemain * pricePerYear;
				break;
			}
		}

		return price;
	}

	async getPriceInfoObject(tx: Transaction, feed: string) {
		// Initialize connection to the Sui Price Service
		const endpoint =
			this.#network === 'testnet'
				? 'https://hermes-beta.pyth.network'
				: 'https://hermes.pyth.network';
		const connection = new SuiPriceServiceConnection(endpoint);

		// List of price feed IDs
		const priceIDs = [
			feed, // ASSET/USD price ID
		];

		// Fetch price feed update data
		const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIDs);

		// Initialize Sui Client and Pyth Client
		const wormholeStateId = this.config.pyth.wormholeStateId;
		const pythStateId = this.config.pyth.pythStateId;

		const client = new SuiPythClient(this.#client, pythStateId, wormholeStateId);

		return await client.updatePriceFeeds(tx, priceUpdateData, priceIDs); // returns priceInfoObjectIds
	}

	async getObjectType(objectId: string) {
		// Fetch the object details from the Sui client
		const {
			objects: [object],
		} = await this.#client.core.getObjects({
			objectIds: [objectId],
		});

		// Extract and return the type if available
		if (!(object instanceof Error)) {
			return object.type;
		}

		// Throw an error if the type is not found
		throw new Error(`Type information not found for object ID: ${objectId}`);
	}

	static experimental_asClientExtension({ network, config }: SuinsClientExtensionConfig = {}) {
		return {
			name: 'suins' as const,
			register: (client: SuiNSCompatibleClient) => {
				return new SuinsClient({ client, network: network || client.network, config });
			},
		};
	}
}
