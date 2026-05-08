// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletAccount } from '@mysten/wallet-standard';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { TEST_NETWORKS } from '../test-utils.js';

export function createMockAccount(options: Partial<WalletAccount> = {}) {
	const keypair = new Ed25519Keypair();
	return new ReadonlyWalletAccount({
		address: keypair.getPublicKey().toSuiAddress(),
		publicKey: keypair.getPublicKey().toSuiBytes(),
		chains: TEST_NETWORKS.map((network) => `sui:${network}` as const),
		features: [
			'sui:signAndExecuteTransactionBlock',
			'sui:signTransactionBlock',
			'sui:signAndExecuteTransaction',
			'sui:signTransaction',
		],
		...options,
	});
}
