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
	| { registryName?: string; registryId?: never }
	| { registryName?: never; registryId: string };

export type RegistryAndAdminCap = {
	adminCapId: string;
} & Registry;

export type PaymentKeyArgs = {
	coinType: string;
	nonce: string;
	amount: number | bigint;
	receiver: string;
};

export type GetPaymentRecordOptions = PaymentKeyArgs & Registry;

export interface GetPaymentRecordResponse {
	key: string;
	paymentTransactionDigest: string | null;
	epochAtTimeOfRecord: string;
}

export type ProcessEphemeralPaymentOptions = {
	sender: string;
} & PaymentKeyArgs;

export type ProcessRegistryPaymentOptions = ProcessEphemeralPaymentOptions & Registry;

export type CreateRegistryOptions = {
	registryName: string;
};

export type SetEpochExpirationDurationOptions = {
	epochExpirationDuration: number | bigint;
} & RegistryAndAdminCap;

export type SetRegistryManagedFundsOptions = {
	registryManagedFunds: boolean;
} & RegistryAndAdminCap;

export type WithdrawFromRegistryOptions = {
	coinType: string;
} & RegistryAndAdminCap;

export type DeletePaymentRecordOptions = {
	coinType: string;
} & PaymentKeyArgs &
	Registry;
