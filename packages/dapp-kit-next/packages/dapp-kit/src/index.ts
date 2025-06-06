// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import './components/dapp-kit-connect-modal.js';
import './components/dapp-kit-connect-button.js';

export { createDAppKit, getDefaultInstance } from './core/index.js';
export type { DAppKit } from './core/index.js';

export { DAppKitConnectButton } from './components/dapp-kit-connect-button.js';
export { DAppKitConnectModal } from './components/dapp-kit-connect-modal.js';

export type { StateStorage } from './utils/storage.js';

export type { Register, ResolvedRegister } from './types.js';
