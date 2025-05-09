// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { registerSlushWallet } from '@mysten/slush-wallet';
import { useLayoutEffect } from 'react';

export interface SlushWalletConfig {
	name: string;
	origin?: string;
}

export function useSlushWallet(config?: SlushWalletConfig) {
	useLayoutEffect(() => {
		if (!config?.name) {
			return;
		}

		let cleanup: (() => void) | undefined;
		let isMounted = true;

		try {
			const result = registerSlushWallet(config.name, {
				origin: config.origin,
			});

			if (isMounted && result) {
				cleanup = result.unregister;
			} else if (result) {
				result.unregister();
			}
		} catch (error) {
			console.error('Failed to register Slush wallet:', error);
		}

		return () => {
			isMounted = false;
			if (cleanup) cleanup();
		};
	}, [config?.name, config?.origin]);
}
