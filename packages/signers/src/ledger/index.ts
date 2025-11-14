// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type SuiLedgerClient from '@mysten/ledgerjs-hw-app-sui';
import type { SuiClient } from '@mysten/sui/client';
import type { SignatureWithBytes } from '@mysten/sui/cryptography';
import { messageWithIntent, Signer, toSerializedSignature } from '@mysten/sui/cryptography';
import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';

import { bcs } from '@mysten/sui/bcs';
import { getInputObjects } from './objects.js';

export { SuiMoveObject } from './bcs.js';
export { getInputObjects } from './objects.js';

/**
 * Configuration options for initializing the LedgerSigner.
 */
export interface LedgerSignerOptions {
	publicKey: Ed25519PublicKey;
	derivationPath: string;
	ledgerClient: SuiLedgerClient;
	suiClient: SuiClient;
}

/**
 * Ledger integrates with the Sui blockchain to provide signing capabilities using Ledger devices.
 */
export class LedgerSigner extends Signer {
	#derivationPath: string;
	#publicKey: Ed25519PublicKey;
	#ledgerClient: SuiLedgerClient;
	#suiClient: SuiClient;

	/**
	 * Creates an instance of LedgerSigner. It's expected to call the static `fromDerivationPath` method to create an instance.
	 * @example
	 * ```
	 * const signer = await LedgerSigner.fromDerivationPath(derivationPath, options);
	 * ```
	 */
	constructor({ publicKey, derivationPath, ledgerClient, suiClient }: LedgerSignerOptions) {
		super();
		this.#publicKey = publicKey;
		this.#derivationPath = derivationPath;
		this.#ledgerClient = ledgerClient;
		this.#suiClient = suiClient;
	}

	/**
	 * Retrieves the key scheme used by this signer.
	 */
	override getKeyScheme() {
		return 'ED25519' as const;
	}

	/**
	 * Retrieves the public key associated with this signer.
	 * @returns The Ed25519PublicKey instance.
	 */
	override getPublicKey() {
		return this.#publicKey;
	}

	/**
	 * Signs the provided transaction bytes.
	 * @returns The signed transaction bytes and signature.
	 */
	override async signTransaction(bytes: Uint8Array): Promise<SignatureWithBytes> {
		const transactionOptions = await getInputObjects(
			Transaction.from(bytes),
			this.#suiClient,
		).catch(() => ({
			// Fail gracefully so network errors or serialization issues don't break transaction signing:
			bcsObjects: [],
		}));

		const intentMessage = messageWithIntent('TransactionData', bytes);
		const { signature } = await this.#ledgerClient.signTransaction(
			this.#derivationPath,
			intentMessage,
			transactionOptions,
		);

		return {
			bytes: toBase64(bytes),
			signature: toSerializedSignature({
				signature,
				signatureScheme: this.getKeyScheme(),
				publicKey: this.#publicKey,
			}),
		};
	}

	/**
	 * Signs the provided personal message.
	 * @returns The signed message bytes and signature.
	 */
	override async signPersonalMessage(bytes: Uint8Array): Promise<SignatureWithBytes> {
		const intentMessage = messageWithIntent(
			'PersonalMessage',
			bcs.byteVector().serialize(bytes).toBytes(),
		);
		const { signature } = await this.#ledgerClient.signTransaction(
			this.#derivationPath,
			intentMessage,
		);

		return {
			bytes: toBase64(bytes),
			signature: toSerializedSignature({
				signature,
				signatureScheme: this.getKeyScheme(),
				publicKey: this.#publicKey,
			}),
		};
	}

	/**
	 * Prepares the signer by fetching and setting the public key from a Ledger device.
	 * It is recommended to initialize an `LedgerSigner` instance using this function.
	 * @returns A promise that resolves once a `LedgerSigner` instance is prepared (public key is set).
	 */
	static async fromDerivationPath(
		derivationPath: string,
		ledgerClient: SuiLedgerClient,
		suiClient: SuiClient,
	) {
		const { publicKey } = await ledgerClient.getPublicKey(derivationPath);
		if (!publicKey) {
			throw new Error('Failed to get public key from Ledger.');
		}

		return new LedgerSigner({
			derivationPath,
			publicKey: new Ed25519PublicKey(publicKey),
			ledgerClient,
			suiClient,
		});
	}

	/**
	 * Generic signing is not supported by Ledger.
	 * @throws Always throws an error indicating generic signing is unsupported.
	 */
	override sign(): never {
		throw new Error('Ledger Signer does not support generic signing.');
	}

	/**
	 * Generic signing is not supported by Ledger.
	 * @throws Always throws an error indicating generic signing is unsupported.
	 */
	override signWithIntent(): never {
		throw new Error('Ledger Signer does not support generic signing.');
	}
}
