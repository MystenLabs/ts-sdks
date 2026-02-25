// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Signer } from '@mysten/sui/cryptography';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';

/** An account managed by a {@link SignerAdapter}, combining address, label, signer, and wallet-standard account. */
export interface ManagedAccount {
	/** The Sui address for this account. */
	address: string;
	/** A human-readable label for this account. */
	label: string;
	/** The signer capable of signing transactions and messages for this account. */
	signer: Signer;
	/** The wallet-standard account representation. */
	walletAccount: ReadonlyWalletAccount;
}

/** Options for creating a new account via {@link SignerAdapter.createAccount}. */
export interface CreateAccountOptions {
	/** Optional human-readable label for the new account. */
	label?: string;
	/** Additional adapter-specific options. */
	[key: string]: unknown;
}

/** Options for importing an existing keypair via {@link SignerAdapter.importAccount}. */
export interface ImportAccountOptions {
	/** The signer (keypair) to import. */
	signer: Signer;
	/** Optional human-readable label for the imported account. */
	label?: string;
}

/**
 * Pluggable interface for managing accounts and providing signers to a {@link DevWallet}.
 *
 * Implementations handle key generation, storage, and lifecycle. The DevWallet delegates
 * all signing operations to the adapter's signers.
 */
export interface SignerAdapter {
	/** Unique identifier for this adapter instance (e.g. 'in-memory', 'webcrypto'). */
	readonly id: string;
	/** Human-readable display name for this adapter. */
	readonly name: string;

	/** Initialize the adapter (e.g. load keys from storage). Must be called before use. */
	initialize(): Promise<void>;
	/** Return all currently managed accounts. */
	getAccounts(): ManagedAccount[];
	/** Look up a managed account by its Sui address. */
	getAccount(address: string): ManagedAccount | undefined;

	/** Create a new account with a generated keypair. Not all adapters support this. */
	createAccount?(options?: CreateAccountOptions): Promise<ManagedAccount>;
	/** Import an existing keypair as a managed account. Not all adapters support this. */
	importAccount?(options: ImportAccountOptions): Promise<ManagedAccount>;
	/** Remove an account by address. Returns true if the account was found and removed. */
	removeAccount?(address: string): Promise<boolean>;

	/** Subscribe to account list changes. Returns an unsubscribe function. */
	onAccountsChanged(callback: (accounts: ManagedAccount[]) => void): () => void;
	/** Clean up resources (listeners, storage handles, etc.). */
	destroy(): void;
}
