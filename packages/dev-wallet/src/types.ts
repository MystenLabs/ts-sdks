// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';

export interface ManagedAccount {
	address: string;
	label: string;
	signer: Signer;
	walletAccount: ReadonlyWalletAccount;
}

export interface CreateAccountOptions {
	label?: string;
	[key: string]: unknown;
}

export interface ImportAccountOptions {
	/** Keypair to import — used by adapters that accept raw keypairs. */
	signer?: Signer;
	/** Address to import — used by adapters that look up keys from an external source (e.g. CLI keystore). */
	address?: string;
	label?: string;
}

/**
 * Pluggable interface for managing accounts and providing signers to a {@link DevWallet}.
 * Implementations handle key generation, storage, and lifecycle.
 */
export interface SignerAdapter {
	readonly id: string;
	readonly name: string;
	/**
	 * Whether accounts from this adapter are eligible for auto-signing.
	 * Defaults to `true`. CLI-based adapters set this to `false` to ensure
	 * transactions always require explicit user approval.
	 */
	readonly allowAutoSign?: boolean;

	/** Load keys from storage. Must be called before use. */
	initialize(): Promise<void>;
	getAccounts(): ManagedAccount[];
	getAccount(address: string): ManagedAccount | undefined;

	createAccount?(options?: CreateAccountOptions): Promise<ManagedAccount>;
	importAccount?(options: ImportAccountOptions): Promise<ManagedAccount>;
	/** List accounts available for import (e.g. from a CLI keystore). */
	listAvailableAccounts?(): Promise<
		Array<{ address: string; scheme: string; alias?: string | null }>
	>;
	removeAccount?(address: string): Promise<boolean>;
	renameAccount?(address: string, label: string): Promise<boolean>;

	/** Subscribe to account list changes. Returns an unsubscribe function. */
	onAccountsChanged(callback: (accounts: ManagedAccount[]) => void): () => void;
	destroy(): void;
}
