// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export { createDAppKit } from './core/index.js';
export type { DAppKit } from './core/index.js';

export type { DAppKitCompatibleClient } from './core/types.js';
export type { WalletConnection } from './core/store.js';
export type {
	Register,
	ResolvedRegister,
	RegisteredDAppKit,
	DefaultExpectedDppKit,
} from './types.js';
export type { StateStorage } from './utils/storage.js';
export type { ClientWithCoreApi } from '@mysten/sui/client';

export { getWalletUniqueIdentifier } from './utils/wallets.js';
export type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
