// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/experimental';

export type PaymentKitPackageConfig = {
	packageId: string;
};

export interface PaymentKitCompatibleClient extends ClientWithCoreApi {}

export interface PaymentKitClientOptions {
	client: PaymentKitCompatibleClient;
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
