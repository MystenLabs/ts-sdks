// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { clear, createStore } from 'idb-keyval';
import type { WritableAtom } from 'nanostores';
import { atom, onMount, onSet } from 'nanostores';

import type { Encryption } from '../encryption.js';
import { createDefaultEncryption } from '../encryption.js';
import type { EnokiClientConfig } from '../EnokiClient/index.js';
import type { ClientWithCoreApi, Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { SyncStore } from '../stores.js';
import { createSessionStorage } from '../stores.js';

import type { EnokiSessionContext, ZkLoginSession, ZkLoginState } from './types.js';

export type EnokiWalletStateConfig = EnokiClientConfig & {
	clients: ClientWithCoreApi[];
	clientId: string;
};

export class EnokiWalletState {
	#encryption: Encryption;
	#encryptionKey: string;
	#sessionStore: SyncStore;
	#stateStorageKey: string;
	#sessionContextByNetwork: Map<Experimental_SuiClientTypes.Network, EnokiSessionContext>;
	#zkLoginState: WritableAtom<ZkLoginState>;

	constructor(config: EnokiWalletStateConfig) {
		this.#encryptionKey = config.apiKey;
		this.#encryption = createDefaultEncryption();
		this.#sessionStore = createSessionStorage();
		this.#stateStorageKey = `@enoki/flow/state/${config.apiKey}/${config.clientId}`;
		this.#zkLoginState = this.#createZkLoginState();

		this.#sessionContextByNetwork = config.clients.reduce((accumulator, client) => {
			const network = client.network;
			const storageKey = `@enoki/flow/session/${config.apiKey}/${network}/${config.clientId}`;
			const idbStore = createStore(`${config.apiKey}_${network}_${config.clientId}`, 'enoki');

			const sessionContext: EnokiSessionContext = {
				$zkLoginSession: atom({ initialized: false, value: null }),
				client,
				storageKey,
				idbStore,
			};

			onMount(sessionContext.$zkLoginSession, () => {
				this.getSession(sessionContext);
			});

			return accumulator.set(network, sessionContext);
		}, new Map());
	}

	get zkLoginState() {
		return this.#zkLoginState;
	}

	get sessionContextByNetwork() {
		return this.#sessionContextByNetwork;
	}

	getSessionContext(network: Experimental_SuiClientTypes.Network) {
		const context = this.#sessionContextByNetwork.get(network);
		if (!context) {
			throw new Error(`The network ${network} isn't supported.`);
		}

		return context;
	}

	async logout() {
		this.#zkLoginState.set({});
		this.#sessionStore.delete(this.#stateStorageKey);

		for (const state of this.#sessionContextByNetwork.values()) {
			await clear(state.idbStore);
			await this.setSession(state, null);
		}
	}

	async setSession(state: EnokiSessionContext, newValue: ZkLoginSession | null) {
		if (newValue) {
			const storedValue = await this.#encryption.encrypt(
				this.#encryptionKey,
				JSON.stringify(newValue),
			);

			this.#sessionStore.set(state.storageKey, storedValue);
		} else {
			this.#sessionStore.delete(state.storageKey);
		}

		state.$zkLoginSession.set({ initialized: true, value: newValue });
	}

	async getSession({ $zkLoginSession, storageKey }: EnokiSessionContext) {
		if ($zkLoginSession.get().initialized) {
			return $zkLoginSession.get().value;
		}

		try {
			const storedValue = this.#sessionStore.get(storageKey);
			if (!storedValue) return null;

			const state: ZkLoginSession = JSON.parse(
				await this.#encryption.decrypt(this.#encryptionKey, storedValue),
			);

			if (state?.expiresAt && Date.now() > state.expiresAt) {
				await this.logout();
			} else {
				$zkLoginSession.set({ initialized: true, value: state });
			}
		} catch {
			$zkLoginSession.set({ initialized: true, value: null });
		}

		return $zkLoginSession.get().value;
	}

	#createZkLoginState() {
		let storedState: ZkLoginState | null = null;

		try {
			const rawStoredValue = localStorage.getItem(this.#stateStorageKey);
			if (rawStoredValue) {
				storedState = JSON.parse(rawStoredValue);
			}
		} catch {
			// Ignore errors
		}

		const $zkLoginState = atom<ZkLoginState>(storedState || {});

		onSet($zkLoginState, ({ newValue }) => {
			localStorage.setItem(this.#stateStorageKey, JSON.stringify(newValue));
		});

		return $zkLoginState;
	}
}
