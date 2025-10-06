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

export type Registry =
	| { registryName: string; registryId?: never }
	| { registryName?: never; registryId: string };

export type GetPaymentRecordParams = {
	nonce: string;
	amount: number | bigint;
	receiver: string;
	coinType: string;
} & Registry;

export interface PaymentRecordData {
	epochAtTimeOfRecord: string;
}

export interface GetPaymentRecordResponse {
	paymentTransactionDigest: string;
	paymentRecord: PaymentRecordData;
}

export type ProcessEphemeralPaymentParams = {
	nonce: string;
	coinType: string;
	sender: string;
	amount: number | bigint;
	receiver: string;
};

export type ProcessRegistryPaymentParams = ProcessEphemeralPaymentParams & Registry;
