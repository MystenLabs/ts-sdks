// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Signer } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { fromBase64 } from '@mysten/sui/utils';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';

import type { ManagedAccount, SignerAdapter } from '../types.js';

const DEFAULT_KEYSTORE_PATH = join(homedir(), '.sui', 'sui_config', 'sui.keystore');

const WALLET_FEATURES = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
] as const;

/**
 * Read-only signer adapter that loads keys from a Sui keystore file.
 *
 * Unlike `SuiCliSignerAdapter`, this adapter does not require the `sui` CLI
 * to be installed — it only reads the keystore file. Account creation is
 * not supported; manage keys with the Sui CLI or by editing the keystore
 * file directly.
 *
 * Node.js only — not available in browsers.
 *
 * @example
 * ```typescript
 * const adapter = new KeystoreSignerAdapter();
 * await adapter.initialize(); // reads ~/.sui/sui_config/sui.keystore
 * console.log(adapter.getAccounts()); // loaded accounts
 * ```
 */
export class KeystoreSignerAdapter implements SignerAdapter {
	readonly id = 'keystore';
	readonly name = 'Keystore Signer';

	#keystorePath: string;
	#accounts: ManagedAccount[] = [];
	#listeners = new Set<(accounts: ManagedAccount[]) => void>();

	constructor(options?: { keystorePath?: string }) {
		this.#keystorePath = options?.keystorePath ?? DEFAULT_KEYSTORE_PATH;
	}

	async initialize(): Promise<void> {
		await this.#loadKeystore();
	}

	getAccounts(): ManagedAccount[] {
		return [...this.#accounts];
	}

	getAccount(address: string): ManagedAccount | undefined {
		return this.#accounts.find((a) => a.address === address);
	}

	/**
	 * Reload the keystore file and pick up any new keys.
	 * Useful if the keystore was modified externally.
	 */
	async reload(): Promise<void> {
		await this.#loadKeystore();
		this.#notifyListeners();
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

	async #loadKeystore(): Promise<void> {
		const content = await readFile(this.#keystorePath, 'utf-8');
		const keys: string[] = JSON.parse(content);

		const existingAddresses = new Set(this.#accounts.map((a) => a.address));

		for (const base64Key of keys) {
			let signer: Signer;
			try {
				const bytes = fromBase64(base64Key);
				const flag = bytes[0];
				const secretKey = bytes.slice(1);

				switch (flag) {
					case 0x00:
						signer = Ed25519Keypair.fromSecretKey(secretKey);
						break;
					case 0x01:
						signer = Secp256k1Keypair.fromSecretKey(secretKey);
						break;
					case 0x02:
						signer = Secp256r1Keypair.fromSecretKey(secretKey);
						break;
					default:
						continue;
				}
			} catch {
				continue;
			}

			const address = signer.toSuiAddress();
			if (existingAddresses.has(address)) {
				continue;
			}
			existingAddresses.add(address);

			const label = `Keystore Account ${this.#accounts.length + 1}`;
			const walletAccount = new ReadonlyWalletAccount({
				address,
				publicKey: signer.getPublicKey().toSuiBytes(),
				chains: [...SUI_CHAINS],
				features: [...WALLET_FEATURES],
			});

			this.#accounts.push({ address, label, signer, walletAccount });
		}
	}

	#notifyListeners(): void {
		const accounts = this.getAccounts();
		for (const listener of this.#listeners) {
			listener(accounts);
		}
	}
}
