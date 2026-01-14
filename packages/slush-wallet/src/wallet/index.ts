// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type {
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
	StandardEventsListeners,
	StandardEventsOnMethod,
	SuiChain,
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
import { getWallets, ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';
import type { InferOutput } from 'valibot';
import { boolean, object, parse, string } from 'valibot';
import { DappPostMessageChannel, decodeJwtSession } from '@mysten/window-wallet-core';

const DEFAULT_SLUSH_ORIGIN = 'https://my.slush.app';

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

const SLUSH_SESSION_KEY = 'slush:session';

export const SLUSH_WALLET_NAME = 'Slush' as const;

export const SLUSH_WALLET_ICON =
	'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTAgMjRDMCAxMC43NDUyIDEwLjc0NTIgMCAyNCAwQzM3LjI1NDggMCA0OCAxMC43NDUyIDQ4IDI0QzQ4IDM3LjI1NDggMzcuMjU0OCA0OCAyNCA0OEMxMC43NDUyIDQ4IDAgMzcuMjU0OCAwIDI0WiIgZmlsbD0iIzBDMEExRiIvPgo8cGF0aCBkPSJNMTMuMTM1OCAzMi4xMDg1QzE0LjE3MDEgMzUuOTY4MyAxOC4wMzMxIDM5LjQ2MjQgMjYuMDI1NSAzNy4zMjA4QzMzLjY1MTUgMzUuMjc3NCAzOC40MzA5IDI5LjAwNCAzNy4xOTE2IDI0LjM3ODlDMzYuNzYzNiAyMi43ODE3IDM1LjQ3NDYgMjEuNzAwNiAzMy40ODcyIDIxLjg3NjVMMTUuNzE2NSAyMy4zNTcyQzE0LjU5NzMgMjMuNDQzIDE0LjA4NDIgMjMuMjU5NiAxMy43ODgxIDIyLjU1NDNDMTMuNTAxIDIxLjg4MjMgMTMuNjY0NiAyMS4xNjA5IDE1LjAxNjMgMjAuNDc3N0wyOC41NDAxIDEzLjUzNzRDMjkuNTc2NyAxMy4wMSAzMC4yNjcxIDEyLjc4OTMgMzAuODk4IDEzLjAxMjZDMzEuMjkzNCAxMy4xNTYzIDMxLjU1MzggMTMuNzI4NCAzMS4zMTQ3IDE0LjQzNDRMMzAuNDM3OCAxNy4wMjMyQzI5LjM2MTcgMjAuMjAwMiAzMS42NjUzIDIwLjkzODIgMzIuOTY0MSAyMC41OTAyQzM0LjkyODkgMjAuMDYzNyAzNS4zOTExIDE4LjE5MjMgMzQuNzU4MSAxNS44Mjk5QzMzLjE1MzMgOS44NDA1NCAyNi43OTkgOC45MDQxMSAyMS4wMzc4IDEwLjQ0NzhDMTUuMTc2NyAxMi4wMTgzIDEwLjA5NiAxNi43Njc2IDExLjY0NzQgMjIuNTU3M0MxMi4wMTI5IDIzLjkyMTYgMTMuMjY4NyAyNS4wMTE2IDE0LjcyMzIgMjQuOTc4NUwxNi45NDM4IDI0Ljk3MzFDMTcuNDAwNCAyNC45NjI1IDE3LjIzNiAyNSAxOC4xMTcgMjQuOTI3MUMxOC45OTggMjQuODU0MSAyMS4zNTA5IDI0LjU2NDYgMjEuMzUwOSAyNC41NjQ2TDMyLjg5NjIgMjMuMjU4TDMzLjE5MzcgMjMuMjE0OEMzMy44Njg5IDIzLjA5OTcgMzQuMzc5MiAyMy4yNzUgMzQuODEwNiAyNC4wMTgzQzM1LjQ1NjMgMjUuMTMwNCAzNC40NzEyIDI1Ljk2OTEgMzMuMjkyIDI2Ljk3MzFDMzMuMjYwNSAyNyAzMy4yMjg4IDI3LjAyNyAzMy4xOTcgMjcuMDU0MUwyMy4wNDgyIDM1LjgwMDVDMjEuMzA4NyAzNy4zMDA4IDIwLjA4NjcgMzYuNzM2NyAxOS42NTg4IDM1LjEzOTVMMTguMTQzMSAyOS40ODI5QzE3Ljc2ODcgMjguMDg1NCAxNi40MDQxIDI2Ljk4ODkgMTQuODA1NiAyNy40MTcyQzEyLjgwNzUgMjcuOTUyNiAxMi42NDU1IDMwLjI3ODQgMTMuMTM1OCAzMi4xMDg1WiIgZmlsbD0iI0ZCRkFGRiIvPgo8L3N2Zz4K' as const;

const SUI_WALLET_EXTENSION_ID = 'com.mystenlabs.suiwallet' as const;
const METADATA_API_URL = 'https://api.slush.app/api/wallet/metadata';

const FALLBACK_METADATA = {
	id: 'com.mystenlabs.suiwallet.web',
	walletName: 'Slush',
	description: 'Trade and earn on Sui.',
	icon: SLUSH_WALLET_ICON,
	enabled: true,
};

const WalletMetadataSchema = object({
	id: string('Wallet ID is required'),
	walletName: string('Wallet name is required'),
	icon: string('Icon must be a valid wallet icon format'),
	enabled: boolean('Enabled is required'),
});

function setSessionToStorage(session: string) {
	localStorage.setItem(SLUSH_SESSION_KEY, session);
}

function getSessionFromStorage() {
	const session = localStorage.getItem(SLUSH_SESSION_KEY);

	if (!session) {
		throw new Error('No session found');
	}

	return session;
}

const walletAccountFeatures = [
	'sui:signTransaction',
	'sui:signAndExecuteTransaction',
	'sui:signPersonalMessage',
	'sui:signTransactionBlock',
	'sui:signAndExecuteTransactionBlock',
] as const;

function getAccountsFromSession(session: string) {
	const { payload } = decodeJwtSession(session);
	return payload.accounts.map((account) => {
		return new ReadonlyWalletAccount({
			address: account.address,
			chains: SUI_CHAINS,
			features: walletAccountFeatures,
			publicKey: fromBase64(account.publicKey),
		});
	});
}

type WalletMetadata = InferOutput<typeof WalletMetadataSchema>;
export class SlushWallet implements Wallet {
	#id: string;
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#origin: string;
	#walletName: string;
	#icon: WalletIcon;
	#name: string;

	get name() {
		return this.#walletName;
	}

	get id() {
		return this.#id;
	}

	get icon() {
		return this.#icon;
	}

	get version() {
		return '1.0.0' as const;
	}

	get chains() {
		return SUI_CHAINS;
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
		name,
		origin,
		metadata,
	}: {
		name: string;
		origin?: string;
		chain?: SuiChain;
		metadata: WalletMetadata;
	}) {
		this.#id = metadata.id;
		this.#accounts = this.#getPreviouslyAuthorizedAccounts();
		this.#events = mitt();
		this.#origin = origin || DEFAULT_SLUSH_ORIGIN;
		this.#name = name;
		this.#walletName = metadata.walletName;
		this.#icon = metadata.icon as WalletIcon;
	}

	#signTransactionBlock: SuiSignTransactionBlockMethod = async ({
		transactionBlock,
		account,
		chain,
	}) => {
		const data = await transactionBlock.toJSON();

		const popup = this.#getNewPopupChannel();

		const response = await popup.send({
			type: 'sign-transaction',
			transaction: data,
			address: account.address,
			chain,
			session: getSessionFromStorage(),
		});

		return {
			transactionBlockBytes: response.bytes,
			signature: response.signature,
		};
	};

	#signTransaction: SuiSignTransactionMethod = async ({ transaction, account, chain }) => {
		const popup = this.#getNewPopupChannel();

		const tx = await transaction.toJSON();

		const response = await popup.send({
			type: 'sign-transaction',
			transaction: tx,
			address: account.address,
			chain,
			session: getSessionFromStorage(),
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

		const data = await transaction.toJSON();

		const response = await popup.send({
			type: 'sign-and-execute-transaction',
			transaction: data,
			address: account.address,
			chain,
			session: getSessionFromStorage(),
		});
		return {
			bytes: response.bytes,
			signature: response.signature,
			digest: response.digest,
			effects: response.effects,
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account, chain }) => {
		const popup = this.#getNewPopupChannel();

		const response = await popup.send({
			type: 'sign-personal-message',
			message: toBase64(message),
			address: account.address,
			chain: chain ?? account.chains[0],
			session: getSessionFromStorage(),
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

	#setAccounts(accounts: ReadonlyWalletAccount[]) {
		this.#accounts = accounts;
		this.#events.emit('change', { accounts: this.accounts });
	}

	#connect: StandardConnectMethod = async (input) => {
		if (input?.silent) {
			return { accounts: this.accounts };
		}

		const popup = this.#getNewPopupChannel();
		const response = await popup.send({
			type: 'connect',
		});

		setSessionToStorage(response.session);
		this.#setAccounts(getAccountsFromSession(response.session));

		return { accounts: this.accounts };
	};

	#getPreviouslyAuthorizedAccounts() {
		try {
			return getAccountsFromSession(getSessionFromStorage());
		} catch {
			return [];
		}
	}

	#disconnect: StandardDisconnectMethod = async () => {
		localStorage.removeItem(SLUSH_SESSION_KEY);
		this.#setAccounts([]);
	};

	#getNewPopupChannel() {
		return new DappPostMessageChannel({
			appName: this.#name,
			hostOrigin: this.#origin,
		});
	}

	updateMetadata(metadata: WalletMetadata) {
		this.#id = metadata.id;
		this.#walletName = metadata.walletName;
		this.#icon = metadata.icon as WalletIcon;
	}
}

async function fetchMetadata(metadataApiUrl: string): Promise<WalletMetadata> {
	const response = await fetch(metadataApiUrl);
	if (!response.ok) {
		throw new Error('Failed to fetch wallet metadata');
	}
	const data = await response.json();
	return parse(WalletMetadataSchema, data);
}

export function registerSlushWallet(
	name: string,
	{
		origin,
		metadataApiUrl = METADATA_API_URL,
	}: {
		origin?: string;
		metadataApiUrl?: string;
	} = {},
) {
	const wallets = getWallets();

	let unregister: (() => void) | null = null;

	// listen for wallet registration
	wallets.on('register', (wallet) => {
		if (wallet.id === SUI_WALLET_EXTENSION_ID) {
			unregister?.();
		}
	});

	const extension = wallets.get().find((wallet) => wallet.id === SUI_WALLET_EXTENSION_ID);
	if (extension) {
		return;
	}

	const slushWalletInstance = new SlushWallet({
		name,
		origin,
		metadata: FALLBACK_METADATA,
	});
	unregister = wallets.register(slushWalletInstance);

	fetchMetadata(metadataApiUrl)
		.then((metadata) => {
			if (!metadata.enabled) {
				console.log('Slush wallet is not currently enabled.');
				unregister?.();
				return;
			}
			slushWalletInstance.updateMetadata(metadata);
		})
		.catch((error) => {
			console.error('Error fetching metadata', error);
		});

	return {
		wallet: slushWalletInstance,
		unregister,
	};
}
