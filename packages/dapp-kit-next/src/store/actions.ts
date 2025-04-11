// // Copyright (c) Mysten Labs, Inc.
// // SPDX-License-Identifier: Apache-2.0

// import { MapStore } from 'nanostores';
// import { DappKitStoreState } from './state';
// import { getWallets } from '@mysten/wallet-standard';

// function syncRegisteredWallets(store: MapStore<DappKitStoreState>) {
// 	const walletsApi = getWallets();
// 	store.setKey('wallets', walletsApi.get());
// }

// // setWalletRegistered(updatedWallets: WalletWithRequiredFeatures[]) {
// //     $state.setKey('wallets', updatedWallets);
// // },
// // setWalletUnregistered(
// //     updatedWallets: WalletWithRequiredFeatures[],
// //     unregisteredWallet: Wallet,
// // ) {
// //     if (unregisteredWallet === $state.get().currentWallet) {
// //         $state.set({
// //             ...$state.get(),
// //             wallets: updatedWallets,
// //             accounts: [],
// //             currentWallet: null,
// //             currentAccount: null,
// //             connectionStatus: 'disconnected',
// //             supportedIntents: [],
// //         });
// //     } else {
// //         $state.setKey('wallets', updatedWallets);
// //     }
// // },
