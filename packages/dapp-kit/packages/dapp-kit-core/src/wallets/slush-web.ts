// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { registerSlushWallet } from '@mysten/slush-wallet';
import type { SlushWalletConfig } from '../core/types.js';
import type { WalletInitializer } from './index.js';

export function slushWebWalletInitializer(config?: SlushWalletConfig): WalletInitializer {
	return {
		id: 'slush-web-wallet-initializer',
		async initialize() {
			const appName = config?.appName || getDefaultAppName();
			const result = await registerSlushWallet(appName, {
				origin: config?.origin,
				metadataApiUrl: config?.metadataApiUrl,
			});

			if (!result) throw new Error('Registration un-successful.');
			return { unregister: result.unregister };
		},
	};
}

function getDefaultAppName() {
	const appNameElement = document.querySelector<HTMLMetaElement>(`meta[name="application-name"]`);
	return appNameElement?.content || document.title;
}
