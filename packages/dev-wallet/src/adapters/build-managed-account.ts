// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import type { IdentifierString } from '@mysten/wallet-standard';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';

import type { ManagedAccount } from '../types.js';

const DEFAULT_FEATURES: IdentifierString[] = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
];

/**
 * Build a {@link ManagedAccount} from a signer, address, label, and optional feature list.
 */
export function buildManagedAccount(
	signer: Signer,
	address: string,
	label: string,
	features?: readonly IdentifierString[],
): ManagedAccount {
	const walletAccount = new ReadonlyWalletAccount({
		address,
		label,
		publicKey: signer.getPublicKey().toSuiBytes(),
		chains: [...SUI_CHAINS],
		features: [...(features ?? DEFAULT_FEATURES)],
	});
	return { address, label, signer, walletAccount };
}
