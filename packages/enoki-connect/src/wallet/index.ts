// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type {
	IdentifierString,
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
	StandardEventsListeners,
	StandardEventsOnMethod,
	SuiSignAndExecuteTransactionFeature,
	SuiSignAndExecuteTransactionMethod,
	SuiSignPersonalMessageFeature,
	SuiSignPersonalMessageMethod,
	SuiSignTransactionBlockFeature,
	SuiSignTransactionBlockMethod,
	SuiSignTransactionFeature,
	SuiSignTransactionMethod,
	Wallet,
	WalletIcon,
} from '@mysten/wallet-standard';
import {
	getWallets,
	ReadonlyWalletAccount,
	SUI_DEVNET_CHAIN,
	SUI_MAINNET_CHAIN,
	SUI_TESTNET_CHAIN,
} from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';
import { DappPostMessageChannel, decodeJwtSession } from '@mysten/window-wallet-core';
import { promiseWithResolvers } from '@mysten/utils';

import '../components/modal.js';

export type SupportedNetwork = 'mainnet' | 'testnet' | 'devnet';

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

const SUPPORTED_CHAINS = [SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN, SUI_DEVNET_CHAIN] as const;
const ACCOUNT_FEATURES = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
	'sui:signTransactionBlock',
	'sui:signAndExecuteTransactionBlock',
] as const;

export class EnokiConnectWallet implements Wallet {
	readonly id: string;
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#hostOrigin: string;
	#walletName: string;
	#dappName: string;
	#icon: WalletIcon;
	#defaultChain: IdentifierString;
	#publicAppSlug: string;

	get name() {
		return this.#walletName;
	}

	get icon() {
		return this.#icon;
	}

	get version() {
		return '1.0.0' as const;
	}

	get chains() {
		return SUPPORTED_CHAINS;
	}

	get accounts() {
		return this.#accounts;
	}

	get features(): StandardConnectFeature &
		StandardDisconnectFeature &
		StandardEventsFeature &
		SuiSignTransactionBlockFeature &
		SuiSignTransactionFeature &
		SuiSignPersonalMessageFeature &
		SuiSignAndExecuteTransactionFeature {
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
			'sui:signTransactionBlock': {
				version: '1.0.0',
				signTransactionBlock: this.#signTransactionBlock,
			},
			'sui:signTransaction': {
				version: '2.0.0',
				signTransaction: this.#signTransaction,
			},
			'sui:signPersonalMessage': {
				version: '1.1.0',
				signPersonalMessage: this.#signPersonalMessage,
			},
			'sui:signAndExecuteTransaction': {
				version: '2.0.0',
				signAndExecuteTransaction: this.#signAndExecuteTransaction,
			},
		};
	}

	constructor({
		publicAppSlug,
		walletName,
		dappName,
		hostOrigin,
		icon,
		network,
	}: {
		publicAppSlug: string;
		walletName: string;
		dappName: string;
		network: SupportedNetwork;
		hostOrigin: string;
		icon: WalletIcon;
	}) {
		this.#accounts = [];
		this.#events = mitt();
		this.#hostOrigin = hostOrigin;
		this.#walletName = walletName;
		this.#dappName = dappName;
		this.#icon = icon;
		this.#defaultChain = `sui:${network}`;
		this.#publicAppSlug = publicAppSlug;
		this.id = `enoki-connect-${publicAppSlug}`;
	}

	#signTransactionBlock: SuiSignTransactionBlockMethod = async ({
		transactionBlock,
		account,
		chain,
	}) => {
		const popup = await this.#getNewPopupChannel();
		const response = await popup.send({
			type: 'sign-transaction',
			chain,
			transaction: await transactionBlock.toJSON(),
			address: account.address,
			session: this.#getStoredSession(),
		});

		return {
			transactionBlockBytes: response.bytes,
			signature: response.signature,
		};
	};

	#signTransaction: SuiSignTransactionMethod = async ({ transaction, account, chain }) => {
		const popup = await this.#getNewPopupChannel();
		const response = await popup.send({
			type: 'sign-transaction',
			chain,
			transaction: await transaction.toJSON(),
			address: account.address,
			session: this.#getStoredSession(),
		});

		return {
			bytes: response.bytes,
			signature: response.signature,
		};
	};

	#signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async ({
		transaction,
		account,
		chain,
	}) => {
		const popup = await this.#getNewPopupChannel();
		const response = await popup.send({
			type: 'sign-and-execute-transaction',
			transaction: await transaction.toJSON(),
			address: account.address,
			chain,
			session: this.#getStoredSession(),
		});

		return {
			bytes: response.bytes,
			signature: response.signature,
			digest: response.digest,
			effects: response.effects,
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account, chain }) => {
		const popup = await this.#getNewPopupChannel();
		const response = await popup.send({
			type: 'sign-personal-message',
			chain: chain ?? this.#defaultChain,
			message: toBase64(message),
			address: account.address,
			session: this.#getStoredSession(),
		});

		return {
			bytes: response.bytes,
			signature: response.signature,
		};
	};

	#on: StandardEventsOnMethod = (event, listener) => {
		this.#events.on(event, listener);

		return () => this.#events.off(event, listener);
	};

	#setAccounts(session?: string) {
		if (session) {
			this.#accounts = this.#getAccountsFromSession(session);
			localStorage.setItem(this.#getSessionKey(), session);
		} else {
			this.#accounts = [];
		}

		this.#events.emit('change', { accounts: this.accounts });
	}

	#connect: StandardConnectMethod = async (input) => {
		if (input?.silent) {
			try {
				const session = this.#getStoredSession();

				if (session) {
					this.#setAccounts(session);
				}
			} catch (_e) {
				// ignore
			}

			return { accounts: this.accounts };
		}

		const popup = await this.#getNewPopupChannel();
		const response = await popup.send({
			type: 'connect',
		});

		this.#setAccounts(response.session);

		return { accounts: this.accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		localStorage.removeItem(this.#getSessionKey());
		this.#setAccounts();
	};

	#getSessionKey() {
		return `enoki-connect-${this.#publicAppSlug}:session`;
	}

	#getStoredSession() {
		const session = localStorage.getItem(this.#getSessionKey());

		if (!session) {
			throw new Error('No session found');
		}

		return session;
	}

	async #getNewPopupChannel() {
		let popupWindow: Window | undefined | null = window.open('about:blank', '_blank');

		if (!popupWindow) {
			popupWindow = await addClickToOpenPopupWindow({
				walletName: this.#walletName,
				dappName: this.#dappName,
			});
		}

		return new DappPostMessageChannel({
			appName: this.#dappName,
			hostOrigin: this.#hostOrigin,
			extraRequestOptions: {
				publicAppSlug: this.#publicAppSlug,
			},
			popupWindow,
		});
	}

	#getAccountsFromSession(session: string) {
		try {
			const {
				payload: { accounts },
			} = decodeJwtSession(session);

			return accounts.map(
				(anAccount) =>
					new ReadonlyWalletAccount({
						address: anAccount.address,
						chains: SUPPORTED_CHAINS,
						features: ACCOUNT_FEATURES,
						publicKey: fromBase64(anAccount.publicKey),
					}),
			);
		} catch (error) {
			return [];
		}
	}
}

function addClickToOpenPopupWindow({
	walletName,
	dappName,
}: {
	walletName: string;
	dappName: string;
}) {
	const { promise, resolve, reject } = promiseWithResolvers<Window>();
	const modal = document.createElement('enoki-connect-modal');

	modal.walletName = walletName;
	modal.dappName = dappName;
	modal.open = true;

	modal.addEventListener('cancel', () => {
		reject(new Error('Popup was blocked from browser and user rejected click to review request'));
		modal.open = false;
	});

	modal.addEventListener('approved', () => {
		modal.disabled = true;
		modal.open = false;

		const popup = window.open('about:blank', '_blank');

		if (popup) {
			resolve(popup);
		} else {
			reject(new Error('Failed to open popup'));
		}
	});

	modal.addEventListener('closed', () => {
		modal.remove();
	});

	document.body.appendChild(modal);

	return promise;
}

type EnokiConnectMetadata = {
	publicAppSlug: string;
	name: string;
	logoUrl: WalletIcon;
	appUrl: string;
};

async function getEnokiConnectMetadata(publicAppSlugs: string[], enokiApiUrl: string) {
	const sortedPublicAppSlugs = [...publicAppSlugs].sort();
	const queryParams = new URLSearchParams();

	for (const publicAppSlug of sortedPublicAppSlugs) {
		queryParams.append('slugs', publicAppSlug);
	}

	queryParams.sort();

	const res = await fetch(new URL(`/v1/connect/metadata?${queryParams.toString()}`, enokiApiUrl));

	if (!res.ok) {
		throw new Error('Failed to fetch enoki connect metadata');
	}

	const { data } = await res.json();

	return data as EnokiConnectMetadata[];
}

/**
 * Registers Enoki Connect wallets for your dApp.
 *
 * This function fetches wallet metadata for the provided public app slugs and registers
 * them with the wallet standard. It returns the registered wallet instances and an
 * `unregister` function to remove them if needed.
 *
 * @param publicAppSlugs - An array of public app slugs to register. You can obtain these slugs from the wallet developer.
 * @param dappName - The display name of your dApp. This will be shown to users in wallet UIs.
 * @param network - (Optional) The default Sui network to use for wallet operations (when chain is not specified in the wallet method). Accepts 'mainnet', 'testnet', or 'devnet'. Defaults to 'mainnet' if not specified.
 * @param enokiApiUrl - (Optional) The Enoki API endpoint to use for fetching wallet metadata. Defaults to the public Enoki API at 'https://api.enoki.mystenlabs.com'. (Override this if you are running a local or custom Enoki API instance.)
 *
 * @returns An object containing:
 *   - `wallets`: The array of registered EnokiConnectWallet instances.
 *   - `unregister`: A function to unregister all registered wallets.
 *
 * @example
 * ```ts
 * const { wallets, unregister } = await registerEnokiConnectWallets({
 *   publicAppSlugs: ['an-app-slug'],
 *   dappName: 'My Dapp',
 * });
 * ```
 */
export async function registerEnokiConnectWallets({
	publicAppSlugs,
	dappName,
	network = 'mainnet',
	enokiApiUrl = 'https://api.enoki.mystenlabs.com',
}: {
	publicAppSlugs: string[];
	dappName: string;
	network?: SupportedNetwork;
	enokiApiUrl?: string;
}) {
	const wallets = getWallets();
	const data = await getEnokiConnectMetadata(publicAppSlugs, enokiApiUrl);
	const unregisterCallbacks: (() => void)[] = [];
	const registeredWallets: EnokiConnectWallet[] = [];

	for (const aWalletMetadata of data) {
		const wallet = new EnokiConnectWallet({
			walletName: aWalletMetadata.name,
			dappName,
			hostOrigin: aWalletMetadata.appUrl,
			icon: aWalletMetadata.logoUrl,
			network,
			publicAppSlug: aWalletMetadata.publicAppSlug,
		});
		const unregister = wallets.register(wallet);

		unregisterCallbacks.push(unregister);
		registeredWallets.push(wallet);
	}

	return {
		wallets: registeredWallets,
		unregister: () => {
			for (const unregister of unregisterCallbacks) {
				unregister();
			}
		},
	};
}
