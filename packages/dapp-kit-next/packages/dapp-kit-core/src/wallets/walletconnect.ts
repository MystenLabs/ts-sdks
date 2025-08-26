// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { registerWalletConnectWallet } from '@mysten/walletconnect-wallet';
import type { WalletInitializer } from './index.js';

export function walletConnectWalletInitializer(projectId: string): WalletInitializer {
	return {
		id: `walletconnect-wallet-initializer-${projectId}`,
		async initialize() {
			const result = await registerWalletConnectWallet(projectId);

			if (!result) throw new Error('Registration un-successful.');
			return { unregister: result.unregister };
		},
	};
}
