// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type {
	IdentifierString,
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
	StandardEventsOnMethod,
	SuiSignAndExecuteTransactionFeature,
	SuiSignAndExecuteTransactionMethod,
	SuiSignPersonalMessageFeature,
	SuiSignPersonalMessageMethod,
	SuiSignTransactionFeature,
	SuiSignTransactionMethod,
	Wallet,
} from '@mysten/wallet-standard';
import {
	ReadonlyWalletAccount,
	StandardConnect,
	StandardDisconnect,
	StandardEvents,
	SuiSignAndExecuteTransaction,
	SuiSignPersonalMessage,
	SuiSignTransaction,
} from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';

import type { AuthProvider } from '../EnokiClient/type.js';
import type { EnokiWalletOptions, WalletEventsMap, EnokiSessionContext } from './types.js';
import type {
	EnokiGetMetadataFeature,
	EnokiGetMetadataMethod,
	EnokiGetSessionFeature,
	EnokiGetSessionMethod,
} from './features.js';
import { EnokiGetMetadata, EnokiGetSession } from './features.js';
import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import { decodeJwt } from '@mysten/sui/zklogin';
import type { ExportedWebCryptoKeypair } from '@mysten/signers/webcrypto';
import { WebCryptoSigner } from '@mysten/signers/webcrypto';
import { get, set } from 'idb-keyval';

import { EnokiClient } from '../EnokiClient/index.js';
import type { EnokiNetwork } from '../EnokiClient/type.js';
import { EnokiKeypair } from '../EnokiKeypair.js';

import { EnokiWalletState } from './state.js';
import { allTasks } from 'nanostores';

const pkceFlowProviders: Partial<Record<AuthProvider, { tokenEndpoint: string }>> = {
	playtron: {
		tokenEndpoint: 'https://oauth2.playtron.one/oauth2/token',
	},
};

type PKCEContext = { codeChallenge: string; codeVerifier: string };

export class EnokiWallet implements Wallet {
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#name: string;
	#icon: Wallet['icon'];
	#enokiClient: EnokiClient;
	#state: EnokiWalletState;
	#provider: AuthProvider;
	#clientId: string;
	#redirectUrl: string;
	#extraParams: Record<string, string> | (() => Record<string, string>) | undefined;
	#getCurrentNetwork: () => Experimental_SuiClientTypes.Network;
	#windowFeatures?: string | (() => string);

	get name() {
		return this.#name;
	}

	get provider() {
		return this.#provider;
	}

	get icon() {
		return this.#icon;
	}

	get version() {
		return '1.0.0' as const;
	}

	get chains() {
		return [...this.#state.sessionContextByNetwork.keys()].map(
			(network) => `sui:${network}` as const,
		);
	}

	get accounts() {
		return this.#accounts;
	}

	get features(): StandardConnectFeature &
		StandardDisconnectFeature &
		StandardEventsFeature &
		SuiSignTransactionFeature &
		SuiSignAndExecuteTransactionFeature &
		SuiSignPersonalMessageFeature &
		EnokiGetMetadataFeature &
		EnokiGetSessionFeature {
		return {
			[StandardConnect]: {
				version: '1.0.0',
				connect: this.#connect,
			},
			[StandardDisconnect]: {
				version: '1.0.0',
				disconnect: this.#disconnect,
			},
			[StandardEvents]: {
				version: '1.0.0',
				on: this.#on,
			},
			[SuiSignTransaction]: {
				version: '2.0.0',
				signTransaction: this.#signTransaction,
			},
			[SuiSignAndExecuteTransaction]: {
				version: '2.0.0',
				signAndExecuteTransaction: this.#signAndExecuteTransaction,
			},
			[SuiSignPersonalMessage]: {
				version: '1.1.0',
				signPersonalMessage: this.#signPersonalMessage,
			},
			[EnokiGetMetadata]: {
				version: '1.0.0',
				getMetadata: this.#getMetadata,
			},
			[EnokiGetSession]: {
				version: '1.0.0',
				getSession: this.#getSession,
			},
		};
	}

	constructor({
		name,
		icon,
		provider,
		clientId,
		redirectUrl,
		extraParams,
		windowFeatures,
		getCurrentNetwork,
		apiKey,
		apiUrl,
		clients,
	}: EnokiWalletOptions) {
		this.#events = mitt();
		this.#name = name;
		this.#icon = icon;
		this.#enokiClient = new EnokiClient({ apiKey, apiUrl });
		this.#state = new EnokiWalletState({ apiKey, clientId, clients });
		this.#provider = provider;
		this.#clientId = clientId;
		this.#redirectUrl = redirectUrl || window.location.href.split('#')[0];
		this.#extraParams = extraParams;
		this.#windowFeatures = windowFeatures;
		this.#getCurrentNetwork = getCurrentNetwork;
		this.#accounts = [];

		this.#state.zkLoginState.subscribe(() => {
			this.#accounts = this.#getAuthorizedAccounts();
			this.#events.emit('change', { accounts: this.#accounts });
		});
	}

	#signTransaction: SuiSignTransactionMethod = async ({ transaction, chain, account, signal }) => {
		signal?.throwIfAborted();

		const { client, keypair } = await this.#getSignerContext(chain);
		const parsedTransaction = Transaction.from(await transaction.toJSON());
		const suiAddress = keypair.toSuiAddress();

		if (suiAddress !== account.address) {
			throw new Error(
				`The specified account ${account.address} does not match the currently connected Enoki address ${suiAddress}.`,
			);
		}

		parsedTransaction.setSenderIfNotSet(suiAddress);
		return keypair.signTransaction(await parsedTransaction.build({ client }));
	};

	#signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async ({
		transaction,
		chain,
		account,
		signal,
	}) => {
		signal?.throwIfAborted();

		const { client, keypair } = await this.#getSignerContext(chain);
		const parsedTransaction = Transaction.from(await transaction.toJSON());
		const bytes = await parsedTransaction.build({ client });

		const suiAddress = keypair.toSuiAddress();

		if (suiAddress !== account.address) {
			throw new Error(
				`The specified account ${account.address} does not match the currently connected Enoki address ${suiAddress}.`,
			);
		}

		parsedTransaction.setSenderIfNotSet(suiAddress);

		const result = await keypair.signAndExecuteTransaction({
			transaction: parsedTransaction,
			client,
		});

		return {
			bytes: toBase64(bytes),
			signature: result.signatures[0],
			digest: result.digest,
			effects: toBase64(result.effects.bcs!),
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account, chain }) => {
		const { keypair } = await this.#getSignerContext(chain);
		const suiAddress = keypair.toSuiAddress();

		if (suiAddress !== account.address) {
			throw new Error(
				`The specified account ${account.address} does not match the currently connected Enoki address ${suiAddress}.`,
			);
		}

		return keypair.signPersonalMessage(message);
	};

	#getMetadata: EnokiGetMetadataMethod = () => {
		return {
			provider: this.#provider,
		};
	};

	#getSession: EnokiGetSessionMethod = async (input) => {
		const sessionContext = this.#state.getSessionContext(
			input?.network ?? this.#getCurrentNetwork(),
		);
		return await this.#state.getSession(sessionContext);
	};

	#on: StandardEventsOnMethod = (event, listener) => {
		this.#events.on(event, listener);
		return () => this.#events.off(event, listener);
	};

	#connect: StandardConnectMethod = async (input) => {
		// NOTE: This is a hackfix for the old version of dApp Kit where auto-connection logic
		// only fires on initial mount of the WalletProvider component. Since hydrating the
		// zkLogin state from IndexedDB is an asynchronous process, we need to make sure it
		// is populated before the connect logic runs.
		await allTasks();

		if (input?.silent || this.#accounts.length > 0) {
			return { accounts: this.#accounts };
		}

		const currentNetwork = this.#getCurrentNetwork();
		await this.#createSession({ network: currentNetwork });

		return { accounts: this.#accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		await this.#state.logout();
		this.#accounts = [];
		this.#events.emit('change', { accounts: this.#accounts });
	};

	#getAuthorizedAccounts() {
		const zkLoginState = this.#state.zkLoginState.get();
		if (zkLoginState) {
			return [
				new ReadonlyWalletAccount({
					address: zkLoginState.address,
					chains: this.chains,
					icon: this.icon,
					features: [SuiSignPersonalMessage, SuiSignTransaction, SuiSignAndExecuteTransaction],
					publicKey: fromBase64(zkLoginState.publicKey),
				}),
			];
		}
		return [];
	}

	async #getKeypair(sessionContext: EnokiSessionContext) {
		const session = await this.#state.getSession(sessionContext);
		if (!session?.jwt || Date.now() > session.expiresAt) {
			await this.#createSession({ network: sessionContext.client.network });
		}

		const storedNativeSigner = await get<ExportedWebCryptoKeypair>(
			'ephemeralKeyPair',
			sessionContext.idbStore,
		);

		if (!storedNativeSigner) {
			throw new Error('Native signer not found in store.');
		}

		const updatedSession = await this.#state.getSession(sessionContext);
		if (!updatedSession?.jwt) {
			throw new Error('Failed to retrieve an active session.');
		}

		const ephemeralKeypair = WebCryptoSigner.import(storedNativeSigner);
		const proof =
			updatedSession.proof ??
			(await this.#enokiClient.createZkLoginZkp({
				network: sessionContext.client.network as EnokiNetwork,
				jwt: updatedSession.jwt,
				maxEpoch: updatedSession.maxEpoch,
				randomness: updatedSession.randomness,
				ephemeralPublicKey: ephemeralKeypair.getPublicKey(),
			}));

		await this.#state.setSession(sessionContext, { ...updatedSession, proof });

		return new EnokiKeypair({
			address: this.accounts[0].address,
			maxEpoch: updatedSession.maxEpoch,
			ephemeralKeypair,
			proof,
		});
	}

	async #getSignerContext(chain?: IdentifierString) {
		const sessionContext = chain ? this.#state.getSessionContext(chain.split(':')[1]) : null;
		if (!sessionContext) {
			throw new Error(
				`A valid Sui chain identifier was not provided in the request. Please report this issue to the dApp developer. Examples of valid Sui chain identifiers are 'sui:testnet' and 'sui:mainnet'. Consider using the '@mysten/dapp-kit' package, which provides this value automatically.`,
			);
		}

		const keypair = await this.#getKeypair(sessionContext);
		return { client: sessionContext.client, keypair };
	}

	async #createSession({ network }: { network: Experimental_SuiClientTypes.Network }) {
		const popup = window.open(
			undefined,
			'_blank',
			typeof this.#windowFeatures === 'function' ? this.#windowFeatures() : this.#windowFeatures,
		);

		if (!popup) {
			throw new Error('Failed to open popup');
		}

		const sessionContext = this.#state.getSessionContext(network);
		const pkceContext = await this.#getPKCEFlowContext();

		popup.location = await this.#createAuthorizationURL(sessionContext, pkceContext);

		return await new Promise<void>((resolve, reject) => {
			const interval = setInterval(() => {
				try {
					if (popup.closed) {
						clearInterval(interval);
						reject(new Error('Popup closed'));
					}

					if ((!pkceContext && !popup.location.hash) || (pkceContext && !popup.location.search)) {
						return;
					}
				} catch (e) {
					return;
				}
				clearInterval(interval);

				this.#handleAuthCallback({
					hash: popup.location.hash,
					sessionContext,
					search: popup.location.search,
					pkceContext,
				}).then(() => resolve(), reject);

				try {
					popup.close();
				} catch (e) {
					console.error(e);
				}
			}, 16);
		});
	}

	async #getPKCEFlowContext(): Promise<PKCEContext | undefined> {
		if (!pkceFlowProviders[this.#provider]) {
			return;
		}

		const array = new Uint8Array(64);
		crypto.getRandomValues(array);
		const codeVerifier = toBase64(array).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
		const codeChallenge = toBase64(
			new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))),
		)
			.replace(/=/g, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_');

		return { codeVerifier, codeChallenge };
	}

	async #createAuthorizationURL(sessionContext: EnokiSessionContext, pkceContext?: PKCEContext) {
		const ephemeralKeyPair = await WebCryptoSigner.generate();
		const { nonce, randomness, maxEpoch, estimatedExpiration } =
			await this.#enokiClient.createZkLoginNonce({
				network: sessionContext.client.network as EnokiNetwork,
				ephemeralPublicKey: ephemeralKeyPair.getPublicKey(),
			});

		const extraParams =
			typeof this.#extraParams === 'function' ? this.#extraParams() : this.#extraParams;

		const params = new URLSearchParams({
			...extraParams,
			nonce,
			client_id: this.#clientId,
			redirect_uri: this.#redirectUrl,
			response_type: 'id_token',
			scope: ['openid', ...(extraParams?.scope ? extraParams.scope.split(' ') : [])]
				.filter(Boolean)
				.join(' '),
			...(pkceContext
				? {
						response_type: 'code',
						code_challenge_method: 'S256',
						code_challenge: pkceContext.codeChallenge,
					}
				: undefined),
		});

		let oauthUrl: string;
		switch (this.#provider) {
			case 'google':
				oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
				break;
			case 'facebook':
				oauthUrl = `https://www.facebook.com/v17.0/dialog/oauth?${params}`;
				break;
			case 'twitch':
				params.set('force_verify', 'true');
				oauthUrl = `https://id.twitch.tv/oauth2/authorize?${params}`;
				break;
			case 'onefc':
				oauthUrl = `https://login.onepassport.onefc.com/de3ee5c1-5644-4113-922d-e8336569a462/b2c_1a_prod_signupsignin_onesuizklogin/oauth2/v2.0/authorize?${params}`;
				break;
			case 'playtron':
				oauthUrl = `https://oauth2.playtron.one/oauth2/auth?${params}`;
				break;
			default:
				throw new Error(`Invalid provider: ${this.#provider}`);
		}

		await set('ephemeralKeyPair', ephemeralKeyPair.export(), sessionContext.idbStore);
		await this.#state.setSession(sessionContext, {
			expiresAt: estimatedExpiration,
			maxEpoch,
			randomness,
		});

		return oauthUrl;
	}

	async #handleAuthCallback({
		hash,
		sessionContext,
		pkceContext,
		search,
	}: {
		hash: string;
		sessionContext: EnokiSessionContext;
		pkceContext?: PKCEContext;
		search: string;
	}) {
		const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
		const zkp = await this.#state.getSession(sessionContext);

		if (!zkp?.maxEpoch || !zkp.randomness) {
			throw new Error(
				'Start of sign-in flow could not be found. Ensure you have started the sign-in flow before calling this.',
			);
		}

		const jwt = pkceContext
			? await this.#pkceTokenExchange(search, pkceContext)
			: params.get('id_token');

		if (!jwt) {
			throw new Error('Missing ID Token');
		}

		decodeJwt(jwt);

		const { address, publicKey } = await this.#enokiClient.getZkLogin({ jwt });

		this.#state.zkLoginState.set({ address, publicKey });
		await this.#state.setSession(sessionContext, { ...zkp, jwt });

		return params.get('state');
	}

	async #pkceTokenExchange(search: string, pkceContext: PKCEContext) {
		const params = new URLSearchParams(search);
		const code = params.get('code');

		if (!code) {
			throw new Error('Missing code');
		}

		const tokenEndpoint = pkceFlowProviders[this.#provider]?.tokenEndpoint;

		if (!tokenEndpoint) {
			throw new Error(`PKCE flow not supported for provider: ${this.#provider}`);
		}

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				client_id: this.#clientId,
				redirect_uri: this.#redirectUrl,
				code,
				code_verifier: pkceContext.codeVerifier,
			}),
		});

		return (await response.json()).id_token;
	}
}
