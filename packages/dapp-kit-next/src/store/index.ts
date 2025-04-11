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

// // 	//
// // 	onMount($state, () => {
// // 		const walletsApi = getWallets();
// // 		actions.setWalletRegistered(getRegisteredWallets(preferredWallets, walletFilter));

// // 		const unsubscribeFromRegister = walletsApi.on('register', () => {
// // 			actions.setWalletRegistered(getRegisteredWallets(preferredWallets, walletFilter));
// // 		});

// // 		const unsubscribeFromUnregister = walletsApi.on('unregister', (unregisteredWallet) => {
// // 			actions.setWalletUnregistered(
// // 				getRegisteredWallets(preferredWallets, walletFilter),
// // 				unregisteredWallet,
// // 			);
// // 		});

// // 		return () => {
// // 			unsubscribeFromRegister();
// // 			unsubscribeFromUnregister();
// // 		};
// // 	});

// // 	/**
// // 	 *  Handle various changes in properties for a wallet.
// // 	 */
// // 	onMount($state, () => {
// // 		let currentWalletChangeEvent: (() => void) | null = null;

// // 		const unlisten = listenKeys($state, ['currentWallet'], ({ currentWallet }) => {
// // 			currentWalletChangeEvent =
// // 				currentWallet?.features['standard:events'].on('change', ({ accounts }) => {
// // 					// TODO: We should handle features changing that might make the list of wallets
// // 					// or even the current wallet incompatible with the dApp.
// // 					if (accounts) {
// // 						actions.updateWalletAccounts(accounts);
// // 					}
// // 				}) ?? null;
// // 		});

// // 		return () => {
// // 			unlisten();
// // 			currentWalletChangeEvent?.();
// // 		};
// // 	});

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
