// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeStructTag } from '@mysten/sui/dist/cjs/utils/sui-types.js';
import type { PaymentKitPackageConfig } from './types.js';
import { SUI_TYPE_ARG } from '@mysten/sui/dist/cjs/utils/constants.js';

export const TESTNET_PAYMENT_KIT_PACKAGE_CONFIG = {
	packageId: '0x7e069abe383e80d32f2aec17b3793da82aabc8c2edf84abbf68dd7b719e71497',
} satisfies PaymentKitPackageConfig;

export const MAINNET_PAYMENT_KIT_PACKAGE_CONFIG = {
	packageId: '0xbc126f1535fba7d641cb9150ad9eae93b104972586ba20f3c60bfe0e53b69bc6',
} satisfies PaymentKitPackageConfig;

export const SUI_COIN_TYPE = normalizeStructTag(SUI_TYPE_ARG);
