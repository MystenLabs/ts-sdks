// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/bcs';
import { calculatePrice } from './contracts/suins/config.js';
import type {
	InitRenewalArguments,
	InitRegistrationArguments,
	RegisterArguments,
	RenewArguments,
} from './contracts/suins/payment.js';
import { initRegistration, initRenewal, register, renew } from './contracts/suins/payment.js';
import type { ApplyCouponArguments } from './contracts/suins_coupons/coupon_house.js';
import { applyCoupon } from './contracts/suins_coupons/coupon_house.js';
import type { FreeClaimArguments } from './contracts/suins_discounts/free_claims.js';
import { freeClaim } from './contracts/suins_discounts/free_claims.js';
import type {
	CalculatePriceAfterDiscountArguments,
	HandleBasePaymentArguments,
	HandlePaymentArguments,
} from './contracts/suins_payments/payments.js';
import {
	calculatePriceAfterDiscount,
	handleBasePayment,
	handlePayment,
} from './contracts/suins_payments/payments.js';
import type { ApplyPercentageDiscountArguments } from './contracts/suins_discounts/discounts.js';
import { applyPercentageDiscount } from './contracts/suins_discounts/discounts.js';
import type { Transaction, TransactionObjectInput } from '@mysten/sui/transactions';

export interface SuiNsPackageIds {
	suins?: string;
	payments?: string;
	coupons?: string;
	discounts?: string;
}

export interface SuiNsObjectIds {
	suins: string;
	discountHouse: string;
}

export interface SuiNsCallsOptions {
	packageIds?: SuiNsPackageIds;
	objectIds: SuiNsObjectIds;
}

export interface RegisterOptions {
	domain: string;
	couponCode?: string;
	freeClaim?: {
		type: string;
		object: TransactionObjectInput;
	};
	percentageDiscount?: {
		type: string;
		object: TransactionObjectInput;
	};
	coinType: string;

	// years?: number;
	// maxAmount?: bigint;
	// priceInfoObjectId?: string;
	// coinConfig?: string;
	// coin?: string;
}

export interface InitRenewalOptions {
	arguments: Omit<InitRenewalArguments, 'suins'>;
}

export interface InitRegistrationOptions {
	arguments: Omit<InitRegistrationArguments, 'suins'>;
}

export interface HandleBasePaymentOptions {
	arguments: Omit<HandleBasePaymentArguments, 'suins'>;
	typeArguments: [string];
}

export interface HandlePaymentOptions {
	arguments: Omit<HandlePaymentArguments, 'suins'>;
	typeArguments: [string];
}

export interface FinalizeRegisterOptions {
	arguments: Omit<RegisterArguments, 'suins'>;
}

export interface FinalizeRenewOptions {
	arguments: Omit<RenewArguments, 'suins'>;
}

export interface CalculatePriceAfterDiscountOptions {
	arguments: Omit<CalculatePriceAfterDiscountArguments, 'suins'>;
	typeArguments: [string];
}

export interface ApplyCouponOptions {
	arguments: Omit<ApplyCouponArguments, 'suins'>;
}

export interface ApplyFreeClaimOptions {
	arguments: Omit<FreeClaimArguments<BcsType<any>>, 'suins' | 'self'>;
	typeArguments: [string];
}

export interface ApplyPercentageDiscountOptions {
	arguments: Omit<ApplyPercentageDiscountArguments<BcsType<any>>, 'suins' | 'self' | '_'> & {
		discountNft: ApplyPercentageDiscountArguments<BcsType<any>>['_'];
	};
	typeArguments: [string];
}

export class SuiNsCalls {
	#packageIds: SuiNsPackageIds;
	#objectIds: SuiNsObjectIds;
	constructor(options: SuiNsCallsOptions) {
		this.#packageIds = options.packageIds ?? {};
		this.#objectIds = options.objectIds;
	}

	register(options: RegisterOptions) {
		if (options.couponCode && (options.freeClaim || options.percentageDiscount)) {
			throw new Error('Cannot apply both coupon and discount NFT');
		}

		if (options.freeClaim && options.percentageDiscount) {
			throw new Error('Cannot apply both free claim and percentage discount');
		}

		return (tx: Transaction) => {
			const paymentIntent = this.initRegistration({
				arguments: {
					domain: options.domain,
				},
			});

			if (options.couponCode) {
				tx.add(
					this.applyCoupon({
						arguments: {
							intent: paymentIntent,
							couponCode: options.couponCode,
						},
					}),
				);
			}
			if (options.freeClaim) {
				tx.add(
					this.applyFreeClaim({
						arguments: {
							intent: paymentIntent,
							object: (tx) => tx.object(options.freeClaim!.object),
						},
						typeArguments: [options.freeClaim.type],
					}),
				);
			}
			if (options.percentageDiscount) {
				tx.add(
					this.applyPercentageDiscount({
						arguments: {
							intent: paymentIntent,
							discountNft: (tx) => tx.object(options.percentageDiscount!.object),
						},
						typeArguments: [options.percentageDiscount.type],
					}),
				);
			}

			this.calculatePriceAfterDiscount({
				arguments: {
					intent: paymentIntent,
				},
				typeArguments: [options.coinType],
			});
			// const receipt = this.generateReceipt({
			// 	paymentIntent,
			// 	priceAfterDiscount,
			// 	coinConfig: params.coinConfig,
			// 	coin: params.coin,
			// 	maxAmount: params.maxAmount,
			// 	priceInfoObjectId: params.priceInfoObjectId,
			// });
			// const nft = this.finalizeRegister(receipt);

			// if (params.years > 1) {
			// 	this.renew({
			// 		nft,
			// 		years: params.years - 1,
			// 		coinConfig: params.coinConfig,
			// 		coin: params.coin,
			// 		couponCode: params.couponCode,
			// 		discountInfo: params.discountInfo,
			// 		maxAmount: params.maxAmount,
			// 		priceInfoObjectId: params.priceInfoObjectId,
			// 	});
			// }

			// return nft as TransactionObjectArgument;
			throw new Error('Not implemented');
		};
	}

	renew() {
		throw new Error('Not implemented');
	}

	initRegistration(options: InitRegistrationOptions) {
		return initRegistration({
			package: this.#packageIds.payments,
			arguments: {
				suins: this.#objectIds.suins,
				domain: options.arguments.domain,
			},
		});
	}

	initRenewal(options: InitRenewalOptions) {
		return initRenewal({
			package: this.#packageIds.payments,
			arguments: {
				suins: this.#objectIds.suins,
				nft: options.arguments.nft,
				years: options.arguments.years,
			},
		});
	}

	calculatePrice: typeof calculatePrice = (options) => {
		return calculatePrice({
			package: this.#packageIds.suins,
			...options,
		});
	};

	handleBasePayment(options: HandleBasePaymentOptions) {
		return handleBasePayment({
			package: this.#packageIds.payments,
			arguments: {
				suins: this.#objectIds.suins,
				intent: options.arguments.intent,
				payment: options.arguments.payment,
			},
			typeArguments: options.typeArguments,
		});
	}

	handlePayment(options: HandlePaymentOptions) {
		return handlePayment({
			package: this.#packageIds.payments,
			arguments: {
				suins: this.#objectIds.suins,
				intent: options.arguments.intent,
				payment: options.arguments.payment,
				priceInfoObject: options.arguments.priceInfoObject,
				userPriceGuard: options.arguments.userPriceGuard,
			},
			typeArguments: options.typeArguments,
		});
	}

	finalizeRegister(options: FinalizeRegisterOptions) {
		return register({
			package: this.#packageIds.suins,
			arguments: {
				receipt: options.arguments.receipt,
				suins: this.#objectIds.suins,
			},
		});
	}

	finalizeRenew(options: FinalizeRenewOptions) {
		return renew({
			package: this.#packageIds.suins,
			arguments: {
				receipt: options.arguments.receipt,
				suins: this.#objectIds.suins,
				nft: options.arguments.nft,
			},
		});
	}

	calculatePriceAfterDiscount(options: CalculatePriceAfterDiscountOptions) {
		return calculatePriceAfterDiscount({
			package: this.#packageIds.payments,
			arguments: {
				suins: this.#objectIds.suins,
				intent: options.arguments.intent,
			},
			typeArguments: options.typeArguments,
		});
	}

	generateReceipt() {
		throw new Error('Not implemented');
	}

	applyCoupon(options: ApplyCouponOptions) {
		return applyCoupon({
			package: this.#packageIds.coupons,
			arguments: {
				suins: this.#objectIds.suins,
				intent: options.arguments.intent,
				couponCode: options.arguments.couponCode,
			},
		});
	}

	applyFreeClaim(options: ApplyFreeClaimOptions) {
		return freeClaim({
			package: this.#packageIds.discounts,
			arguments: {
				self: this.#objectIds.discountHouse,
				suins: this.#objectIds.suins,
				intent: options.arguments.intent,
				object: options.arguments.object,
			},
			typeArguments: options.typeArguments,
		});
	}

	applyPercentageDiscount(options: ApplyPercentageDiscountOptions) {
		return applyPercentageDiscount({
			package: this.#packageIds.discounts,
			arguments: {
				self: this.#objectIds.discountHouse,
				suins: this.#objectIds.suins,
				intent: options.arguments.intent,
				_: options.arguments.discountNft,
			},
			typeArguments: options.typeArguments,
		});
	}

	createSubName() {
		throw new Error('Not implemented');
	}

	createLeafSubName() {
		throw new Error('Not implemented');
	}

	removeLeafSubName() {
		throw new Error('Not implemented');
	}

	setTargetAddress() {
		throw new Error('Not implemented');
	}

	setDefault() {
		throw new Error('Not implemented');
	}

	editSetup() {
		throw new Error('Not implemented');
	}

	extendExpiration() {
		throw new Error('Not implemented');
	}

	setUserData() {
		throw new Error('Not implemented');
	}

	burnExpired() {
		throw new Error('Not implemented');
	}

	burnExpiredSubname() {
		throw new Error('Not implemented');
	}

	setSubnameTargetAddress() {
		throw new Error('Not implemented');
	}

	setSubnameDefault() {
		throw new Error('Not implemented');
	}
}
