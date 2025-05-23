// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionObjectArgument } from '@mysten/sui/transactions';

import type { BaseRulePackageIds } from '../constants.js';
import type {
	ClientWithExtensions,
	Experimental_CoreClient,
	Experimental_SuiClientTypes,
} from '@mysten/sui/experimental';
import type { KioskClient } from '../client/kiosk-client.js';

export * from './kiosk.js';
export * from './transfer-policy.js';

/**
 * A valid argument for any of the Kiosk functions.
 */
export type ObjectArgument = string | TransactionObjectArgument;

/**
 * The Client Options for Both KioskClient & TransferPolicyManager.
 */
export type KioskClientOptions = {
	client: CoreSuiClient;
	network?: Experimental_SuiClientTypes.Network;
	packageIds?: BaseRulePackageIds;
};

export type CoreSuiClient = ClientWithExtensions<{
	core: Experimental_CoreClient;
}>;

export type ClientWithKioskExtension = ClientWithExtensions<{
	core: Experimental_CoreClient;
	kiosk: KioskClient;
}>;
