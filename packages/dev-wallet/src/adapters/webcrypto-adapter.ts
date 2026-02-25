// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ExportedWebCryptoKeypair } from '@mysten/signers/webcrypto';
import { WebCryptoSigner } from '@mysten/signers/webcrypto';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';
import { createStore, del, entries, get, set } from 'idb-keyval';

import type { CreateAccountOptions, ManagedAccount, SignerAdapter } from '../types.js';

interface StoredAccountMeta {
	address: string;
	label: string;
}

const DEFAULT_DB_NAME = 'dev-wallet-webcrypto';
const DEFAULT_STORE_NAME = 'accounts';
const META_KEY = '__account_meta__';

export class WebCryptoSignerAdapter implements SignerAdapter {
	readonly id = 'webcrypto';
	readonly name = 'WebCrypto Signer';

	#accounts: ManagedAccount[] = [];
	#listeners: Set<(accounts: ManagedAccount[]) => void> = new Set();
	#store: ReturnType<typeof createStore>;

	constructor(options?: { dbName?: string; storeName?: string }) {
		this.#store = createStore(
			options?.dbName ?? DEFAULT_DB_NAME,
			options?.storeName ?? DEFAULT_STORE_NAME,
		);
	}

	async initialize(): Promise<void> {
		const allEntries = await entries<string, ExportedWebCryptoKeypair | StoredAccountMeta[]>(
			this.#store,
		);
		const meta: StoredAccountMeta[] = (await get<StoredAccountMeta[]>(META_KEY, this.#store)) ?? [];

		this.#accounts = [];

		for (const [key, value] of allEntries) {
			if (key === META_KEY) continue;

			const address = key as string;
			const exported = value as ExportedWebCryptoKeypair;
			const signer = WebCryptoSigner.import(exported);
			const accountMeta = meta.find((m) => m.address === address);

			this.#accounts.push(
				this.#buildManagedAccount(signer, address, accountMeta?.label ?? 'Account'),
			);
		}
	}

	getAccounts(): ManagedAccount[] {
		return [...this.#accounts];
	}

	getAccount(address: string): ManagedAccount | undefined {
		return this.#accounts.find((account) => account.address === address);
	}

	async createAccount(options?: CreateAccountOptions): Promise<ManagedAccount> {
		const signer = await WebCryptoSigner.generate();
		const address = signer.getPublicKey().toSuiAddress();
		const label = options?.label ?? `Account ${this.#accounts.length + 1}`;

		const managedAccount = this.#buildManagedAccount(signer, address, label);
		this.#accounts.push(managedAccount);

		// Persist key and meta to IndexedDB
		await set(address, signer.export(), this.#store);
		await this.#saveMeta();

		this.#notifyListeners();

		return managedAccount;
	}

	async removeAccount(address: string): Promise<boolean> {
		const index = this.#accounts.findIndex((account) => account.address === address);

		if (index === -1) {
			return false;
		}

		this.#accounts.splice(index, 1);

		// Remove from IndexedDB
		await del(address, this.#store);
		await this.#saveMeta();

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

	#buildManagedAccount(signer: WebCryptoSigner, address: string, label: string): ManagedAccount {
		const walletAccount = new ReadonlyWalletAccount({
			address,
			publicKey: signer.getPublicKey().toSuiBytes(),
			chains: [...SUI_CHAINS],
			features: ['sui:signTransaction', 'sui:signAndExecuteTransaction', 'sui:signPersonalMessage'],
		});

		return { address, label, signer, walletAccount };
	}

	async #saveMeta(): Promise<void> {
		const meta: StoredAccountMeta[] = this.#accounts.map((a) => ({
			address: a.address,
			label: a.label,
		}));
		await set(META_KEY, meta, this.#store);
	}

	#notifyListeners(): void {
		const accounts = this.getAccounts();
		for (const listener of this.#listeners) {
			listener(accounts);
		}
	}
}
