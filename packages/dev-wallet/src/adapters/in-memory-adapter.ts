// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';

import type {
	CreateAccountOptions,
	ImportAccountOptions,
	ManagedAccount,
	SignerAdapter,
} from '../types.js';

export class InMemorySignerAdapter implements SignerAdapter {
	readonly id = 'in-memory';
	readonly name = 'In-Memory Signer';

	#accounts: ManagedAccount[] = [];
	#listeners: Set<(accounts: ManagedAccount[]) => void> = new Set();

	async initialize(): Promise<void> {
		// No-op for in-memory adapter
	}

	getAccounts(): ManagedAccount[] {
		return [...this.#accounts];
	}

	getAccount(address: string): ManagedAccount | undefined {
		return this.#accounts.find((account) => account.address === address);
	}

	async createAccount(options?: CreateAccountOptions): Promise<ManagedAccount> {
		const keypair = new Ed25519Keypair();
		const address = keypair.getPublicKey().toSuiAddress();
		const label = options?.label ?? `Account ${this.#accounts.length + 1}`;

		const walletAccount = new ReadonlyWalletAccount({
			address,
			publicKey: keypair.getPublicKey().toSuiBytes(),
			chains: [...SUI_CHAINS],
			features: ['sui:signTransaction', 'sui:signAndExecuteTransaction', 'sui:signPersonalMessage'],
		});

		const managedAccount: ManagedAccount = {
			address,
			label,
			signer: keypair,
			walletAccount,
		};

		this.#accounts.push(managedAccount);
		this.#notifyListeners();

		return managedAccount;
	}

	async importAccount(options: ImportAccountOptions): Promise<ManagedAccount> {
		const signer = options.signer;
		const address = signer.toSuiAddress();

		if (this.getAccount(address)) {
			return this.getAccount(address)!;
		}

		const label = options.label ?? `Account ${this.#accounts.length + 1}`;

		const walletAccount = new ReadonlyWalletAccount({
			address,
			publicKey: signer.getPublicKey().toSuiBytes(),
			chains: [...SUI_CHAINS],
			features: ['sui:signTransaction', 'sui:signAndExecuteTransaction', 'sui:signPersonalMessage'],
		});

		const managedAccount: ManagedAccount = {
			address,
			label,
			signer,
			walletAccount,
		};

		this.#accounts.push(managedAccount);
		this.#notifyListeners();

		return managedAccount;
	}

	async removeAccount(address: string): Promise<boolean> {
		const index = this.#accounts.findIndex((account) => account.address === address);

		if (index === -1) {
			return false;
		}

		this.#accounts.splice(index, 1);
		this.#notifyListeners();

		return true;
	}

	onAccountsChanged(callback: (accounts: ManagedAccount[]) => void): () => void {
		this.#listeners.add(callback);

		return () => {
			this.#listeners.delete(callback);
		};
	}

	destroy(): void {
		this.#accounts = [];
		this.#listeners.clear();
	}

	#notifyListeners(): void {
		const accounts = this.getAccounts();
		for (const listener of this.#listeners) {
			listener(accounts);
		}
	}
}
