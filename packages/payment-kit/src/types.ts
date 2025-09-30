// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ClientWithExtensions, Experimental_CoreClient } from '@mysten/sui/experimental';

export type PaymentKitPackageConfig = {
	packageId: string;
};

export type PaymentKitCompatibleClient = ClientWithExtensions<{
	core: Experimental_CoreClient;
}>;

export interface PaymentKitClientConfig {
	suiClient: PaymentKitCompatibleClient;
}
