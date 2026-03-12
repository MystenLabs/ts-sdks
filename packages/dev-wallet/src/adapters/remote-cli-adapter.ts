// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Signer } from '@mysten/sui/cryptography';
import type { PublicKey, SignatureScheme } from '@mysten/sui/cryptography';
import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1PublicKey } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1PublicKey } from '@mysten/sui/keypairs/secp256r1';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type { ImportAccountOptions, ManagedAccount } from '../types.js';
import { BaseSignerAdapter } from './base-adapter.js';
import { buildManagedAccount } from './build-managed-account.js';

/**
 * Wallet features advertised by CLI-backed accounts.
 * Personal message signing is not supported because the `sui keytool sign`
 * command only accepts BCS-serialized TransactionData.
 */
const CLI_WALLET_FEATURES = ['sui:signTransaction', 'sui:signAndExecuteTransaction'] as const;

/** Cache TTL for the CLI server accounts fetch (milliseconds). */
const ACCOUNTS_CACHE_TTL_MS = 5000;

/** Thrown when the server rejects a request with a 401 or 403 status. */
class AuthError extends Error {
	constructor() {
		super('Unauthorized');
		this.name = 'AuthError';
	}
}

/** Map CLI `keyScheme` strings to SDK {@link SignatureScheme} values. */
const KEY_SCHEME_MAP: Record<string, SignatureScheme> = {
	ed25519: 'ED25519',
	secp256k1: 'Secp256k1',
	secp256r1: 'Secp256r1',
};

/** Account metadata returned by the server `/api/v1/accounts` endpoint. */
interface ServerAccountInfo {
	suiAddress: string;
	publicBase64Key: string;
	keyScheme: string;
	alias: string | null;
}

function publicKeyFromSuiBytes(publicBase64Key: string, scheme: SignatureScheme): PublicKey {
	const allBytes = fromBase64(publicBase64Key);
	const rawBytes = allBytes.slice(1);

	switch (scheme) {
		case 'ED25519':
			return new Ed25519PublicKey(rawBytes);
		case 'Secp256k1':
			return new Secp256k1PublicKey(rawBytes);
		case 'Secp256r1':
			return new Secp256r1PublicKey(rawBytes);
		default:
			throw new Error(`Unsupported key scheme: ${scheme}`);
	}
}

/**
 * A {@link Signer} that delegates transaction signing to a server HTTP endpoint
 * backed by `sui keytool sign`. Private keys never enter JavaScript.
 *
 * `signPersonalMessage()` is not supported — `sui keytool sign` only accepts
 * BCS-serialized `TransactionData`.
 */
export class CliProxySigner extends Signer {
	#address: string;
	#publicKey: PublicKey;
	#scheme: SignatureScheme;
	#serverOrigin: string;
	#authToken: string | null;

	constructor(options: {
		address: string;
		publicKey: PublicKey;
		scheme: SignatureScheme;
		serverOrigin: string;
		authToken?: string | null;
	}) {
		super();
		this.#address = options.address;
		this.#publicKey = options.publicKey;
		this.#scheme = options.scheme;
		this.#serverOrigin = options.serverOrigin;
		this.#authToken = options.authToken ?? null;
	}

	async sign(_bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
		throw new Error(
			'CliProxySigner does not support direct digest signing. ' +
				'Transaction signing is handled via the sui CLI.',
		);
	}

	getKeyScheme(): SignatureScheme {
		return this.#scheme;
	}

	getPublicKey(): PublicKey {
		return this.#publicKey;
	}

	override toSuiAddress(): string {
		return this.#address;
	}

	override async signTransaction(bytes: Uint8Array) {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (this.#authToken) {
			headers['Authorization'] = `Bearer ${this.#authToken}`;
		}

		const res = await fetch(`${this.#serverOrigin}/api/v1/sign-transaction`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				address: this.#address,
				txBytes: toBase64(bytes),
			}),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(`Transaction signing failed: ${body.error ?? res.statusText}`);
		}

		const { suiSignature } = await res.json();
		if (typeof suiSignature !== 'string' || suiSignature.length === 0) {
			throw new Error('Transaction signing failed: server returned invalid signature');
		}
		return {
			bytes: toBase64(bytes),
			signature: suiSignature,
		};
	}

	override async signPersonalMessage(_bytes: Uint8Array): Promise<never> {
		throw new Error(
			'Personal message signing is not supported in CLI mode. ' +
				'The sui keytool sign command only supports TransactionData. ' +
				'Use --adapter=webcrypto or --adapter=memory for personal message signing.',
		);
	}
}

/**
 * {@link SignerAdapter} that delegates signing to a server running the `sui` CLI.
 *
 * Authentication uses a token-in-URL approach: the CLI server prints a URL with
 * a token, which gets stored in `localStorage` for subsequent page loads. Imported
 * account addresses are also persisted so they survive CLI restarts.
 */
export class RemoteCliAdapter extends BaseSignerAdapter {
	readonly id = 'remote-cli';
	readonly name = 'Remote CLI Signer';
	readonly allowAutoSign = false;

	protected override getDefaultLabel(): string {
		return `CLI Account ${this.getAccounts().length + 1}`;
	}

	// Keys are scoped per origin to prevent cross-site leakage on shared localhost setups.
	// localStorage is used rather than sessionStorage because popup wallet flows
	// (DevWalletClient) may open new tabs that need access to the token.
	static storageKey(suffix: string): string {
		const origin = typeof location !== 'undefined' ? location.origin : 'unknown';
		return `dev-wallet:${suffix}:${origin}`;
	}

	static get STORAGE_KEY(): string {
		return RemoteCliAdapter.storageKey('cli-imported-addresses');
	}

	static get TOKEN_KEY(): string {
		return RemoteCliAdapter.storageKey('cli-token');
	}

	#serverOrigin: string;
	#authToken: string | null = null;
	#allServerAccounts: ServerAccountInfo[] = [];
	#lastFetch: { time: number; result: ServerAccountInfo[] } | null = null;

	constructor(options?: { serverOrigin?: string; token?: string }) {
		super();
		const origin = options?.serverOrigin ?? '';
		if (origin) {
			try {
				new URL(origin);
			} catch {
				throw new Error(`Invalid serverOrigin URL: "${origin}"`);
			}
		}
		this.#serverOrigin = origin;
		if (options?.token) {
			this.#authToken = options.token;
		}
	}

	get isPaired(): boolean {
		return this.#authToken !== null;
	}

	async initialize(): Promise<void> {
		if (!this.#authToken && typeof localStorage !== 'undefined') {
			const stored = localStorage.getItem(RemoteCliAdapter.TOKEN_KEY);
			if (stored) {
				this.#authToken = stored;
			}
		}

		if (this.#authToken) {
			try {
				await this.#fetchServerAccounts();
				await this.#restoreImportedAccounts();
			} catch (error) {
				if (error instanceof AuthError) {
					this.#authToken = null;
					if (typeof localStorage !== 'undefined') {
						localStorage.removeItem(RemoteCliAdapter.TOKEN_KEY);
					}
				} else {
					console.warn('[dev-wallet] CLI adapter initialization failed:', error);
				}
			}
		}
	}

	async listAvailableAccounts(): Promise<
		Array<{ address: string; scheme: string; alias: string | null }>
	> {
		await this.#fetchServerAccounts();
		const importedAddresses = new Set(this._accounts.map((a) => a.address));
		return this.#allServerAccounts
			.filter((info) => {
				const scheme = KEY_SCHEME_MAP[info.keyScheme];
				return scheme && !importedAddresses.has(info.suiAddress);
			})
			.map((info) => ({
				address: info.suiAddress,
				scheme: info.keyScheme,
				alias: info.alias,
			}));
	}

	async importAccount(options: ImportAccountOptions): Promise<ManagedAccount> {
		const address = options.address;
		if (!address) {
			throw new Error('Remote CLI adapter requires an address to import');
		}

		if (this._accounts.some((a) => a.address === address)) {
			throw new Error(`Account ${address} is already imported`);
		}

		await this.#fetchServerAccounts();
		const info = this.#allServerAccounts.find((a) => a.suiAddress === address);
		if (!info) {
			throw new Error(`Account ${address} not found on server`);
		}

		const scheme = KEY_SCHEME_MAP[info.keyScheme];
		if (!scheme) {
			throw new Error(`Unsupported key scheme: ${info.keyScheme}`);
		}

		const account = this.#serverAccountToManaged(info, scheme, options.label);
		this.addAccount(account);
		this.#saveImportedAddresses();
		return account;
	}

	async removeAccount(address: string): Promise<boolean> {
		const removed = this.removeAccountByAddress(address);
		if (removed) {
			this.#saveImportedAddresses();
		}
		return removed;
	}

	override destroy(): void {
		this.#allServerAccounts = [];
		this.#authToken = null;
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(RemoteCliAdapter.TOKEN_KEY);
			localStorage.removeItem(RemoteCliAdapter.STORAGE_KEY);
		}
		super.destroy();
	}

	#authHeaders(): Record<string, string> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (this.#authToken) {
			headers['Authorization'] = `Bearer ${this.#authToken}`;
		}
		return headers;
	}

	async #fetchServerAccounts(forceRefresh = false): Promise<void> {
		if (
			!forceRefresh &&
			this.#lastFetch &&
			Date.now() - this.#lastFetch.time < ACCOUNTS_CACHE_TTL_MS
		) {
			this.#allServerAccounts = this.#lastFetch.result;
			return;
		}
		const res = await fetch(`${this.#serverOrigin}/api/v1/accounts`, {
			headers: this.#authHeaders(),
		});
		if (res.status === 401 || res.status === 403) {
			throw new AuthError();
		}
		if (!res.ok) {
			throw new Error(`Failed to fetch accounts: ${res.statusText}`);
		}

		const { accounts } = (await res.json()) as { accounts: ServerAccountInfo[] };
		this.#allServerAccounts = accounts;
		this.#lastFetch = { time: Date.now(), result: accounts };
	}

	async #restoreImportedAccounts(): Promise<void> {
		const saved = this.#loadImportedAddresses();
		if (saved.length === 0) return;

		const existingAddresses = new Set(this.getAccounts().map((a) => a.address));
		const restored: ManagedAccount[] = [];

		for (const address of saved) {
			if (existingAddresses.has(address)) continue;

			const info = this.#allServerAccounts.find((a) => a.suiAddress === address);
			if (!info) continue; // Account no longer on server — skip

			const scheme = KEY_SCHEME_MAP[info.keyScheme];
			if (!scheme) continue;

			restored.push(this.#serverAccountToManaged(info, scheme));
		}

		if (restored.length > 0) {
			this.setInitialAccounts([...this.getAccounts(), ...restored]);
		}
	}

	#loadImportedAddresses(): string[] {
		if (typeof localStorage === 'undefined') return [];
		try {
			const raw = localStorage.getItem(RemoteCliAdapter.STORAGE_KEY);
			if (!raw) return [];
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((v): v is string => typeof v === 'string');
		} catch {
			return [];
		}
	}

	#saveImportedAddresses(): void {
		if (typeof localStorage === 'undefined') return;
		const addresses = this._accounts.map((a) => a.address);
		localStorage.setItem(RemoteCliAdapter.STORAGE_KEY, JSON.stringify(addresses));
	}

	#serverAccountToManaged(
		info: ServerAccountInfo,
		scheme: SignatureScheme,
		label?: string,
	): ManagedAccount {
		const publicKey = publicKeyFromSuiBytes(info.publicBase64Key, scheme);

		const signer = new CliProxySigner({
			address: info.suiAddress,
			publicKey,
			scheme,
			serverOrigin: this.#serverOrigin,
			authToken: this.#authToken,
		});

		const accountLabel = label ?? info.alias ?? this.getDefaultLabel();

		return buildManagedAccount(signer, info.suiAddress, accountLabel, CLI_WALLET_FEATURES);
	}
}
