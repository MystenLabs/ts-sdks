// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import './components/dapp-kit-connect-modal.svelte';

export { getWalletUniqueIdentifier } from './utils/wallets.js';

export { createDAppKitStore, getDefaultStore } from './store/index.js';
export type { DAppKitStore } from './store/index.js';
