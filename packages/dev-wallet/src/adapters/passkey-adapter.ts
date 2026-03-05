// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PasskeyKeypair } from '@mysten/sui/keypairs/passkey';
import type { PasskeyProvider } from '@mysten/sui/keypairs/passkey';
import { createStore, get, set, type IDBStore } from './idb-store.js';

import type { CreateAccountOptions } from '../types.js';
import { BaseSignerAdapter } from './base-adapter.js';
import { buildManagedAccount } from './build-managed-account.js';

/** Metadata stored in IndexedDB for each passkey account. */
interface StoredPasskeyMeta {
	address: string;
	label: string;
	/** Compressed secp256r1 public key (33 bytes, stored as number array). */
	publicKeyBytes: number[];
	/** WebAuthn credential ID (stored as number array). Used to constrain credential selection during signing. */
	credentialId?: number[];
}

const DEFAULT_DB_NAME = 'dev-wallet-passkey';
const DEFAULT_STORE_NAME = 'accounts';
const META_KEY = '__passkey_accounts__';

/**
 * Signer adapter that manages passkey-backed accounts.
 *
 * Uses the WebAuthn/Passkey API via `PasskeyKeypair` from `@mysten/sui/keypairs/passkey`.
 * Each signing operation triggers a browser biometric/PIN prompt.
 *
 * Account metadata (public key, label) is persisted in IndexedDB. The passkey
 * credential itself is managed by the browser/OS — private keys never enter JS.
 *
 * `allowAutoSign` is `false` because passkeys require user interaction.
 *
 * Browser only — requires `navigator.credentials` and `indexedDB`.
 */
export class PasskeySignerAdapter extends BaseSignerAdapter {
	readonly id = 'passkey';
	readonly name = 'Passkey Signer';
	readonly allowAutoSign = false;

	#store: IDBStore;
	#provider: PasskeyProvider | null;

	constructor(options?: { dbName?: string; storeName?: string; provider?: PasskeyProvider }) {
		super();
		this.#store = createStore(
			options?.dbName ?? DEFAULT_DB_NAME,
			options?.storeName ?? DEFAULT_STORE_NAME,
		);
		// Allow injecting a custom provider (useful for testing)
		if (options?.provider) {
			this.#provider = options.provider;
		} else {
			// Lazy-load BrowserPasskeyProvider at construction (avoids importing
			// browser globals in environments where they don't exist)
			this.#provider = null;
		}
	}

	#getProvider(): PasskeyProvider {
		if (!this.#provider) {
			throw new Error('PasskeySignerAdapter not initialized. Call initialize() first.');
		}
		return this.#provider;
	}

	async initialize(): Promise<void> {
		if (!this.#provider) {
			const { BrowserPasskeyProvider } = await import('@mysten/sui/keypairs/passkey');
			this.#provider = new BrowserPasskeyProvider('Dev Wallet Passkey', {
				rp: { id: globalThis.location?.hostname },
			});
		}

		const stored = await get<StoredPasskeyMeta[]>(META_KEY, this.#store);
		if (!stored) return;

		const provider = this.#getProvider();
		this.setInitialAccounts(
			stored.map((meta) => {
				const publicKeyBytes = new Uint8Array(meta.publicKeyBytes);
				const credentialId = meta.credentialId ? new Uint8Array(meta.credentialId) : undefined;
				const signer = new PasskeyKeypair(publicKeyBytes, provider, credentialId);
				return buildManagedAccount(signer, meta.address, meta.label);
			}),
		);
	}

	async createAccount(options?: CreateAccountOptions) {
		const signer = await PasskeyKeypair.getPasskeyInstance(this.#getProvider());
		const address = signer.toSuiAddress();
		const label = options?.label ?? `Passkey Account ${this.getAccounts().length + 1}`;

		const managedAccount = buildManagedAccount(signer, address, label);
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
		await this.#saveMeta();
		return true;
	}

	async #saveMeta(): Promise<void> {
		const meta: StoredPasskeyMeta[] = this.getAccounts().map((a) => {
			const credentialId = (a.signer as PasskeyKeypair).getCredentialId?.();
			return {
				address: a.address,
				label: a.label,
				publicKeyBytes: [...a.signer.getPublicKey().toRawBytes()],
				...(credentialId && { credentialId: [...credentialId] }),
			};
		});
		await set(META_KEY, meta, this.#store);
	}
}
