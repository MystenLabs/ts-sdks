// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PublicKey, SignatureScheme } from '@mysten/sui/cryptography';
import { SIGNATURE_FLAG_TO_SCHEME, Signer } from '@mysten/sui/cryptography';
import type { DAppKit } from '../core/index.js';
import type { Transaction } from '@mysten/sui/transactions';
import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { parseTransactionBcs, parseTransactionEffectsBcs } from '@mysten/sui/experimental';
import { toBase64, fromBase64 } from '@mysten/sui/utils';
import { publicKeyFromSuiBytes } from '@mysten/sui/verify';

export class CurrentAccountSigner extends Signer {
	#publicKeyCache = new Map<string, PublicKey>();
	#dAppKit: DAppKit;

	constructor(dAppKit: DAppKit) {
		super();
		this.#dAppKit = dAppKit;
	}

	override getKeyScheme(): SignatureScheme {
		return SIGNATURE_FLAG_TO_SCHEME[
			this.getPublicKey().flag() as keyof typeof SIGNATURE_FLAG_TO_SCHEME
		];
	}

	override getPublicKey(): PublicKey {
		const { account } = this.#dAppKit.stores.$connection.get();
		const client = this.#dAppKit.stores.$currentClient.get();

		if (!account) {
			throw new Error('No account is connected.');
		}

		if (this.#publicKeyCache.has(account.address)) {
			return this.#publicKeyCache.get(account.address)!;
		}

		const publicKey = publicKeyFromSuiBytes(new Uint8Array(account.publicKey), {
			address: account.address,
			client,
		});

		this.#publicKeyCache.set(account.address, publicKey);
		return publicKey;
	}

	override sign(_data: Uint8Array): never {
		throw new Error(
			'CurrentAccountSigner does not support signing directly. Use `signTransaction` or `signPersonalMessage` instead.',
		);
	}

	override async signTransaction(bytes: Uint8Array) {
		return this.#dAppKit.signTransaction({
			transaction: toBase64(bytes),
		});
	}

	override async signPersonalMessage(bytes: Uint8Array) {
		return this.#dAppKit.signPersonalMessage({
			message: bytes,
		});
	}

	override async signAndExecuteTransaction({
		transaction,
	}: {
		transaction: Transaction;
	}): Promise<Omit<Experimental_SuiClientTypes.TransactionResponse, 'balanceChanges'>> {
		const { bytes, signature, digest, effects } = await this.#dAppKit.signAndExecuteTransaction({
			transaction,
		});

		return {
			digest,
			signatures: [signature],
			epoch: null,
			effects: parseTransactionEffectsBcs(fromBase64(effects)),
			objectTypes: {
				// oxlint-disable-next-line no-thenable
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
