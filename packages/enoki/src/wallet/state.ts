// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UseStore } from 'idb-keyval';
import { clear, createStore, del, get, set } from 'idb-keyval';
import type { WritableAtom } from 'nanostores';
import { atom, onMount, onSet, task } from 'nanostores';

import type { Encryption } from '../encryption.js';
import { createDefaultEncryption } from '../encryption.js';
import type { EnokiClientConfig } from '../EnokiClient/index.js';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';

import type { EnokiSessionContext, ZkLoginSession, ZkLoginState } from './types.js';

export type EnokiWalletStateConfig = EnokiClientConfig & {
	clients: ClientWithCoreApi[];
	clientId: string;
};

const sessionKey = 'zklogin-session';

const stateKey = 'zklogin-state';

export class EnokiWalletState {
	#encryption: Encryption;
	#encryptionKey: string;

	#stateStore: UseStore;
	#sessionContextByNetwork: Map<SuiClientTypes.Network, EnokiSessionContext>;
	#zkLoginState: WritableAtom<ZkLoginState | null>;
	#hydrated: Promise<void> | null = null;

	constructor(config: EnokiWalletStateConfig) {
		this.#encryptionKey = config.apiKey;
		this.#encryption = createDefaultEncryption();

		this.#stateStore = createStore(`${config.apiKey}_${config.clientId}`, 'enoki');
		this.#zkLoginState = atom<ZkLoginState | null>(null);
		this.#initZkLoginState();

		this.#sessionContextByNetwork = config.clients.reduce((accumulator, client) => {
			const network = client.network;
			const idbStore = createStore(`${config.apiKey}_${network}_${config.clientId}`, 'enoki');

			const sessionContext: EnokiSessionContext = {
				$zkLoginSession: atom({ initialized: false, value: null }),
				client,
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

	ensureHydrated() {
		return this.#hydrateFromStorage();
	}

	get sessionContextByNetwork() {
		return this.#sessionContextByNetwork;
	}

	getSessionContext(network: SuiClientTypes.Network) {
		const context = this.#sessionContextByNetwork.get(network);
		if (!context) {
			throw new Error(`The network ${network} isn't supported.`);
		}

		return context;
	}

	async logout() {
		this.#zkLoginState.set(null);
		await clear(this.#stateStore);

		for (const context of this.#sessionContextByNetwork.values()) {
			await this.setSession(context, null);
			await clear(context.idbStore);
		}
	}

	async setSession(context: EnokiSessionContext, newValue: ZkLoginSession | null) {
		if (newValue) {
			const storedValue = await this.#encryption.encrypt(
				this.#encryptionKey,
				JSON.stringify(newValue),
			);

			await set(sessionKey, storedValue, context.idbStore);
		} else {
			await del(sessionKey, context.idbStore);
		}

		context.$zkLoginSession.set({ initialized: true, value: newValue });
	}

	async getSession({ $zkLoginSession, idbStore }: EnokiSessionContext) {
		if ($zkLoginSession.get().initialized) {
			return $zkLoginSession.get().value;
		}

		try {
			const storedValue = await get(sessionKey, idbStore);
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

	#initZkLoginState() {
		onSet(this.#zkLoginState, ({ newValue }) => {
			set(stateKey, JSON.stringify(newValue), this.#stateStore);
		});

		onMount(this.#zkLoginState, () => {
			this.#hydrateFromStorage();
		});
	}

	#hydrateFromStorage() {
		if (!this.#hydrated) {
			this.#hydrated = task(async () => {
				try {
					const rawStoredValue = await get<string>(stateKey, this.#stateStore);
					if (rawStoredValue) {
						this.#zkLoginState.set(JSON.parse(rawStoredValue));
					}
				} catch {
					// Ignore errors
				}
			});
		}
		return this.#hydrated;
	}
}
