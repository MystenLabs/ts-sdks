// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type SuiLedgerClient from '@mysten/ledgerjs-hw-app-sui';
import type { SignatureWithBytes } from '@mysten/sui/cryptography';
import { messageWithIntent, Signer, toSerializedSignature } from '@mysten/sui/cryptography';
import { Ed25519PublicKey } from '@mysten/sui/src/keypairs/ed25519/publickey.js';
// import { Transaction } from '@mysten/sui/src/transactions';
import { toBase64 } from '@mysten/sui/utils';

/**
 * Configuration options for initializing the LedgerSigner.
 */
export interface LedgerSignerOptions {
	publicKey: Ed25519PublicKey;
	derivationPath: string;
	suiLedgerClient: SuiLedgerClient;
}

/**
 * Ledger integrates with the Sui blockchain to provide signing capabilities using Ledger devices.
 */
export class LedgerSigner extends Signer {
	#derivationPath: string;
	#publicKey: Ed25519PublicKey;
	#suiLedgerClient: SuiLedgerClient;

	/**
	 * Creates an instance of LedgerSigner. It's expected to call the static `fromDerivationPath` method to create an instance.
	 * For example:
	 * ```
	 * const signer = await LedgerSigner.fromDerivationPath(derivationPath, options);
	 * ```
	 */
	constructor({ publicKey, derivationPath, suiLedgerClient }: LedgerSignerOptions) {
		super();
		this.#publicKey = publicKey;
		this.#derivationPath = derivationPath;
		this.#suiLedgerClient = suiLedgerClient;
	}

	/**
	 * Retrieves the key scheme used by this signer.
	 */
	getKeyScheme() {
		return 'ED25519' as const;
	}

	/**
	 * Retrieves the public key associated with this signer.
	 * @returns The Ed25519PublicKey instance.
	 */
	getPublicKey() {
		return this.#publicKey;
	}

	/**
	 * Signs the provided transaction bytes.
	 * @returns The signed transaction bytes and signature.
	 */
	async signTransaction(bytes: Uint8Array): Promise<SignatureWithBytes> {
		const intentMessage = messageWithIntent('TransactionData', bytes);
<<<<<<< HEAD
		const { coinTypes } = getClearSigningOptions(bytes);
		const { signature } = await this.#suiLedgerClient.signTransaction(
			this.#derivationPath,
			intentMessage,
			coinTypes,
=======
		const transactionOptions = getClearSigningOptions(bytes);
		const { signature } = await this.#suiLedgerClient.signTransaction(
			this.#derivationPath,
			intentMessage,
			transactionOptions,
>>>>>>> 75405bd (fix)
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
	 * Generic signing is not supported by Ledger.
	 * @throws Always throws an error indicating generic signing is unsupported.
	 */
	sign(): never {
		throw new Error('Ledger Signer does not support generic signing.');
	}

	/**
	 * Synchronous signing is not supported by Ledger.
	 * @throws Always throws an error indicating synchronous signing is unsupported.
	 */
	signData(): never {
		throw new Error('Ledger Signer does not support sync signing');
	}

	/**
	 * Signing personal messages is not supported by the Sui Ledger app.
	 * @throws Always throws an error indicating message signing is unsupported.
	 */
	signPersonalMessage(): never {
		throw new Error('Ledger Signer does not support signing personal messages');
	}

	/**
	 * Prepares the signer by fetching and setting the public key from a Ledger device.
	 * It is recommended to initialize an `LedgerSigner` instance using this function.
	 * @returns A promise that resolves once a `LedgerSigner` instance is prepared (public key is set).
	 */
	static async fromDerivationPath(derivationPath: string, client: SuiLedgerClient) {
		const { publicKey } = await client.getPublicKey(derivationPath);

		if (!publicKey) {
			throw new Error('Failed to get public key from Ledger');
		}

		return new LedgerSigner({
			derivationPath,
			publicKey: new Ed25519PublicKey(publicKey),
			suiLedgerClient: client,
		});
	}
}

function getClearSigningOptions(_transactionBytes: Uint8Array) {
	// const transaction = Transaction.from(transactionBytes);
	// const data = transaction.getData();

	// const _gasObjectIds = data.gasData.payment?.map((object) => object.objectId) ?? [];
	// const _inputObjectIds = data.inputs
	// 	.map((input) => {
	// 		if (input.$kind !== 'Object' || input.Object.$kind !== 'ImmOrOwnedObject') {
	// 			return null;
	// 		}
	// 		return input.Object.ImmOrOwnedObject.objectId;
	// 	})
	// 	.filter((objectId): objectId is string => !!objectId);

	// FIXME: Fetch all the coin types from the above IDs
	return {
		coinTypes: ['0x2::coin::Coin<0x2::sui::SUI>'],
	};
}
