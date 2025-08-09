// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { IntentScope } from '../cryptography/intent.js';
import type { SignAndExecuteOptions, Signer } from '../cryptography/keypair.js';
import { Experimental_BaseClient } from './client.js';
import type { ClientWithCoreApi, Experimental_CoreClientOptions } from './core.js';
import { Experimental_CoreClient } from './core.js';
import type {
	ClientWithExtensions,
	Experimental_SuiClientTypes,
	SuiClientRegistration,
} from './types.js';
export { parseTransactionBcs, parseTransactionEffectsBcs } from './transports/utils.js';

export {
	Experimental_BaseClient,
	Experimental_CoreClient,
	type Experimental_CoreClientOptions,
	type ClientWithExtensions,
	type Experimental_SuiClientTypes,
	type SuiClientRegistration,
	type ClientWithCoreApi,
};

export { ClientCache, type ClientCacheOptions } from './cache.js';

export class SigningClient extends Experimental_BaseClient implements Signer, ClientWithCoreApi {
	#client: ClientWithCoreApi;
	#signer: Signer;

	constructor({
		signer,
		client,
		...options
	}: { signer: Signer; client: ClientWithCoreApi } & Experimental_SuiClientTypes.SuiClientOptions) {
		super({
			base: client.base,
			...options,
		});

		this.#client = client;
		this.#signer = signer;
	}

	get core(): Experimental_CoreClient {
		return this.#client.core;
	}

	sign(bytes: Uint8Array) {
		return this.#signer.sign(bytes);
	}

	getKeyScheme() {
		return this.#signer.getKeyScheme();
	}

	getPublicKey() {
		return this.#signer.getPublicKey();
	}

	signWithIntent(bytes: Uint8Array, intent: IntentScope) {
		return this.#signer.signWithIntent(bytes, intent);
	}

	signPersonalMessage(bytes: Uint8Array) {
		return this.#signer.signPersonalMessage(bytes);
	}

	signTransaction(bytes: Uint8Array) {
		return this.#signer.signTransaction(bytes);
	}

	toSuiAddress(): string {
		return this.#signer.toSuiAddress();
	}

	async signAndExecuteTransaction({
		transaction,
	}: Omit<
		SignAndExecuteOptions,
		'client'
	>): Promise<Experimental_SuiClientTypes.TransactionResponse> {
		return this.#signer.signAndExecuteTransaction({
			transaction,
			client: this.#client,
		});
	}
}
