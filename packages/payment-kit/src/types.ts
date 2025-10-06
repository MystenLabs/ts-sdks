// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/experimental';

export type PaymentKitPackageConfig = {
	packageId: string;
	namespaceId: string;
};

export interface PaymentKitCompatibleClient extends ClientWithCoreApi {}

export interface PaymentKitClientOptions {
	client: PaymentKitCompatibleClient;
}

export type RegistryParam =
	| { registryName: string; registryId?: never }
	| { registryName?: never; registryId: string };

export interface ProcessPaymentParams {
	nonce: string;
	amount: number | bigint;
	coinType: string;
	receiver: string;
	sender: string;
	registry?: RegistryParam;
}

export interface GetPaymentRecordParams {
	registry?: RegistryParam;
	nonce: string;
	amount: number | bigint;
	receiver: string;
	coinType: string;
}

export interface PaymentRecordData {
	epochAtTimeOfRecord: string;
}

export interface GetPaymentRecordResponse {
	paymentTransactionDigest: string;
	paymentRecord: PaymentRecordData;
}

export interface ProcessRegistryPaymentParams {
	nonce: string;
	coinType: string;
	sender: string;
	amount: number | bigint;
	receiver: string;
	registry?: RegistryParam;
}

export interface ProcessEphemeralPaymentParams {
	nonce: string;
	coinType: string;
	sender: string;
	amount: number | bigint;
	receiver: string;
}
