// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import { isValidSuiNSName, normalizeSuiNSName } from '@mysten/sui/utils';

import { mainPackage } from './constants.js';
import { isSubName, validateYears } from './helpers.js';
import { SuiPriceServiceConnection, SuiPythClient } from './pyth/pyth.js';
import type {
	CoinTypeDiscount,
	NameRecord,
	Network,
	PackageInfo,
	SuinsClientConfig,
	SuinsPriceList,
} from './types.js';

import { ConfigKey } from './contracts/suins/suins.js';
import { Domain } from './contracts/suins/domain.js';
import { NameRecord as NameRecordBcs } from './contracts/suins/name_record.js';
import { PricingConfig, RenewalConfig } from './contracts/suins/pricing_config.js';
import { PaymentsConfig } from './contracts/suins_payments/payments.js';

export class SuinsClient {
	client: ClientWithCoreApi;
	network: Network;
	config: PackageInfo;

	constructor(config: SuinsClientConfig) {
		this.client = config.client;
		this.network = config.network || 'mainnet';

		if (this.network === 'mainnet') {
			this.config = mainPackage.mainnet;
		} else if (this.network === 'testnet') {
			this.config = mainPackage.testnet;
		} else {
			throw new Error('Invalid network');
		}
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

		const configType = `${this.config.packageIdV1}::suins::ConfigKey<${this.config.packageIdPricing}::pricing_config::PricingConfig>`;
		const nameBytes = ConfigKey.serialize({ dummy_field: false }).toBytes();

		const result = await this.client.core.getDynamicField({
			parentId: this.config.suins,
			name: { type: configType, bcs: nameBytes },
		});

		if (!result.dynamicField?.value?.bcs) {
			throw new Error('Price list not found or content is invalid');
		}

		const pricingConfig = PricingConfig.parse(result.dynamicField.value.bcs);
		const priceMap = new Map();

		for (const entry of pricingConfig.pricing.contents) {
			const key = [Number(entry.key[0]), Number(entry.key[1])];
			const value = Number(entry.value);
			priceMap.set(key, value);
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

		const configType = `${this.config.packageIdV1}::suins::ConfigKey<${this.config.packageIdPricing}::pricing_config::RenewalConfig>`;
		const nameBytes = ConfigKey.serialize({ dummy_field: false }).toBytes();

		const result = await this.client.core.getDynamicField({
			parentId: this.config.suins,
			name: { type: configType, bcs: nameBytes },
		});

		if (!result.dynamicField?.value?.bcs) {
			throw new Error('Price list not found or content structure is invalid');
		}

		const renewalConfig = RenewalConfig.parse(result.dynamicField.value.bcs);
		const priceMap = new Map();

		for (const entry of renewalConfig.config.pricing.contents) {
			const key = [Number(entry.key[0]), Number(entry.key[1])];
			const value = Number(entry.value);
			priceMap.set(key, value);
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

		const configType = `${this.config.packageIdV1}::suins::ConfigKey<${this.config.payments.packageId}::payments::PaymentsConfig>`;

		const result = await this.client.core.getDynamicField({
			parentId: this.config.suins,
			name: { type: configType, bcs: ConfigKey.serialize({ dummy_field: false }).toBytes() },
		});

		if (!result.dynamicField?.value?.bcs) {
			throw new Error('Payments config not found or content structure is invalid');
		}

		const paymentsConfig = PaymentsConfig.parse(result.dynamicField.value.bcs);
		const discountMap = new Map();

		for (const entry of paymentsConfig.currencies.contents) {
			const key = entry.key.name;
			const value = Number(entry.value.discount_percentage);
			discountMap.set(key, value);
		}

		return discountMap;
	}

	async getNameRecord(name: string): Promise<NameRecord | null> {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		if (!this.config.registryTableId) throw new Error('Suins package ID is not set');

		const labels = normalizeSuiNSName(name, 'dot').split('.').reverse();

		const result = await this.client.core.getDynamicField({
			parentId: this.config.registryTableId,
			name: {
				type: `${this.config.packageIdV1}::domain::Domain`,
				bcs: Domain.serialize({ labels }).toBytes(),
			},
		});

		if (!result.dynamicField) return null;

		if (!result.dynamicField.value?.bcs) {
			throw new Error('Name record not found. This domain is not registered.');
		}

		const record = NameRecordBcs.parse(result.dynamicField.value.bcs);

		const data: Record<string, string> = {};
		for (const entry of record.data.contents) {
			data[entry.key] = entry.value;
		}

		return {
			name,
			nftId: record.nft_id,
			targetAddress: record.target_address ?? '',
			expirationTimestampMs: Number(record.expiration_timestamp_ms),
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

	async getPriceInfoObject(tx: Transaction, feed: string, feeCoin?: TransactionObjectArgument) {
		const endpoint =
			this.network === 'testnet'
				? 'https://hermes-beta.pyth.network'
				: 'https://hermes.pyth.network';
		const connection = new SuiPriceServiceConnection(endpoint);
		const priceIDs = [feed];
		const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIDs);

		const client = new SuiPythClient(
			this.client,
			this.config.pyth.pythStateId,
			this.config.pyth.wormholeStateId,
		);

		return client.updatePriceFeeds(tx, priceUpdateData, priceIDs, feeCoin);
	}

	async getPythBaseUpdateFee(): Promise<number> {
		const client = new SuiPythClient(
			this.client,
			this.config.pyth.pythStateId,
			this.config.pyth.wormholeStateId,
		);
		return client.getBaseUpdateFee();
	}

	async getObjectType(objectId: string) {
		const result = await this.client.core.getObject({ objectId });

		if (result.object?.type) {
			return result.object.type;
		}

		throw new Error(`Type information not found for object ID: ${objectId}`);
	}
}
