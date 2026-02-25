// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Signer } from '@mysten/sui/cryptography';
import type { PublicKey, SignatureScheme } from '@mysten/sui/cryptography';
import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1PublicKey } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1PublicKey } from '@mysten/sui/keypairs/secp256r1';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';

import type { CreateAccountOptions, ManagedAccount, SignerAdapter } from '../types.js';

/**
 * Wallet features advertised by CLI-backed accounts.
 * Personal message signing is not supported because the `sui keytool sign`
 * command only accepts BCS-serialized TransactionData.
 */
const CLI_WALLET_FEATURES = ['sui:signTransaction', 'sui:signAndExecuteTransaction'] as const;

/** Map CLI `keyScheme` strings to SDK {@link SignatureScheme} values. */
const KEY_SCHEME_MAP: Record<string, SignatureScheme> = {
	ed25519: 'ED25519',
	secp256k1: 'Secp256k1',
	secp256r1: 'Secp256r1',
};

const VALID_SCHEMES = new Set(['ed25519', 'secp256k1', 'secp256r1']);

/** Account metadata returned by the server `/api/accounts` endpoint. */
interface ServerAccountInfo {
	suiAddress: string;
	publicBase64Key: string;
	keyScheme: string;
	alias: string | null;
}

/**
 * Construct the appropriate {@link PublicKey} from base64-encoded bytes (with
 * flag prefix) and a key scheme name.
 *
 * The `publicBase64Key` field from `sui keytool list --json` includes a
 * one-byte flag prefix. We strip it to get the raw public key bytes.
 */
function publicKeyFromSuiBytes(publicBase64Key: string, scheme: SignatureScheme): PublicKey {
	const allBytes = fromBase64(publicBase64Key);
	// Strip the flag byte (first byte) to get raw public key
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
 * A {@link Signer} that delegates transaction signing to a server HTTP
 * endpoint backed by the `sui keytool sign` CLI command.
 *
 * Private keys never leave the `sui` binary — our JavaScript (browser and
 * Node.js) never has access to key material.
 *
 * **Limitation:** `signPersonalMessage()` is not supported because the
 * `sui keytool sign` command only accepts BCS-serialized `TransactionData`.
 */
export class CliProxySigner extends Signer {
	#address: string;
	#publicKey: PublicKey;
	#scheme: SignatureScheme;
	#serverOrigin: string;

	constructor(options: {
		address: string;
		publicKey: PublicKey;
		scheme: SignatureScheme;
		serverOrigin: string;
	}) {
		super();
		this.#address = options.address;
		this.#publicKey = options.publicKey;
		this.#scheme = options.scheme;
		this.#serverOrigin = options.serverOrigin;
	}

	/**
	 * Raw digest signing — not used directly. {@link signTransaction} is
	 * overridden to call the server API which delegates to `sui keytool sign`.
	 */
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

	/**
	 * Sign a transaction by sending the BCS-serialized bytes to the server,
	 * which delegates to `sui keytool sign`.
	 *
	 * The CLI handles intent wrapping and hashing internally. The returned
	 * `suiSignature` is the complete serialized signature (flag + sig + pubkey).
	 */
	override async signTransaction(bytes: Uint8Array) {
		const res = await fetch(`${this.#serverOrigin}/api/sign-transaction`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				address: this.#address,
				txBytes: toBase64(bytes),
			}),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({ error: res.statusText }));
			throw new Error(`Transaction signing failed: ${body.error}`);
		}

		const { suiSignature } = await res.json();
		return {
			bytes: toBase64(bytes),
			signature: suiSignature,
		};
	}

	/**
	 * Personal message signing is not supported in CLI mode.
	 *
	 * The `sui keytool sign` command only accepts BCS-serialized
	 * `TransactionData` — there is no CLI command for personal message signing.
	 */
	override async signPersonalMessage(_bytes: Uint8Array): Promise<never> {
		throw new Error(
			'Personal message signing is not supported in CLI mode. ' +
				'The sui keytool sign command only supports TransactionData. ' +
				'Use --adapter=webcrypto or --adapter=memory for personal message signing.',
		);
	}
}

/**
 * Browser-side {@link SignerAdapter} that delegates all operations to a
 * server running the `sui` CLI.
 *
 * The server exposes HTTP endpoints backed by `sui keytool` commands:
 * - `GET /api/accounts` — lists keystore accounts (no key material)
 * - `POST /api/sign-transaction` — signs via `sui keytool sign`
 * - `POST /api/create-account` — creates via `sui client new-address`
 *
 * Private keys never enter JavaScript — they stay within the `sui` binary.
 */
export class RemoteCliAdapter implements SignerAdapter {
	readonly id = 'remote-cli';
	readonly name = 'Remote CLI Signer';

	#serverOrigin: string;
	#accounts: ManagedAccount[] = [];
	#listeners = new Set<(accounts: ManagedAccount[]) => void>();

	constructor(options?: { serverOrigin?: string }) {
		this.#serverOrigin = options?.serverOrigin ?? '';
	}

	async initialize(): Promise<void> {
		await this.#fetchAccounts();
	}

	getAccounts(): ManagedAccount[] {
		return [...this.#accounts];
	}

	getAccount(address: string): ManagedAccount | undefined {
		return this.#accounts.find((a) => a.address === address);
	}

	async createAccount(options?: CreateAccountOptions): Promise<ManagedAccount> {
		const scheme = (options?.scheme as string) ?? 'ed25519';
		if (!VALID_SCHEMES.has(scheme)) {
			throw new Error(
				`Invalid key scheme: ${scheme}. Must be one of: ${[...VALID_SCHEMES].join(', ')}`,
			);
		}

		const res = await fetch(`${this.#serverOrigin}/api/create-account`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ scheme, label: options?.label }),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({ error: res.statusText }));
			throw new Error(`Account creation failed: ${body.error}`);
		}

		// Refresh the full account list from the server
		const prevAddresses = new Set(this.#accounts.map((a) => a.address));
		await this.#fetchAccounts();

		const newAccount = this.#accounts.find((a) => !prevAddresses.has(a.address));
		if (!newAccount) {
			throw new Error('Account was created but not found after refresh');
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

	async #fetchAccounts(): Promise<void> {
		const res = await fetch(`${this.#serverOrigin}/api/accounts`);
		if (!res.ok) {
			throw new Error(`Failed to fetch accounts: ${res.statusText}`);
		}

		const { accounts } = (await res.json()) as { accounts: ServerAccountInfo[] };

		this.#accounts = accounts
			.map((info, index): ManagedAccount | null => {
				const scheme = KEY_SCHEME_MAP[info.keyScheme];
				if (!scheme) return null;

				const publicKey = publicKeyFromSuiBytes(info.publicBase64Key, scheme);

				const signer = new CliProxySigner({
					address: info.suiAddress,
					publicKey,
					scheme,
					serverOrigin: this.#serverOrigin,
				});

				const walletAccount = new ReadonlyWalletAccount({
					address: info.suiAddress,
					publicKey: publicKey.toSuiBytes(),
					chains: [...SUI_CHAINS],
					features: [...CLI_WALLET_FEATURES],
				});

				return {
					address: info.suiAddress,
					label: info.alias ?? `CLI Account ${index + 1}`,
					signer,
					walletAccount,
				};
			})
			.filter((a): a is ManagedAccount => a !== null);
	}

	#notifyListeners(): void {
		const accounts = this.getAccounts();
		for (const listener of this.#listeners) {
			listener(accounts);
		}
	}
}
