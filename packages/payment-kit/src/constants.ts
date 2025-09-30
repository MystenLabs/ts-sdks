// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { PaymentKitPackageConfig } from './types.js';

export const TESTNET_PAYMENT_KIT_PACKAGE_CONFIG = {
	packageId: '0x6d40694388297e1fae93ddbb7ef575ca961af225727c2a389259b29903d0fced',
} satisfies PaymentKitPackageConfig;

export const MAINNET_PAYMENT_KIT_PACKAGE_CONFIG = {
	packageId: '0x73cdadfc6c49df26d90055fd40a2b487fbe3021c8a8efed1696fb9cd51d23130',
} satisfies PaymentKitPackageConfig;
