// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type {
	IdentifierArray,
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
import { getWallets, ReadonlyWalletAccount } from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';

import type { AuthProvider } from '../EnokiClient/type.js';
import { ENOKI_PROVIDER_WALLETS_INFO } from './providers.js';
import { INTERNAL_EnokiFlow } from './state.js';
import type { RegisterEnokiWalletsOptions, WalletEventsMap } from './types.js';

export class EnokiWallet implements Wallet {
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#name: string;
	#id: string;
	#icon: Wallet['icon'];
	#flow: INTERNAL_EnokiFlow;
	#provider: AuthProvider;
	#clientId: string;
	#redirectUrl: string | undefined;
	#extraParams: Record<string, string> | undefined;
	#client;
	#windowFeatures?: string | (() => string);

	get id() {
		return this.#id;
	}

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
		return [`sui:${this.#flow.network}`] as const;
	}

	get accounts() {
		return this.#accounts;
	}

	get features(): StandardConnectFeature &
		StandardDisconnectFeature &
		StandardEventsFeature &
		SuiSignTransactionFeature &
		SuiSignAndExecuteTransactionFeature &
		SuiSignPersonalMessageFeature {
		return {
			'standard:connect': {
				version: '1.0.0',
				connect: this.#connect,
			},
			'standard:disconnect': {
				version: '1.0.0',
				disconnect: this.#disconnect,
			},
			'standard:events': {
				version: '1.0.0',
				on: this.#on,
			},
			'sui:signTransaction': {
				version: '2.0.0',
				signTransaction: this.#signTransaction,
			},
			'sui:signAndExecuteTransaction': {
				version: '2.0.0',
				signAndExecuteTransaction: this.#signAndExecuteTransaction,
			},
			'sui:signPersonalMessage': {
				version: '1.0.0',
				signPersonalMessage: this.#signPersonalMessage,
			},
		};
	}

	constructor({
		name,
		icon,
		flow,
		provider,
		clientId,
		redirectUrl,
		extraParams,
		client,
		windowFeatures,
	}: {
		icon: Wallet['icon'];
		name: string;
		flow: INTERNAL_EnokiFlow;
		provider: AuthProvider;
		clientId: string;
		redirectUrl?: string;
		extraParams?: Record<string, string>;
		client: SuiClient;
		windowFeatures?: string | (() => string);
	}) {
		this.#accounts = [];
		this.#events = mitt();

		this.#client = client;
		this.#name = name;
		this.#id = `enoki:${provider}:${flow.network}:${clientId}`;
		this.#icon = icon;
		this.#flow = flow;
		this.#provider = provider;
		this.#clientId = clientId;
		this.#redirectUrl = redirectUrl;
		this.#extraParams = extraParams;
		this.#windowFeatures = windowFeatures;

		this.#setAccount();
	}

	#signTransaction: SuiSignTransactionMethod = async ({ transaction, chain, account }) => {
		if (!this.chains.includes(chain as (typeof this.chains)[number])) {
			throw new Error(
				`A valid Sui chain identifier was not provided in the request. Please report this issue to the dApp developer. Examples of valid Sui chain identifiers are 'sui:testnet' and 'sui:mainnet'. Consider using the '@mysten/dapp-kit' package, which provides this value automatically.`,
			);
		}

		const parsedTransaction = Transaction.from(await transaction.toJSON());
		const keypair = await this.#flow.getKeypair();
		const suiAddress = keypair.toSuiAddress();

		if (suiAddress !== account.address) {
			throw new Error(
				`The specified account ${account.address} does not match the currently connected Enoki address ${suiAddress}.`,
			);
		}

		parsedTransaction.setSenderIfNotSet(suiAddress);
		return keypair.signTransaction(await parsedTransaction.build({ client: this.#client }));
	};

	#signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async ({
		transaction,
		chain,
		account,
	}) => {
		const { signature, bytes } = await this.#signTransaction({ transaction, account, chain });
		const { digest, rawEffects } = await this.#client.executeTransactionBlock({
			transactionBlock: bytes,
			signature,
			options: {
				showRawEffects: true,
			},
		});

		return {
			digest,
			signature,
			bytes,
			effects: toBase64(Uint8Array.from(rawEffects!)),
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account }) => {
		const keypair = await this.#flow.getKeypair();
		const suiAddress = keypair.toSuiAddress();

		if (suiAddress !== account.address) {
			throw new Error(
				`The specified account ${account.address} does not match the currently connected Enoki address ${suiAddress}.`,
			);
		}

		return keypair.signPersonalMessage(message);
	};

	#on: StandardEventsOnMethod = (event, listener) => {
		this.#events.on(event, listener);
		return () => this.#events.off(event, listener);
	};

	#setAccount() {
		const state = this.#flow.$zkLoginState.get();
		if (state.address && state.publicKey) {
			this.#accounts = [
				new ReadonlyWalletAccount({
					address: state.address,
					chains: this.chains,
					features: Object.keys(this.features) as IdentifierArray,
					publicKey: fromBase64(state.publicKey),
				}),
			];
		} else {
			this.#accounts = [];
		}

		this.#events.emit('change', { accounts: this.accounts });
	}

	#connect: StandardConnectMethod = async (input) => {
		this.#setAccount();

		if (this.accounts.length || input?.silent) {
			return { accounts: this.accounts };
		}

		const popup = window.open(
			undefined,
			'_blank',
			typeof this.#windowFeatures === 'function' ? this.#windowFeatures() : this.#windowFeatures,
		);
		if (!popup) {
			throw new Error('Failed to open popup');
		}

		const url = await this.#flow.createAuthorizationURL({
			provider: this.#provider,
			clientId: this.#clientId,
			redirectUrl: this.#redirectUrl ?? window.location.href.split('#')[0],
			extraParams: this.#extraParams,
		});

		popup.location = url;

		await new Promise<void>((resolve, reject) => {
			const interval = setInterval(() => {
				try {
					if (popup.closed) {
						clearInterval(interval);
						reject(new Error('Popup closed'));
					}

					if (!popup.location.hash) {
						return;
					}
				} catch (e) {
					return;
				}
				clearInterval(interval);

				this.#flow.handleAuthCallback(popup.location.hash).then(() => resolve(), reject);

				try {
					popup.close();
				} catch (e) {
					console.error(e);
				}
			}, 16);
		});

		this.#setAccount();

		return { accounts: this.accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		await this.#flow.logout();

		this.#setAccount();
	};
}

export function registerEnokiWallets({
	providers,
	client,
	windowFeatures = defaultWindowFeatures,
	...config
}: RegisterEnokiWalletsOptions) {
	const walletsApi = getWallets();
	const flow = new INTERNAL_EnokiFlow(config);

	const unregisterCallbacks: (() => void)[] = [];
	const wallets: Partial<Record<AuthProvider, EnokiWallet>> = {};

	for (const { name, icon, provider } of ENOKI_PROVIDER_WALLETS_INFO) {
		const providerOptions = providers[provider];
		if (providerOptions) {
			const { clientId, redirectUrl, extraParams } = providerOptions;
			const wallet = new EnokiWallet({
				name,
				icon,
				flow,
				provider,
				clientId,
				client,
				redirectUrl,
				extraParams,
				windowFeatures,
			});

			const unregister = walletsApi.register(wallet);
			unregisterCallbacks.push(unregister);

			wallets[provider] = wallet;
		}
	}

	return {
		wallets,
		unregister: () => {
			for (const unregister of unregisterCallbacks) {
				unregister();
			}
		},
	};
}

export function isEnokiWallet(wallet: Wallet): wallet is EnokiWallet {
	return !!wallet.id?.startsWith('enoki:');
}

export function defaultWindowFeatures() {
	const width = 500;
	const height = 800;
	const left = (screen.width - width) / 2;
	const top = (screen.height - height) / 4;

	return `popup=1;toolbar=0;status=0;resizable=1,width=${width},height=${height},top=${top},left=${left}`;
}
