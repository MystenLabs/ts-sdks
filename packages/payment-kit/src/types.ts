// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ClientWithCoreApi } from '@mysten/sui/experimental';

export type PaymentKitPackageConfig = {
	packageId: string;
};

export interface PaymentKitCompatibleClient extends ClientWithCoreApi {}
export interface PaymentKitClientExtensionOptions {}

export interface PaymentKitClientOptions extends PaymentKitClientExtensionOptions {
	client: PaymentKitCompatibleClient;
}
