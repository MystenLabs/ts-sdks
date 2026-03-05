// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ExportedWebCryptoKeypair } from '@mysten/signers/webcrypto';
import { WebCryptoSigner } from '@mysten/signers/webcrypto';
import { createStore, del, entries, get, set, type IDBStore } from './idb-store.js';

import type { CreateAccountOptions, ManagedAccount } from '../types.js';
import { BaseSignerAdapter } from './base-adapter.js';
import { buildManagedAccount } from './build-managed-account.js';

interface StoredAccountMeta {
	address: string;
	label: string;
}

const DEFAULT_DB_NAME = 'dev-wallet-webcrypto';
const DEFAULT_STORE_NAME = 'accounts';
const META_KEY = '__account_meta__';

export class WebCryptoSignerAdapter extends BaseSignerAdapter {
	readonly id = 'webcrypto';
	readonly name = 'WebCrypto Signer';

	#store: IDBStore;

	constructor(options?: { dbName?: string; storeName?: string }) {
		super();
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

		const accounts = [];

		for (const [key, value] of allEntries) {
			if (key === META_KEY) continue;

			const address = key as string;
			const exported = value as ExportedWebCryptoKeypair;
			const signer = WebCryptoSigner.import(exported);
			const accountMeta = meta.find((m) => m.address === address);

			accounts.push(buildManagedAccount(signer, address, accountMeta?.label ?? 'Account'));
		}

		this.setInitialAccounts(accounts);
	}

	async createAccount(options?: CreateAccountOptions): Promise<ManagedAccount> {
		const signer = await WebCryptoSigner.generate();
		const address = signer.getPublicKey().toSuiAddress();
		const label = options?.label ?? `Account ${this.getAccounts().length + 1}`;

		const managedAccount = buildManagedAccount(signer, address, label);

		// Persist key and meta to IndexedDB
		await set(address, signer.export(), this.#store);
		this.addAccount(managedAccount);
		await this.#saveMeta();

		return managedAccount;
	}

	async renameAccount(address: string, label: string): Promise<boolean> {
		if (!this._performRename(address, label)) return false;
		await this.#saveMeta();
		return true;
	}

	async removeAccount(address: string): Promise<boolean> {
		if (!this.removeAccountByAddress(address)) return false;

		// Remove from IndexedDB
		await del(address, this.#store);
		await this.#saveMeta();
		return true;
	}

	async #saveMeta(): Promise<void> {
		const meta: StoredAccountMeta[] = this.getAccounts().map((a) => ({
			address: a.address,
			label: a.label,
		}));
		await set(META_KEY, meta, this.#store);
	}
}
