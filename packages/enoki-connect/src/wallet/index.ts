// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type {
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
	StandardEventsListeners,
	StandardEventsOnMethod,
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
	SUI_MAINNET_CHAIN,
	SUI_TESTNET_CHAIN,
} from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';

import { EnokiConnectPopup } from './channel/index.js';
import type { SupportedNetwork } from './types.js';

export type { SupportedNetwork } from './types.js';

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

const SUPPORTED_CHAINS = [SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN] as const;

function chainToNetwork(chain: string, defaultNetwork: SupportedNetwork) {
	if (SUPPORTED_CHAINS.includes(chain as (typeof SUPPORTED_CHAINS)[number])) {
		return chain.split(':')[1] as SupportedNetwork;
	}
	return defaultNetwork;
}

export class EnokiConnectWallet implements Wallet {
	readonly id: string;
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#origin: string;
	#walletName: string;
	#dappName: string;
	#icon: WalletIcon;
	#network: SupportedNetwork;
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
			'sui:signTransactionBlock': {
				version: '1.0.0',
				signTransactionBlock: this.#signTransactionBlock,
			},
			'sui:signTransaction': {
				version: '2.0.0',
				signTransaction: this.#signTransaction,
			},
			'sui:signPersonalMessage': {
				version: '1.0.0',
				signPersonalMessage: this.#signPersonalMessage,
			},
		};
	}

	constructor({
		publicAppSlug,
		walletName,
		dappName,
		origin,
		icon,
		network,
	}: {
		publicAppSlug: string;
		walletName: string;
		dappName: string;
		network: SupportedNetwork;
		origin: string;
		icon: WalletIcon;
	}) {
		this.#accounts = [];
		this.#events = mitt();
		this.#origin = origin;
		this.#walletName = walletName;
		this.#dappName = dappName;
		this.#icon = icon;
		this.#network = network;
		this.#publicAppSlug = publicAppSlug;
		this.id = `enoki-connect-${publicAppSlug}`;
	}

	#signTransactionBlock: SuiSignTransactionBlockMethod = async ({
		transactionBlock,
		account,
		chain,
	}) => {
		transactionBlock.setSenderIfNotSet(account.address);

		const popup = new EnokiConnectPopup({
			name: this.#dappName,
			origin: this.#origin,
			network: chainToNetwork(chain, this.#network),
			publicAppSlug: this.#publicAppSlug,
		});
		const response = await popup.send({
			type: 'sign-transaction',
			data: JSON.stringify(transactionBlock.getData()),
			address: account.address,
		});

		return {
			transactionBlockBytes: response.bytes,
			signature: response.signature,
		};
	};

	#signTransaction: SuiSignTransactionMethod = async ({ transaction, account, chain }) => {
		const popup = new EnokiConnectPopup({
			name: this.#dappName,
			origin: this.#origin,
			network: chainToNetwork(chain, this.#network),
			publicAppSlug: this.#publicAppSlug,
		});
		const tx = Transaction.from(await transaction.toJSON());

		tx.setSenderIfNotSet(account.address);

		const response = await popup.send({
			type: 'sign-transaction',
			data: JSON.stringify(await tx.getData()),
			address: account.address,
		});

		return {
			bytes: response.bytes,
			signature: response.signature,
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account }) => {
		const popup = new EnokiConnectPopup({
			name: this.#dappName,
			origin: this.#origin,
			network: this.#network,
			publicAppSlug: this.#publicAppSlug,
		});
		const bytes = toBase64(message);
		const response = await popup.send({
			type: 'sign-personal-message',
			bytes,
			address: account.address,
		});

		return {
			bytes,
			signature: response.signature,
		};
	};

	#on: StandardEventsOnMethod = (event, listener) => {
		this.#events.on(event, listener);

		return () => this.#events.off(event, listener);
	};

	#setAccount(account?: { address: string; publicKey: string }) {
		if (account) {
			this.#accounts = [
				new ReadonlyWalletAccount({
					address: account.address,
					chains: SUPPORTED_CHAINS,
					features: ['sui:signTransactionBlock', 'sui:signPersonalMessage', 'sui:signTransaction'],
					publicKey: fromBase64(account.publicKey),
				}),
			];

			localStorage.setItem(this.#getRecentAddressKey(), JSON.stringify(account));
		} else {
			this.#accounts = [];
		}

		this.#events.emit('change', { accounts: this.accounts });
	}

	#connect: StandardConnectMethod = async (input) => {
		if (input?.silent) {
			const account = localStorage.getItem(this.#getRecentAddressKey());

			if (account) {
				const parsedAccount = JSON.parse(account);
				if (parsedAccount.address && parsedAccount.publicKey) {
					this.#setAccount(parsedAccount);
				}
			}

			return { accounts: this.accounts };
		}

		const popup = new EnokiConnectPopup({
			name: this.#dappName,
			origin: this.#origin,
			network: this.#network,
			publicAppSlug: this.#publicAppSlug,
		});

		const response = await popup.send({
			type: 'connect',
		});

		if (!('address' in response) || !('publicKey' in response)) {
			throw new Error('Unexpected response');
		}

		this.#setAccount({ address: response.address, publicKey: response.publicKey });

		return { accounts: this.accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		localStorage.removeItem(this.#getRecentAddressKey());
		this.#setAccount();
	};

	#getRecentAddressKey() {
		return `enoki-connect-${this.#publicAppSlug}:recentAddress`;
	}
}

type EnokiConnectMetadata = {
	name: string;
	description: string;
	logoUrl: WalletIcon;
	appUrl: string;
};

async function getEnokiConnectMetadata(publicAppSlug: string, enokiApiUrl: string) {
	const res = await fetch(new URL(`/connect/metadata/${publicAppSlug}`, enokiApiUrl));

	if (!res.ok) {
		throw new Error('Failed to fetch enoki connect metadata');
	}

	const { data } = await res.json();

	return data as EnokiConnectMetadata;
}

export async function registerEnokiConnectWallet({
	publicAppSlug,
	dappName,
	network = 'mainnet',
	enokiApiUrl = 'https://api.enoki.mystenlabs.com',
}: {
	publicAppSlug: string;
	dappName: string;
	network?: SupportedNetwork;
	enokiApiUrl?: string;
}) {
	const data = await getEnokiConnectMetadata(publicAppSlug, enokiApiUrl);
	const wallets = getWallets();
	const wallet = new EnokiConnectWallet({
		walletName: data.name,
		dappName,
		origin: data.appUrl,
		icon: data.logoUrl,
		network,
		publicAppSlug,
	});
	const unregister = wallets.register(wallet);

	return {
		wallet,
		unregister,
	};
}
