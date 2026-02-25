// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { Signer } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { fromBase64 } from '@mysten/sui/utils';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';

import type { CreateAccountOptions, ManagedAccount, SignerAdapter } from '../types.js';

const execFileAsync = promisify(execFile);

const DEFAULT_KEYSTORE_PATH = join(homedir(), '.sui', 'sui_config', 'sui.keystore');

const WALLET_FEATURES = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
] as const;

/**
 * Signer adapter that reads keys from the Sui CLI keystore file.
 *
 * Keys are loaded in-process from `~/.sui/sui_config/sui.keystore` for fast
 * signing. Account creation shells out to `sui client new-address`.
 *
 * Node.js only — not available in browsers.
 */
export class SuiCliSignerAdapter implements SignerAdapter {
	readonly id = 'sui-cli';
	readonly name = 'Sui CLI Signer';

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

	async createAccount(options?: CreateAccountOptions): Promise<ManagedAccount> {
		const scheme = (options?.scheme as string) ?? 'ed25519';
		await execFileAsync('sui', ['client', 'new-address', scheme, '--json']);

		const prevAddresses = new Set(this.#accounts.map((a) => a.address));
		await this.#loadKeystore();

		const newAccount = this.#accounts.find((a) => !prevAddresses.has(a.address));
		if (!newAccount) {
			throw new Error('Failed to create new account via sui CLI');
		}

		if (options?.label) {
			newAccount.label = options.label;
		}

		this.#notifyListeners();
		return newAccount;
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

			const label = `CLI Account ${this.#accounts.length + 1}`;
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
