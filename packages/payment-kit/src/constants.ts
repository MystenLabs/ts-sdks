// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeStructTag } from '@mysten/sui/dist/cjs/utils/sui-types.js';
import type { PaymentKitPackageConfig } from './types.js';
import { SUI_TYPE_ARG } from '@mysten/sui/dist/cjs/utils/constants.js';

export const TESTNET_PAYMENT_KIT_PACKAGE_CONFIG = {
	packageId: '0x6d40694388297e1fae93ddbb7ef575ca961af225727c2a389259b29903d0fced',
	namespaceId: '0xa5016862fdccba7cc576b56cc5a391eda6775200aaa03a6b3c97d512312878db',
} satisfies PaymentKitPackageConfig;

export const MAINNET_PAYMENT_KIT_PACKAGE_CONFIG = {
	packageId: '0x73cdadfc6c49df26d90055fd40a2b487fbe3021c8a8efed1696fb9cd51d23130',
	namespaceId: '0xccd3e4c7802921991cd9ce488c4ca0b51334ba75483702744242284ccf3ae7c2',
} satisfies PaymentKitPackageConfig;

export const SUI_COIN_TYPE = normalizeStructTag(SUI_TYPE_ARG);
export const DEFAULT_REGISTRY_NAME = 'default-payment-registry';
