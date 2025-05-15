// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PublicKey, SignatureScheme } from '@mysten/sui/cryptography';
import { SIGNATURE_FLAG_TO_SCHEME, Signer } from '@mysten/sui/cryptography';
import type { DAppKitStore } from './store/index.js';
import type { Transaction } from '@mysten/sui/transactions';
import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { parseTransactionBcs, parseTransactionEffectsBcs } from '@mysten/sui/experimental';
import { toBase64, fromBase64 } from '@mysten/sui/utils';

export class CurrentAccountSigner extends Signer {
	#store: DAppKitStore;

	constructor(store: DAppKitStore) {
		super();
		this.#store = store;
	}

	getKeyScheme(): SignatureScheme {
		return SIGNATURE_FLAG_TO_SCHEME[
			this.getPublicKey().flag() as keyof typeof SIGNATURE_FLAG_TO_SCHEME
		];
	}

	getPublicKey(): PublicKey {
		const publicKey = this.#store.$publicKey.get();

		if (!publicKey) {
			throw new Error('DappKit is not currently connected to an account');
		}

		return publicKey;
	}

	sign(_data: Uint8Array): never {
		throw new Error(
			'WalletSigner does not support signing directly. Use signTransaction or signPersonalMessage instead',
		);
	}

	async signTransaction(bytes: Uint8Array) {
		return this.#store.signTransaction({
			transaction: toBase64(bytes),
		});
	}

	async signPersonalMessage(bytes: Uint8Array) {
		return this.#store.signPersonalMessage({
			message: bytes,
		});
	}

	async signAndExecuteTransaction({
		transaction,
	}: {
		transaction: Transaction;
	}): Promise<Experimental_SuiClientTypes.TransactionResponse> {
		const { bytes, signature, digest, effects } = await this.#store.signAndExecuteTransaction({
			transaction,
		});

		return {
			digest,
			signatures: [signature],
			epoch: null,
			effects: parseTransactionEffectsBcs(fromBase64(effects)),
			objectTypes: {
				get then() {
					const promise = Promise.reject<Record<string, string>>(
						new Error('objectTypes is not implemented for WalletSigner'),
					);

					return promise.then.bind(promise);
				},
			},
			transaction: parseTransactionBcs(fromBase64(bytes)),
		};
	}
}
