// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type {
	Transaction,
	TransactionObjectArgument,
	TransactionObjectInput,
} from '@mysten/sui/transactions';
import { isValidSuiNSName, normalizeSuiNSName, SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';

import { ALLOWED_METADATA, MAX_U64 } from './constants.js';
import { isNestedSubName, isSubName, zeroCoin } from './helpers.js';
import type {
	DiscountInfo,
	PackageInfo,
	ReceiptParams,
	RegistrationParams,
	RenewalParams,
} from './types.js';

export class SuinsCalls {
	#config: PackageInfo;

	constructor(config: PackageInfo) {
		this.#config = config;
	}

	/**
	 * Registers a domain for a number of years.
	 */
	register(params: RegistrationParams) {
		return (tx: Transaction) => {
			if (params.couponCode && params.discountInfo) {
				throw new Error('Cannot apply both coupon and discount NFT');
			}

			const paymentIntent = tx.add(this.initRegistration(params.domain));
			if (params.couponCode) {
				tx.add(this.applyCoupon(paymentIntent, params.couponCode));
			}
			if (params.discountInfo) {
				tx.add(this.applyDiscount(paymentIntent, params.discountInfo));
			}
			const priceAfterDiscount = this.calculatePriceAfterDiscount(
				paymentIntent,
				params.coinConfig.type,
			);
			const receipt = tx.add(
				this.generateReceipt({
					paymentIntent,
					priceAfterDiscount,
					coinConfig: params.coinConfig,
					coin: params.coin,
					maxAmount: params.maxAmount,
					priceInfoObjectId: params.priceInfoObjectId,
				}),
			);

			const nft = tx.add(this.finalizeRegister(receipt));

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

			return nft;
		};
	}

	/**
	 * Renews an NFT for a number of years.
	 */
	renew(params: RenewalParams) {
		return (tx: Transaction) => {
			if (params.couponCode && params.discountInfo) {
				throw new Error('Cannot apply both coupon and discount NFT');
			}

			const paymentIntent = tx.add(this.initRenewal(params.nft, params.years));
			if (params.couponCode) {
				tx.add(this.applyCoupon(paymentIntent, params.couponCode));
			}
			if (params.discountInfo) {
				tx.add(this.applyDiscount(paymentIntent, params.discountInfo));
			}
			const receipt = tx.add(
				this.generateReceipt({
					paymentIntent,
					priceAfterDiscount: this.calculatePriceAfterDiscount(
						paymentIntent,
						params.coinConfig.type,
					),
					coinConfig: params.coinConfig,
					coin: params.coin,
					maxAmount: params.maxAmount,
					priceInfoObjectId: params.priceInfoObjectId,
				}),
			);

			tx.add(this.finalizeRenew(receipt, params.nft));
		};
	}

	initRegistration(domain: string) {
		return (tx: Transaction) => {
			const config = this.#config;
			return tx.moveCall({
				target: `${config.packageId}::payment::init_registration`,
				arguments: [tx.object(config.suins), tx.pure.string(domain)],
			});
		};
	}

	initRenewal(nft: TransactionObjectInput, years: number) {
		return (tx: Transaction) => {
			const config = this.#config;
			return tx.moveCall({
				target: `${config.packageId}::payment::init_renewal`,
				arguments: [tx.object(config.suins), tx.object(nft), tx.pure.u8(years)],
			});
		};
	}

	calculatePrice(
		baseAmount: TransactionObjectArgument,
		paymentType: string,
		priceInfoObjectId: string,
	) {
		return (tx: Transaction) => {
			const config = this.#config;
			return tx.moveCall({
				target: `${config.payments.packageId}::payments::calculate_price`,
				arguments: [
					tx.object(config.suins),
					baseAmount,
					tx.object.clock(),
					tx.object(priceInfoObjectId),
				],
				typeArguments: [paymentType],
			});
		};
	}

	handleBasePayment(
		paymentIntent: TransactionObjectArgument,
		payment: TransactionObjectArgument,
		paymentType: string,
	) {
		const config = this.#config;
		return (tx: Transaction) => {
			return tx.moveCall({
				target: `${config.payments.packageId}::payments::handle_base_payment`,
				arguments: [tx.object(config.suins), paymentIntent, payment],
				typeArguments: [paymentType],
			});
		};
	}

	handlePayment(
		paymentIntent: TransactionObjectArgument,
		payment: TransactionObjectArgument,
		paymentType: string,
		priceInfoObjectId: string,
		maxAmount: bigint = MAX_U64,
	) {
		const config = this.#config;
		return (tx: Transaction) => {
			return tx.moveCall({
				target: `${config.payments.packageId}::payments::handle_payment`,
				arguments: [
					tx.object(config.suins),
					paymentIntent,
					payment,
					tx.object.clock(),
					tx.object(priceInfoObjectId),
					tx.pure.u64(maxAmount),
				],
				typeArguments: [paymentType],
			});
		};
	}

	finalizeRegister(receipt: TransactionObjectArgument) {
		const config = this.#config;
		return (tx: Transaction) => {
			return tx.moveCall({
				target: `${config.packageId}::payment::register`,
				arguments: [receipt, tx.object(config.suins), tx.object.clock()],
			});
		};
	}

	finalizeRenew(receipt: TransactionObjectArgument, nft: TransactionObjectInput) {
		return (tx: Transaction) => {
			const config = this.#config;
			return tx.moveCall({
				target: `${config.packageId}::payment::renew`,
				arguments: [receipt, tx.object(config.suins), tx.object(nft), tx.object.clock()],
			});
		};
	}

	calculatePriceAfterDiscount(paymentIntent: TransactionObjectArgument, paymentType: string) {
		const config = this.#config;
		return (tx: Transaction) => {
			return tx.moveCall({
				target: `${config.payments.packageId}::payments::calculate_price_after_discount`,
				arguments: [tx.object(config.suins), paymentIntent],
				typeArguments: [paymentType],
			});
		};
	}

	generateReceipt(params: ReceiptParams) {
		return (tx: Transaction) => {
			const baseAssetPurchase = params.coinConfig.feed === '';
			if (baseAssetPurchase) {
				const payment = params.coin
					? tx.splitCoins(tx.object(params.coin), [params.priceAfterDiscount])
					: zeroCoin(tx, params.coinConfig.type);
				const receipt = tx.add(
					this.handleBasePayment(params.paymentIntent, payment, params.coinConfig.type),
				);
				return receipt;
			} else {
				const priceInfoObjectId = params.priceInfoObjectId;
				if (!priceInfoObjectId)
					throw new Error('Price info object ID is required for non-base asset purchases');
				const price = tx.add(
					this.calculatePrice(params.priceAfterDiscount, params.coinConfig.type, priceInfoObjectId),
				);
				if (!params.coin) throw new Error('coin input is required');
				const payment = tx.splitCoins(tx.object(params.coin!), [price]);
				const receipt = tx.add(
					this.handlePayment(
						params.paymentIntent,
						payment,
						params.coinConfig.type,
						priceInfoObjectId,
						params.maxAmount,
					),
				);
				return receipt;
			}
		};
	}

	/**
	 * Applies a coupon to the payment intent.
	 */
	applyCoupon(intent: TransactionObjectArgument, couponCode: string) {
		return (tx: Transaction) => {
			const config = this.#config;
			return tx.moveCall({
				target: `${config.coupons.packageId}::coupon_house::apply_coupon`,
				arguments: [tx.object(config.suins), intent, tx.pure.string(couponCode), tx.object.clock()],
			});
		};
	}

	/**
	 * Applies a discount to the payment intent.
	 */
	applyDiscount(intent: TransactionObjectArgument, discountInfo: DiscountInfo) {
		return (tx: Transaction) => {
			const config = this.#config;

			if (discountInfo.isFreeClaim) {
				tx.moveCall({
					target: `${config.discountsPackage.packageId}::free_claims::free_claim`,
					arguments: [
						tx.object(config.discountsPackage.discountHouseId),
						tx.object(config.suins),
						intent,
						tx.object(discountInfo.discountNft),
					],
					typeArguments: [discountInfo.type],
				});
			} else {
				tx.moveCall({
					target: `${config.discountsPackage.packageId}::discounts::apply_percentage_discount`,
					arguments: [
						tx.object(config.discountsPackage.discountHouseId),
						intent,
						tx.object(config.suins),
						tx.object(discountInfo.discountNft),
					],
					typeArguments: [discountInfo.type],
				});
			}
		};
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
		return (tx: Transaction) => {
			if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
			const isParentSubdomain = isNestedSubName(name);
			if (!this.#config.suins) throw new Error('SuiNS Object ID not found');
			if (!this.#config.subNamesPackageId) throw new Error('Subnames package ID not found');
			if (isParentSubdomain && !this.#config.tempSubdomainsProxyPackageId)
				throw new Error('Subnames proxy package ID not found');

			const subNft = tx.moveCall({
				target: isParentSubdomain
					? `${this.#config.tempSubdomainsProxyPackageId}::subdomain_proxy::new`
					: `${this.#config.subNamesPackageId}::subdomains::new`,
				arguments: [
					tx.object(this.#config.suins),
					tx.object(parentNft),
					tx.object(SUI_CLOCK_OBJECT_ID),
					tx.pure.string(normalizeSuiNSName(name, 'dot')),
					tx.pure.u64(expirationTimestampMs),
					tx.pure.bool(!!allowChildCreation),
					tx.pure.bool(!!allowTimeExtension),
				],
			});

			return subNft;
		};
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
		if (!this.#config.suins) throw new Error('SuiNS Object ID not found');
		if (!this.#config.subNamesPackageId) throw new Error('Subnames package ID not found');
		if (isParentSubdomain && !this.#config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		return (tx: Transaction) => {
			tx.moveCall({
				target: isParentSubdomain
					? `${this.#config.tempSubdomainsProxyPackageId}::subdomain_proxy::new_leaf`
					: `${this.#config.subNamesPackageId}::subdomains::new_leaf`,
				arguments: [
					tx.object(this.#config.suins),
					tx.object(parentNft),
					tx.object(SUI_CLOCK_OBJECT_ID),
					tx.pure.string(normalizeSuiNSName(name, 'dot')),
					tx.pure.address(targetAddress),
				],
			});
		};
	}

	/**
	 * Removes a leaf subname.
	 */
	removeLeafSubName({ parentNft, name }: { parentNft: TransactionObjectInput; name: string }) {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		const isParentSubdomain = isNestedSubName(name);
		if (!isSubName(name)) throw new Error('This can only be invoked for subnames');
		if (!this.#config.suins) throw new Error('SuiNS Object ID not found');
		if (!this.#config.subNamesPackageId) throw new Error('Subnames package ID not found');
		if (isParentSubdomain && !this.#config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		return (tx: Transaction) => {
			tx.moveCall({
				target: isParentSubdomain
					? `${this.#config.tempSubdomainsProxyPackageId}::subdomain_proxy::remove_leaf`
					: `${this.#config.subNamesPackageId}::subdomains::remove_leaf`,
				arguments: [
					tx.object(this.#config.suins),
					tx.object(parentNft),
					tx.object(SUI_CLOCK_OBJECT_ID),
					tx.pure.string(normalizeSuiNSName(name, 'dot')),
				],
			});
		};
	}

	/**
	 * Sets the target address of an NFT.
	 */
	setTargetAddress({
		nft, // Can be string or argument
		address,
		isSubname,
	}: {
		nft: TransactionObjectArgument;
		address?: string;
		isSubname?: boolean;
	}) {
		if (isSubname && !this.#config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		return (tx: Transaction) => {
			tx.moveCall({
				target: isSubname
					? `${this.#config.tempSubdomainsProxyPackageId}::subdomain_proxy::set_target_address`
					: `${this.#config.packageId}::controller::set_target_address`,
				arguments: [
					tx.object(this.#config.suins),
					tx.object(nft),
					tx.pure(bcs.option(bcs.Address).serialize(address).toBytes()),
					tx.object(SUI_CLOCK_OBJECT_ID),
				],
			});
		};
	}

	/**
	 * Sets a default name for the user.
	 */
	setDefault(name: string) {
		if (!isValidSuiNSName(name)) throw new Error('Invalid SuiNS name');
		if (!this.#config.suins) throw new Error('SuiNS Object ID not found');

		return (tx: Transaction) => {
			tx.moveCall({
				target: `${this.#config.packageId}::controller::set_reverse_lookup`,
				arguments: [tx.object(this.#config.suins), tx.pure.string(normalizeSuiNSName(name, 'dot'))],
			});
		};
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
		if (!this.#config.suins) throw new Error('SuiNS Object ID not found');
		if (!isParentSubdomain && !this.#config.subNamesPackageId)
			throw new Error('Subnames package ID not found');
		if (isParentSubdomain && !this.#config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		return (tx: Transaction) => {
			tx.moveCall({
				target: isParentSubdomain
					? `${this.#config.tempSubdomainsProxyPackageId}::subdomain_proxy::edit_setup`
					: `${this.#config.subNamesPackageId}::subdomains::edit_setup`,
				arguments: [
					tx.object(this.#config.suins),
					tx.object(parentNft),
					tx.object(SUI_CLOCK_OBJECT_ID),
					tx.pure.string(normalizeSuiNSName(name, 'dot')),
					tx.pure.bool(!!allowChildCreation),
					tx.pure.bool(!!allowTimeExtension),
				],
			});
		};
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
		if (!this.#config.suins) throw new Error('SuiNS Object ID not found');
		if (!this.#config.subNamesPackageId) throw new Error('Subnames package ID not found');

		return (tx: Transaction) => {
			tx.moveCall({
				target: `${this.#config.subNamesPackageId}::subdomains::extend_expiration`,
				arguments: [
					tx.object(this.#config.suins),
					tx.object(nft),
					tx.pure.u64(expirationTimestampMs),
				],
			});
		};
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
		if (!this.#config.suins) throw new Error('SuiNS Object ID not found');
		if (isSubname && !this.#config.tempSubdomainsProxyPackageId)
			throw new Error('Subnames proxy package ID not found');

		if (!Object.values(ALLOWED_METADATA).some((x) => x === key)) throw new Error('Invalid key');

		return (tx: Transaction) => {
			tx.moveCall({
				target: isSubname
					? `${this.#config.tempSubdomainsProxyPackageId}::subdomain_proxy::set_user_data`
					: `${this.#config.packageId}::controller::set_user_data`,
				arguments: [
					tx.object(this.#config.suins),
					tx.object(nft),
					tx.pure.string(key),
					tx.pure.string(value),
					tx.object(SUI_CLOCK_OBJECT_ID),
				],
			});
		};
	}

	/**
	 * Burns an expired NFT to collect storage rebates.
	 */
	burnExpired({ nft, isSubname }: { nft: TransactionObjectInput; isSubname?: boolean }) {
		if (!this.#config.suins) throw new Error('SuiNS Object ID not found');

		return (tx: Transaction) => {
			tx.moveCall({
				target: `${this.#config.packageId}::controller::${
					isSubname ? 'burn_expired_subname' : 'burn_expired'
				}`, // Update this
				arguments: [tx.object(this.#config.suins), tx.object(nft), tx.object(SUI_CLOCK_OBJECT_ID)],
			});
		};
	}
}
