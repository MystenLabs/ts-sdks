// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithExtensions, Experimental_CoreClient } from '@mysten/sui/experimental';

export type PaymentKitPackageConfig = {
	packageId: string;
};

export type PaymentKitCompatibleClient = ClientWithExtensions<{
	core: Experimental_CoreClient;
}>;

export interface PaymentKitClientConfig {
	suiClient: PaymentKitCompatibleClient;
}

export interface ProcessPaymentParams {
	paymentId: string;
	amount: number | bigint;
	coinType: string;
	receiver: string;
	sender: string;
	registryId?: string;
}

export interface GetPaymentRecordParams {
	registryId: string;
	paymentId: string;
	amount: number | bigint;
	receiver: string;
	coinType: string;
}

export interface GetPaymentRecordResponse {
	paymentRecord: PaymentRecordData;
}
export interface PaymentRecordData {
	epochAtTimeOfRecord: string;
}
