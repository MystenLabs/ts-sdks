// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { registerWalletConnectWallet } from '@mysten/walletconnect-wallet';
import { useLayoutEffect } from 'react';

export interface WalletConnectWalletConfig {
	projectId?: string;
}

export function useWalletConnectWallet(projectId?: string) {
	useLayoutEffect(() => {
		if (!projectId) {
			return;
		}

		let cleanup: (() => void) | undefined;

		try {
			const result = registerWalletConnectWallet(projectId);

			if (result) {
				cleanup = result.unregister;
			}
		} catch (error) {
			console.error('Failed to register Slush wallet:', error);
		}

		return () => {
			if (cleanup) cleanup();
		};
	}, [projectId]);
}
