// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { calculate_price } from './contracts/suins/config.js';
import { init_registration, init_renewal, register, renew } from './contracts/suins/payment.js';
import { apply_coupon } from './contracts/suins_coupons/coupon_house.js';
import {
	calculate_price_after_discount,
	handle_base_payment,
	handle_payment,
} from './contracts/suins_payments/payments.js';

export interface SuiNsPackageIds {
	suins?: string;
	payments?: string;
	coupons?: string;
	discounts?: string;
}

export interface SuiNsCallsOptions {
	packageIds?: SuiNsPackageIds;
}

export class SuiNsCalls {
	#packageIds: SuiNsPackageIds;
	constructor(options: SuiNsCallsOptions) {
		this.#packageIds = options.packageIds ?? {};
	}

	register() {
		throw new Error('Not implemented');
	}

	renew() {
		throw new Error('Not implemented');
	}

	initRegistration: typeof init_registration = (options) => {
		return init_registration({
			package: this.#packageIds.payments,
			...options,
		});
	};

	initRenewal: typeof init_renewal = (options) => {
		return init_renewal({
			package: this.#packageIds.payments,
			...options,
		});
	};

	calculatePrice: typeof calculate_price = (options) => {
		return calculate_price({
			package: this.#packageIds.suins,
			...options,
		});
	};

	handleBasePayment: typeof handle_base_payment = (options) => {
		return handle_base_payment({
			package: this.#packageIds.payments,
			...options,
		});
	};

	handlePayment: typeof handle_payment = (options) => {
		return handle_payment({
			package: this.#packageIds.payments,
			...options,
		});
	};

	finalizeRegister: typeof register = (options) => {
		return register({
			package: this.#packageIds.suins,
			...options,
		});
	};

	finalizeRenew: typeof renew = (options) => {
		return renew({
			package: this.#packageIds.suins,
			...options,
		});
	};

	calculatePriceAfterDiscount: typeof calculate_price_after_discount = (options) => {
		return calculate_price_after_discount({
			package: this.#packageIds.payments,
			...options,
		});
	};

	generateReceipt() {
		throw new Error('Not implemented');
	}

	applyCoupon() {
		return apply_coupon;
	}

	applyDiscount() {
		throw new Error('Not implemented');
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
