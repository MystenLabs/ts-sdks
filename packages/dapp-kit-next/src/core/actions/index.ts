// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitState } from '../state.js';
import { connectWalletCreator } from './connect-wallet.js';
import { disconnectWalletCreator } from './disconnect-wallet.js';
import { switchAccountCreator } from './switch-account.js';

export function createActions(state: DAppKitState) {
	return {
		switchAccount: switchAccountCreator(state),
		connectWallet: connectWalletCreator(state),
		disconnectWallet: disconnectWalletCreator(state),
	};
}
