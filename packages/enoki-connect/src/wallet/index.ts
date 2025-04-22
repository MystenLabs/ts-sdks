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
	SUI_MAINNET_CHAIN,
	SUI_TESTNET_CHAIN,
} from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';
import { DappPostMessageChannel, decodeJwtSession } from '@mysten/window-wallet-core';

export type SupportedNetwork = 'mainnet' | 'testnet';

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

const SUPPORTED_CHAINS = [SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN] as const;
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
		transactionBlock.setSenderIfNotSet(account.address);

		const popup = this.#getNewPopupChannel();
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
		const popup = this.#getNewPopupChannel();

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
		const popup = this.#getNewPopupChannel();
		const tx = Transaction.from(await transaction.toJSON());

		tx.setSenderIfNotSet(account.address);

		const response = await popup.send({
			type: 'sign-and-execute-transaction',
			transaction: await tx.toJSON(),
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

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account }) => {
		const popup = this.#getNewPopupChannel();
		const response = await popup.send({
			type: 'sign-personal-message',
			// TODO: use chain from signPersonalMessage input when available
			chain: this.#defaultChain,
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

		const popup = this.#getNewPopupChannel();
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

	#getNewPopupChannel() {
		return new DappPostMessageChannel({
			appName: this.#dappName,
			hostOrigin: this.#hostOrigin,
			extraRequestOptions: {
				publicAppSlug: this.#publicAppSlug,
			},
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

type EnokiConnectMetadata = {
	name: string;
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
		hostOrigin: data.appUrl,
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
