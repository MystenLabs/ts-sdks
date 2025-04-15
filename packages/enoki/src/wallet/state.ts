// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ExportedWebCryptoKeypair } from '@mysten/signers/webcrypto';
import { WebCryptoSigner } from '@mysten/signers/webcrypto';
import { decodeJwt } from '@mysten/sui/zklogin';
import type { ZkLoginSignatureInputs } from '@mysten/sui/zklogin';
import type { UseStore } from 'idb-keyval';
import { clear, createStore, get, set } from 'idb-keyval';
import type { WritableAtom } from 'nanostores';
import { atom, onMount, onSet } from 'nanostores';

import type { Encryption } from '../encryption.js';
import { createDefaultEncryption } from '../encryption.js';
import type { EnokiClientConfig } from '../EnokiClient/index.js';
import { EnokiClient } from '../EnokiClient/index.js';
import type { AuthProvider, EnokiNetwork } from '../EnokiClient/type.js';
import { EnokiKeypair } from '../EnokiKeypair.js';
import type { SyncStore } from '../stores.js';
import { createSessionStorage } from '../stores.js';

type EnokiFlowConfig = EnokiClientConfig & { network: EnokiNetwork };

// State that is not bound to a session, and is encrypted.
interface ZkLoginState {
	provider?: AuthProvider;
	address?: string;
	salt?: string;
	publicKey?: string;
}

// State that session-bound, and is encrypted in storage.
interface ZkLoginSession {
	maxEpoch: number;
	randomness: string;
	expiresAt: number;

	jwt?: string;
	proof?: ZkLoginSignatureInputs;
}

const createStorageKeys = (apiKey: string, network: EnokiNetwork) => ({
	STATE: `@enoki/flow/state/${apiKey}/${network}`,
	SESSION: `@enoki/flow/session/${apiKey}/${network}`,
});

export class INTERNAL_ONLY_EnokiFlow {
	#storageKeys: { STATE: string; SESSION: string };
	#enokiClient: EnokiClient;
	#network: EnokiNetwork;
	#encryption: Encryption;
	#encryptionKey: string;
	#store: SyncStore;
	#idbStore: UseStore;

	$zkLoginSession: WritableAtom<{ initialized: boolean; value: ZkLoginSession | null }>;
	$zkLoginState: WritableAtom<ZkLoginState>;

	constructor(config: EnokiFlowConfig) {
		this.#enokiClient = new EnokiClient({
			apiKey: config.apiKey,
			apiUrl: config.apiUrl,
		});
		this.#network = config.network;
		this.#encryptionKey = config.apiKey;
		this.#encryption = createDefaultEncryption();
		this.#store = createSessionStorage();
		this.#storageKeys = createStorageKeys(config.apiKey, this.#network);
		this.#idbStore = createStore('enoki', `${config.apiKey}_${this.#network}`);

		let storedState = null;
		try {
			const rawStoredValue = this.#store.get(this.#storageKeys.STATE);
			if (rawStoredValue) {
				storedState = JSON.parse(rawStoredValue);
			}
		} catch {
			// Ignore errors
		}

		this.$zkLoginState = atom(storedState || {});
		this.$zkLoginSession = atom({ initialized: false, value: null });

		// Hydrate the session on mount:
		onMount(this.$zkLoginSession, () => {
			this.getSession();
		});

		onSet(this.$zkLoginState, ({ newValue }) => {
			this.#store.set(this.#storageKeys.STATE, JSON.stringify(newValue));
		});
	}

	get network() {
		return this.#network;
	}

	async createAuthorizationURL(input: {
		provider: AuthProvider;
		clientId: string;
		redirectUrl: string;
		extraParams?: Record<string, unknown>;
	}) {
		const ephemeralKeyPair = await WebCryptoSigner.generate();
		const { nonce, randomness, maxEpoch, estimatedExpiration } =
			await this.#enokiClient.createZkLoginNonce({
				network: this.#network,
				ephemeralPublicKey: ephemeralKeyPair.getPublicKey(),
			});

		const params = new URLSearchParams({
			...input.extraParams,
			nonce,
			client_id: input.clientId,
			redirect_uri: input.redirectUrl,
			response_type: 'id_token',
			// TODO: Eventually fetch the scopes for this client ID from the Enoki service:
			scope: [
				'openid',
				// Merge the requested scopes in with the required openid scopes:
				...(input.extraParams && 'scope' in input.extraParams
					? (input.extraParams.scope as string[])
					: []),
			]
				.filter(Boolean)
				.join(' '),
		});

		let oauthUrl: string;
		switch (input.provider) {
			case 'google': {
				oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
				break;
			}
			case 'facebook': {
				oauthUrl = `https://www.facebook.com/v17.0/dialog/oauth?${params}`;
				break;
			}
			case 'twitch': {
				params.set('force_verify', 'true');
				oauthUrl = `https://id.twitch.tv/oauth2/authorize?${params}`;
				break;
			}
			default:
				throw new Error(`Invalid provider: ${input.provider}`);
		}

		this.$zkLoginState.set({ provider: input.provider });

		await set('ephemeralKeyPair', ephemeralKeyPair.export(), this.#idbStore);
		await this.#setSession({
			expiresAt: estimatedExpiration,
			maxEpoch,
			randomness,
		});

		return oauthUrl;
	}

	async handleAuthCallback(hash: string = window.location.hash) {
		const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

		// Before we handle the auth redirect and get the state, we need to restore it:
		const zkp = await this.getSession();

		if (!zkp || !zkp.maxEpoch || !zkp.randomness) {
			throw new Error(
				'Start of sign-in flow could not be found. Ensure you have started the sign-in flow before calling this.',
			);
		}

		const jwt = params.get('id_token');
		if (!jwt) {
			throw new Error('Missing ID Token');
		}

		decodeJwt(jwt);

		const { address, salt, publicKey } = await this.#enokiClient.getZkLogin({ jwt });

		this.$zkLoginState.set({
			...this.$zkLoginState.get(),
			salt,
			address,
			publicKey,
		});
		await this.#setSession({
			...zkp,
			jwt,
		});

		return params.get('state');
	}

	async #setSession(newValue: ZkLoginSession | null) {
		if (newValue) {
			const storedValue = await this.#encryption.encrypt(
				this.#encryptionKey,
				JSON.stringify(newValue),
			);

			this.#store.set(this.#storageKeys.SESSION, storedValue);
		} else {
			this.#store.delete(this.#storageKeys.SESSION);
		}

		this.$zkLoginSession.set({ initialized: true, value: newValue });
	}

	async getSession() {
		if (this.$zkLoginSession.get().initialized) {
			return this.$zkLoginSession.get().value;
		}

		try {
			const storedValue = this.#store.get(this.#storageKeys.SESSION);
			if (!storedValue) return null;

			const state: ZkLoginSession = JSON.parse(
				await this.#encryption.decrypt(this.#encryptionKey, storedValue),
			);

			// TODO: Rather than having expiration act as a logout, we should keep the state that still is relevant,
			// and just clear out the expired session, but keep the other zkLogin state.
			if (state?.expiresAt && Date.now() > state.expiresAt) {
				await this.logout();
			} else {
				this.$zkLoginSession.set({ initialized: true, value: state });
			}
		} catch {
			this.$zkLoginSession.set({ initialized: true, value: null });
		}

		return this.$zkLoginSession.get().value;
	}

	async logout() {
		this.$zkLoginState.set({});
		this.#store.delete(this.#storageKeys.STATE);

		await clear(this.#idbStore);
		await this.#setSession(null);
	}

	// TODO: Should this return the proof if it already exists?
	async getProof() {
		const zkp = await this.getSession();
		const { salt } = this.$zkLoginState.get();

		if (zkp?.proof) {
			if (zkp.expiresAt && Date.now() > zkp.expiresAt) {
				throw new Error('Stored proof is expired.');
			}

			return zkp.proof;
		}

		if (!salt || !zkp || !zkp.jwt) {
			throw new Error('Missing required parameters for proof generation');
		}

		const storedNativeSigner = await get<ExportedWebCryptoKeypair>(
			'ephemeralKeyPair',
			this.#idbStore,
		);
		if (!storedNativeSigner) {
			throw new Error('Native signer not found in store.');
		}

		const ephemeralKeyPair = WebCryptoSigner.import(storedNativeSigner);

		const proof = await this.#enokiClient.createZkLoginZkp({
			network: this.#network,
			jwt: zkp.jwt,
			maxEpoch: zkp.maxEpoch,
			randomness: zkp.randomness,
			ephemeralPublicKey: ephemeralKeyPair.getPublicKey(),
		});

		await this.#setSession({
			...zkp,
			proof,
		});

		return proof;
	}

	async getKeypair() {
		// Get the proof, so that we ensure it exists in state:
		await this.getProof();

		const zkp = await this.getSession();

		// Check to see if we have the essentials for a keypair:
		const { address } = this.$zkLoginState.get();
		if (!address || !zkp || !zkp.proof) {
			throw new Error('Missing required data for keypair generation.');
		}

		if (Date.now() > zkp.expiresAt) {
			throw new Error('Stored proof is expired.');
		}

		const storedNativeSigner = await get<ExportedWebCryptoKeypair>(
			'ephemeralKeyPair',
			this.#idbStore,
		);

		if (!storedNativeSigner) {
			throw new Error('Native signer not found in store.');
		}

		const ephemeralKeypair = WebCryptoSigner.import(storedNativeSigner);

		return new EnokiKeypair({
			address,
			ephemeralKeypair,
			maxEpoch: zkp.maxEpoch,
			proof: zkp.proof,
		});
	}
}
