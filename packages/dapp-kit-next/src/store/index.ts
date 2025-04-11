// // Copyright (c) Mysten Labs, Inc.
// // SPDX-License-Identifier: Apache-2.0

// import type { SuiClient } from '@mysten/sui/client';
// import { getWallets, Wallet } from '@mysten/wallet-standard';
// import { atom, computed, listenKeys, onMount } from 'nanostores';

// import { createMethods } from './methods.js';
// import type { DappKitStateOptions } from './state.js';
// import { createState } from './state.js';

// export type DAppKitStore = ReturnType<typeof createDAppKitStore>;

// type CreateDAppKitStoreOptions = Partial<DappKitStateOptions> & {
// 	client: SuiClient;
// };

// // export function createDAppKitStore({ client }: CreateDAppKitStoreOptions) {
// // 	const $client = atom(client);
// // 	const { $state, actions } = createState();

// // 	const methods = createMethods({ $state, actions, $client });

// // 	return {
// // 		...methods,
// // 		atoms: {
// // 			$client,

// // 			$state,

// // 			// Wallet state:
// // 			$wallets: computed($state, (state) => state.wallets),
// // 			$accounts: computed($state, (state) => state.accounts),
// // 			$currentAccount: computed($state, (state) => state.currentAccount),
// // 			$currentWallet: computed($state, ({ currentWallet, connectionStatus, supportedIntents }) => {
// // 				switch (connectionStatus) {
// // 					case 'connecting':
// // 						return {
// // 							connectionStatus,
// // 							currentWallet: null,
// // 							isDisconnected: false,
// // 							isConnecting: true,
// // 							isConnected: false,
// // 							supportedIntents: [],
// // 						} as const;
// // 					case 'disconnected':
// // 						return {
// // 							connectionStatus,
// // 							currentWallet: null,
// // 							isDisconnected: true,
// // 							isConnecting: false,
// // 							isConnected: false,
// // 							supportedIntents: [],
// // 						} as const;
// // 					case 'connected': {
// // 						return {
// // 							connectionStatus,
// // 							currentWallet: currentWallet!,
// // 							isDisconnected: false,
// // 							isConnecting: false,
// // 							isConnected: true,
// // 							supportedIntents,
// // 						} as const;
// // 					}
// // 					default:
// // 						throw new Error(`Invalid connection status: ${connectionStatus}`);
// // 				}
// // 			}),
// // 		},
// // 	} as const;
// // }
