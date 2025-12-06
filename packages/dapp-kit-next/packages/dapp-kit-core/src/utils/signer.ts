// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PublicKey, SignatureScheme } from '@mysten/sui/cryptography';
import { SIGNATURE_FLAG_TO_SCHEME, Signer } from '@mysten/sui/cryptography';
import type { DAppKit } from '../core/index.js';
import type { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';
import { publicKeyFromSuiBytes } from '@mysten/sui/verify';
import type { TransactionResultWithEffects } from './transaction-result.js';

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
	}): Promise<TransactionResultWithEffects> {
		return this.#dAppKit.signAndExecuteTransaction({
			transaction,
		});
	}
}
