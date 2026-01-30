// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import type { TransactionObjectArgument } from '@mysten/sui/transactions';

import type { BaseRulePackageIds } from '../constants.js';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SuiGraphQLClient } from '@mysten/sui/graphql';

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
	client: KioskCompatibleClient;
	network: SuiClientTypes.Network;
	packageIds?: BaseRulePackageIds;
};

export type KioskCompatibleClient = SuiJsonRpcClient | SuiGraphQLClient;
