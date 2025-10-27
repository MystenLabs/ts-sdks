// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PaymentKitPackageConfig } from './types.js';
import { SUI_TYPE_ARG, normalizeStructTag } from '@mysten/sui/utils';

export const TESTNET_PAYMENT_KIT_PACKAGE_CONFIG = {
	packageId: '0x7e069abe383e80d32f2aec17b3793da82aabc8c2edf84abbf68dd7b719e71497',
	namespaceId: '0xa5016862fdccba7cc576b56cc5a391eda6775200aaa03a6b3c97d512312878db',
} satisfies PaymentKitPackageConfig;

export const MAINNET_PAYMENT_KIT_PACKAGE_CONFIG = {
	packageId: '0xbc126f1535fba7d641cb9150ad9eae93b104972586ba20f3c60bfe0e53b69bc6',
	namespaceId: '0xccd3e4c7802921991cd9ce488c4ca0b51334ba75483702744242284ccf3ae7c2',
} satisfies PaymentKitPackageConfig;

export const SUI_COIN_TYPE = normalizeStructTag(SUI_TYPE_ARG);
export const DEFAULT_REGISTRY_NAME = 'default-payment-registry';

export const SUI_PROTOCOL = 'sui:';
