// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	Transaction,
	TransactionObjectArgument,
	TransactionObjectInput,
} from '@mysten/sui/transactions';
import { isValidSuiNSName, normalizeSuiNSName, SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

import { ALLOWED_METADATA, MAX_U64 } from './constants.js';
import { isNestedSubName, isSubName, zeroCoin } from './helpers.js';
import type { SuinsClient } from './suins-client.js';
import type {
	DiscountInfo,
	PackageInfo,
	ReceiptParams,
	RegistrationParams,
	RenewalParams,
} from './types.js';

import * as payment from './contracts/suins/payment.js';
import * as controller from './contracts/suins/controller.js';
import * as paymentsModule from './contracts/suins_payments/payments.js';
import * as couponHouse from './contracts/suins_coupons/coupon_house.js';
import * as discounts from './contracts/suins_discounts/discounts.js';
import * as freeClaims from './contracts/suins_discounts/free_claims.js';
import * as subdomainProxy from './contracts/suins_temp_subdomain_proxy/subdomain_proxy.js';
import type { SuinsConfig } from './contracts/suins/config-arguments.js';
import type { SuinsCouponsConfig } from './contracts/suins_coupons/config-arguments.js';
import type { SuinsDiscountsConfig } from './contracts/suins_discounts/config-arguments.js';
import type { SuinsPaymentsConfig } from './contracts/suins_payments/config-arguments.js';
import type { SuinsTempSubdomainProxyConfig } from './contracts/suins_temp_subdomain_proxy/config-arguments.js';

function suinsConfig(config: PackageInfo): SuinsConfig {
	return config;
}

function paymentsConfig(config: PackageInfo): SuinsPaymentsConfig {
	return {
		packageId: config.payments.packageId,
		suins: config.suins,
		bbbVault: config.bbb.vault,
	};
}

function couponsConfig(config: PackageInfo): SuinsCouponsConfig {
	return {
		packageId: config.coupons.packageId,
		suins: config.suins,
	};
}

function discountsConfig(config: PackageInfo): SuinsDiscountsConfig {
	return {
		packageId: config.discountsPackage.packageId,
		suins: config.suins,
		discountHouseId: config.discountsPackage.discountHouseId,
	};
}

function subdomainProxyConfig(config: PackageInfo): SuinsTempSubdomainProxyConfig {
	return config;
}

export class SuinsTransaction {
	suinsClient: SuinsClient;
	transaction: Transaction;

	constructor(client: SuinsClient, transaction: Transaction) {
		this.suinsClient = client;
		this.transaction = transaction;
	}

	/**
	 * Registers a domain for a number of years.
	 */
	register(params: RegistrationParams): TransactionObjectArgument {
		if (params.couponCode && params.discountInfo) {
			throw new Error('Cannot apply both coupon and discount NFT');
		}

		const paymentIntent = this.initRegistration(params.domain);
		if (params.couponCode) {
			this.applyCoupon(paymentIntent, params.couponCode);
		}
		if (params.discountInfo) {
			this.applyDiscount(paymentIntent, params.discountInfo);
		}
		const priceAfterDiscount = this.calculatePriceAfterDiscount(
			paymentIntent,
			params.coinConfig.type,
		);
		const receipt = this.generateReceipt({
			paymentIntent,
			priceAfterDiscount,
			coinConfig: params.coinConfig,
			coin: params.coin,
			maxAmount: params.maxAmount,
			priceInfoObjectId: params.priceInfoObjectId,
		});
		const nft = this.finalizeRegister(receipt);

		if (params.years > 1) {
			this.renew({
				nft,
				years: params.years - 1,
				coinConfig: params.coinConfig,
				coin: params.coin,
				couponCode: params.couponCode,
				discountInfo: params.discountInfo,
				maxAmount: params.maxAmount,
				priceInfoObjectId: params.priceInfoObjectId,
			});
		}

		return nft as TransactionObjectArgument;
	}

	/**
	 * Renews an NFT for a number of years.
	 */
	renew(params: RenewalParams): void {
		if (params.couponCode && params.discountInfo) {
			throw new Error('Cannot apply both coupon and discount NFT');
		}

		const paymentIntent = this.initRenewal(params.nft, params.years);
		if (params.couponCode) {
			this.applyCoupon(paymentIntent, params.couponCode);
		}
		if (params.discountInfo) {
			this.applyDiscount(paymentIntent, params.discountInfo);
		}
		const priceAfterDiscount = this.calculatePriceAfterDiscount(
			paymentIntent,
			params.coinConfig.type,
		);
		const receipt = this.generateReceipt({
			paymentIntent,
			priceAfterDiscount,
			coinConfig: params.coinConfig,
			coin: params.coin,
			maxAmount: params.maxAmount,
			priceInfoObjectId: params.priceInfoObjectId,
		});
		this.finalizeRenew(receipt, params.nft);
	}

	initRegistration(domain: string): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			payment.initRegistration({
				config: suinsConfig(config),
				arguments: { domain },
			}),
		);
	}

	initRenewal(nft: TransactionObjectInput, years: number): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			payment.initRenewal({
				config: suinsConfig(config),
				arguments: { nft: this.transaction.object(nft), years },
			}),
		);
	}

	calculatePrice(
		baseAmount: TransactionObjectArgument,
		paymentType: string,
		priceInfoObjectId: string,
	): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			paymentsModule.calculatePrice({
				config: paymentsConfig(config),
				arguments: {
					baseAmount,
					priceInfoObject: priceInfoObjectId,
				},
				typeArguments: [paymentType],
			}),
		);
	}

	handleBasePayment(
		paymentIntent: TransactionObjectArgument,
		paymentArg: TransactionObjectArgument,
		paymentType: string,
	): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			paymentsModule.handleBasePayment({
				config: paymentsConfig(config),
				arguments: {
					intent: paymentIntent,
					payment: paymentArg,
				},
				typeArguments: [paymentType],
			}),
		);
	}

	handlePayment(
		paymentIntent: TransactionObjectArgument,
		paymentArg: TransactionObjectArgument,
		paymentType: string,
		priceInfoObjectId: string,
		maxAmount: bigint = MAX_U64,
	): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			paymentsModule.handlePayment({
				config: paymentsConfig(config),
				arguments: {
					intent: paymentIntent,
					payment: paymentArg,
					priceInfoObject: priceInfoObjectId,
					userPriceGuard: maxAmount,
				},
				typeArguments: [paymentType],
			}),
		);
	}

	finalizeRegister(receipt: TransactionObjectArgument): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			payment.register({
				config: suinsConfig(config),
				arguments: { receipt },
			}),
		);
	}

	finalizeRenew(
		receipt: TransactionObjectArgument,
		nft: TransactionObjectInput,
	): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			payment.renew({
				config: suinsConfig(config),
				arguments: { receipt, nft: this.transaction.object(nft) },
			}),
		);
	}

	calculatePriceAfterDiscount(
		paymentIntent: TransactionObjectArgument,
		paymentType: string,
	): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			paymentsModule.calculatePriceAfterDiscount({
				config: paymentsConfig(config),
				arguments: { intent: paymentIntent },
				typeArguments: [paymentType],
			}),
		);
	}

	generateReceipt(params: ReceiptParams): TransactionObjectArgument {
		const baseAssetPurchase = params.coinConfig.feed === '';
		if (baseAssetPurchase) {
			const payment = params.coin
				? this.transaction.splitCoins(this.transaction.object(params.coin), [
						params.priceAfterDiscount,
					])
				: zeroCoin(this.transaction, params.coinConfig.type);
			const receipt = this.handleBasePayment(params.paymentIntent, payment, params.coinConfig.type);
			return receipt;
		} else {
			const priceInfoObjectId = params.priceInfoObjectId;
			if (!priceInfoObjectId)
				throw new Error('Price info object ID is required for non-base asset purchases');
			const price = this.calculatePrice(
				params.priceAfterDiscount,
				params.coinConfig.type,
				priceInfoObjectId,
			);
			if (!params.coin) throw new Error('coin input is required');
			const payment = this.transaction.splitCoins(this.transaction.object(params.coin!), [price]);
			const receipt = this.handlePayment(
				params.paymentIntent,
				payment,
				params.coinConfig.type,
				priceInfoObjectId,
				params.maxAmount,
			);
			return receipt;
		}
	}

	/**
	 * Applies a coupon to the payment intent.
	 */
	applyCoupon(intent: TransactionObjectArgument, couponCode: string): TransactionObjectArgument {
		const config = this.suinsClient.config;
		return this.transaction.add(
			couponHouse.applyCoupon({
				config: couponsConfig(config),
				arguments: { intent, couponCode },
			}),
		);
	}

	/**
	 * Applies a discount to the payment intent.
	 */
	applyDiscount(intent: TransactionObjectArgument, discountInfo: DiscountInfo): void {
		const config = this.suinsClient.config;

		if (discountInfo.isFreeClaim) {
			this.transaction.add(
				freeClaims.freeClaim({
					config: discountsConfig(config),
					arguments: {
						intent,
						object: this.transaction.object(discountInfo.discountNft),
					},
					typeArguments: [discountInfo.type],
				}),
			);
		} else {
			this.transaction.add(
				discounts.applyPercentageDiscount({
					config: discountsConfig(config),
					arguments: {
						intent,
						_: this.transaction.object(discountInfo.discountNft),
					},
					typeArguments: [discountInfo.type],
				}),
			);
		}
	}

	/**
	 * Creates a subdomain.
	 */
	createSubName({
		parentNft,
		name,
		expirationTimestampMs,
		allowChildCreation,
		allowTimeExtension,
	}: {
		parentNft: TransactionObjectInput;
		name: string;
		expirationTimestampMs: number;
		allowChildCreation: boolean;
		allowTimeExtension: boolean;
	}) {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		const isParentSubdomain = isNestedSubName(name);
		const config = this.suinsClient.config;
		if (!config.suins) throw new Error('SuiNS Object ID not found');
		if (!config.subNamesPackageId) throw new Error('Subnames package ID not found');
		if (isParentSubdomain && !config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		if (isParentSubdomain) {
			return this.transaction.add(
				subdomainProxy._new({
					config: subdomainProxyConfig(config),
					arguments: {
						subdomain: this.transaction.object(parentNft),
						subdomainName: normalizeSuiNSName(name, 'dot'),
						expirationTimestampMs,
						allowCreation: !!allowChildCreation,
						allowTimeExtension: !!allowTimeExtension,
					},
				}),
			);
		}

		const subNft = this.transaction.moveCall({
			target: `${config.subNamesPackageId}::subdomains::new`,
			arguments: [
				this.transaction.object(config.suins),
				this.transaction.object(parentNft),
				this.transaction.object(SUI_CLOCK_OBJECT_ID),
				this.transaction.pure.string(normalizeSuiNSName(name, 'dot')),
				this.transaction.pure.u64(expirationTimestampMs),
				this.transaction.pure.bool(!!allowChildCreation),
				this.transaction.pure.bool(!!allowTimeExtension),
			],
		});

		return subNft;
	}

	/**
	 * Builds the PTB to create a leaf subdomain.
	 * Parent can be a `SuinsRegistration` or a `SubDomainRegistration` object.
	 * Can be passed in as an ID or a TransactionArgument.
	 */
	createLeafSubName({
		parentNft,
		name,
		targetAddress,
	}: {
		parentNft: TransactionObjectInput;
		name: string;
		targetAddress: string;
	}) {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		const isParentSubdomain = isNestedSubName(name);
		const config = this.suinsClient.config;
		if (!config.suins) throw new Error('SuiNS Object ID not found');
		if (!config.subNamesPackageId) throw new Error('Subnames package ID not found');
		if (isParentSubdomain && !config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		if (isParentSubdomain) {
			this.transaction.add(
				subdomainProxy.newLeaf({
					config: subdomainProxyConfig(config),
					arguments: {
						subdomain: this.transaction.object(parentNft),
						subdomainName: normalizeSuiNSName(name, 'dot'),
						target: targetAddress,
					},
				}),
			);
			return;
		}

		this.transaction.moveCall({
			target: `${config.subNamesPackageId}::subdomains::new_leaf`,
			arguments: [
				this.transaction.object(config.suins),
				this.transaction.object(parentNft),
				this.transaction.object(SUI_CLOCK_OBJECT_ID),
				this.transaction.pure.string(normalizeSuiNSName(name, 'dot')),
				this.transaction.pure.address(targetAddress),
			],
		});
	}

	/**
	 * Removes a leaf subname.
	 */
	removeLeafSubName({ parentNft, name }: { parentNft: TransactionObjectInput; name: string }) {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		const isParentSubdomain = isNestedSubName(name);
		if (!isSubName(name)) throw new Error('This can only be invoked for subnames');
		const config = this.suinsClient.config;
		if (!config.suins) throw new Error('SuiNS Object ID not found');
		if (!config.subNamesPackageId) throw new Error('Subnames package ID not found');
		if (isParentSubdomain && !config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		if (isParentSubdomain) {
			this.transaction.add(
				subdomainProxy.removeLeaf({
					config: subdomainProxyConfig(config),
					arguments: {
						subdomain: this.transaction.object(parentNft),
						subdomainName: normalizeSuiNSName(name, 'dot'),
					},
				}),
			);
			return;
		}

		this.transaction.moveCall({
			target: `${config.subNamesPackageId}::subdomains::remove_leaf`,
			arguments: [
				this.transaction.object(config.suins),
				this.transaction.object(parentNft),
				this.transaction.object(SUI_CLOCK_OBJECT_ID),
				this.transaction.pure.string(normalizeSuiNSName(name, 'dot')),
			],
		});
	}

	/**
	 * Sets the target address of an NFT.
	 */
	setTargetAddress({
		nft, // Can be string or argument
		address,
		isSubname,
	}: {
		nft: TransactionObjectInput;
		address?: string;
		isSubname?: boolean;
	}) {
		const config = this.suinsClient.config;
		if (isSubname && !config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		this.transaction.add(
			isSubname
				? subdomainProxy.setTargetAddress({
						config: subdomainProxyConfig(config),
						arguments: {
							subdomain: this.transaction.object(nft),
							newTarget: address ?? null,
						},
					})
				: controller.setTargetAddress({
						config: suinsConfig(config),
						arguments: {
							nft: this.transaction.object(nft),
							newTarget: address ?? null,
						},
					}),
		);
	}

	/**
	 * Sets a default name for the user.
	 */
	setDefault(name: string) {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		const config = this.suinsClient.config;
		if (!config.suins) throw new Error('SuiNS Object ID not found');

		this.transaction.add(
			controller.setReverseLookup({
				config: suinsConfig(config),
				arguments: {
					domainName: normalizeSuiNSName(name, 'dot'),
				},
			}),
		);
	}

	/**
	 * Edits the setup of a subname.
	 */
	editSetup({
		parentNft,
		name,
		allowChildCreation,
		allowTimeExtension,
	}: {
		parentNft: TransactionObjectInput;
		name: string;
		allowChildCreation: boolean;
		allowTimeExtension: boolean;
	}) {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		const isParentSubdomain = isNestedSubName(name);
		const config = this.suinsClient.config;
		if (!config.suins) throw new Error('SuiNS Object ID not found');
		if (!isParentSubdomain && !config.subNamesPackageId)
			throw new Error('Subnames package ID not found');
		if (isParentSubdomain && !config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		if (isParentSubdomain) {
			this.transaction.add(
				subdomainProxy.editSetup({
					config: subdomainProxyConfig(config),
					arguments: {
						parent: this.transaction.object(parentNft),
						subdomainName: normalizeSuiNSName(name, 'dot'),
						allowCreation: !!allowChildCreation,
						allowTimeExtension: !!allowTimeExtension,
					},
				}),
			);
			return;
		}

		this.transaction.moveCall({
			target: `${config.subNamesPackageId}::subdomains::edit_setup`,
			arguments: [
				this.transaction.object(config.suins),
				this.transaction.object(parentNft),
				this.transaction.object(SUI_CLOCK_OBJECT_ID),
				this.transaction.pure.string(normalizeSuiNSName(name, 'dot')),
				this.transaction.pure.bool(!!allowChildCreation),
				this.transaction.pure.bool(!!allowTimeExtension),
			],
		});
	}

	/**
	 * Extends the expiration of a subname.
	 */
	extendExpiration({
		nft,
		expirationTimestampMs,
	}: {
		nft: TransactionObjectInput;
		expirationTimestampMs: number;
	}) {
		const config = this.suinsClient.config;
		if (!config.suins) throw new Error('SuiNS Object ID not found');
		if (!config.subNamesPackageId) throw new Error('Subnames package ID not found');

		this.transaction.moveCall({
			target: `${config.subNamesPackageId}::subdomains::extend_expiration`,
			arguments: [
				this.transaction.object(config.suins),
				this.transaction.object(nft),
				this.transaction.pure.u64(expirationTimestampMs),
			],
		});
	}

	/**
	 * Sets the user data of an NFT.
	 */
	setUserData({
		nft,
		value,
		key,
		isSubname,
	}: {
		nft: TransactionObjectInput;
		value: string;
		key: string;
		isSubname?: boolean;
	}) {
		const config = this.suinsClient.config;
		if (!config.suins) throw new Error('SuiNS Object ID not found');
		if (isSubname && !config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		if (!Object.values(ALLOWED_METADATA).some((x) => x === key)) throw new Error('Invalid key');

		this.transaction.add(
			isSubname
				? subdomainProxy.setUserData({
						config: subdomainProxyConfig(config),
						arguments: {
							subdomain: this.transaction.object(nft),
							key,
							value,
						},
					})
				: controller.setUserData({
						config: suinsConfig(config),
						arguments: {
							nft: this.transaction.object(nft),
							key,
							value,
						},
					}),
		);
	}

	/**
	 * Burns an expired NFT to collect storage rebates.
	 */
	burnExpired({ nft, isSubname }: { nft: TransactionObjectInput; isSubname?: boolean }) {
		const config = this.suinsClient.config;
		if (!config.suins) throw new Error('SuiNS Object ID not found');

		if (isSubname) {
			this.transaction.add(
				controller.burnExpiredSubname({
					config: suinsConfig(config),
					arguments: {
						nft: this.transaction.object(nft),
					},
				}),
			);
		} else {
			this.transaction.add(
				controller.burnExpired({
					config: suinsConfig(config),
					arguments: {
						nft: this.transaction.object(nft),
					},
				}),
			);
		}
	}
}
