// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClient } from '@mysten/sui/client';
import type { ClientWithExtensions } from '@mysten/sui/experimental';

export type Network = 'mainnet' | 'testnet';

export type PaymentKitPackageConfig = {
	// TODO - Do we need this?
};

type SuiClientOrRpcUrl =
	| {
			suiClient: ClientWithExtensions<{
				jsonRpc: SuiClient;
			}>;
			suiRpcUrl?: never;
	  }
	| {
			suiRpcUrl: string;
			suiClient?: never;
	  };

type PaymentKitNetworkOrPackageConfig =
	| {
			network: 'mainnet' | 'testnet';
			packageConfig?: PaymentKitPackageConfig;
	  }
	| {
			network?: never;
			packageConfig: PaymentKitPackageConfig;
	  };

export type PaymentKitClientConfig = PaymentKitNetworkOrPackageConfig & SuiClientOrRpcUrl;
