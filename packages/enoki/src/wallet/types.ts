// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClient } from '@mysten/sui/client';
import type { StandardEventsListeners } from '@mysten/wallet-standard';

import type { Encryption } from '../encryption.js';
import type { EnokiClientConfig } from '../EnokiClient/index.js';
import type { AuthProvider, EnokiNetwork } from '../EnokiClient/type.js';
import type { SyncStore } from '../stores.js';

export type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

export interface RegisterEnokiWalletsOptions extends EnokiClientConfig {
	/**
	 * The storage interface to persist Enoki data locally.
	 * If not provided, it will use a sessionStorage-backed store.
	 */
	store?: SyncStore;

	/**
	 * The encryption interface that will be used to encrypt data before storing it locally.
	 * If not provided, it will use a default encryption interface.
	 */
	encryption?: Encryption;

	/**
	 * Conviguration for each OAuth provider.
	 */
	providers: Partial<
		Record<
			AuthProvider,
			{
				/**
				 * The OAuth client ID.
				 */
				clientId: string;

				/**
				 * The URL to redirect to after authorization.
				 */
				redirectUrl?: string;

				/**
				 * Extra parameters to include in the authorization URL.
				 */
				extraParams?: Record<string, string>;
			}
		>
	>;

	/**
	 * The SuiClient instance to use when building and executing transactions.
	 */
	client: SuiClient;

	/**
	 * The network to use when building and executing transactions.
	 * @default 'mainnet'
	 */
	network?: EnokiNetwork;

	/**
	 * The window features to use when opening the authorization popup.
	 * https://developer.mozilla.org/en-US/docs/Web/API/Window/open#windowfeatures
	 */
	windowFeatures?: string | (() => string);
}
