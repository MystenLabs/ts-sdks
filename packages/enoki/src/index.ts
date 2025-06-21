// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export { EnokiClient, type EnokiClientConfig, EnokiClientError } from './EnokiClient/index.js';
export type { EnokiNetwork, AuthProvider } from './EnokiClient/type.js';
export { EnokiFlow, type EnokiFlowConfig } from './EnokiFlow.js';
export {
	createLocalStorage,
	createSessionStorage,
	createInMemoryStorage,
	type SyncStore,
} from './stores.js';
export { createDefaultEncryption, type Encryption } from './encryption.js';
export { EnokiKeypair, EnokiPublicKey } from './EnokiKeypair.js';

export type { EnokiWallet } from './wallet/wallet.js';
export { registerEnokiWallets } from './wallet/register.js';
export { enokiWalletsInitializer } from './wallet/initializer.js';

export {
	isEnokiWallet,
	isGoogleWallet,
	isTwitchWallet,
	isFacebookWallet,
	getWalletMetadata,
} from './wallet/utils.js';
export { type RegisterEnokiWalletsOptions } from './wallet/types.js';

export { isEnokiNetwork } from './utils.js';
