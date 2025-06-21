// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import './components/dapp-kit-connect-button.js';
import './components/dapp-kit-connect-modal.js';

export { DAppKitConnectButton } from './components/dapp-kit-connect-button.js';
export { DAppKitConnectModal } from './components/dapp-kit-connect-modal.js';

export { createDAppKit } from './core/index.js';
export type { DAppKit } from './core/index.js';

export type { DAppKitCompatibleClient } from './core/types.js';
export type { WalletConnection } from './core/store.js';
export type { Register, ResolvedRegister, RegisteredDAppKit } from './types.js';
export type { StateStorage } from './utils/storage.js';

export { getWalletUniqueIdentifier } from './utils/wallets.js';
export type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
