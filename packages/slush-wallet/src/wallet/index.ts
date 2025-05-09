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

const SUI_WALLET_EXTENSION_ID = 'com.mystenlabs.suiwallet' as const;
const METADATA_API_URL = 'https://api.slush.app/api/wallet/metadata';

const FALLBACK_METADATA = {
	id: 'com.mystenlabs.suiwallet.web',
	walletName: 'Slush',
	description: 'Trade and earn on Sui.',
	icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjNENBMkZGIi8+CjxwYXRoIGQ9Ik0xMi4zNDczIDM0LjcyNTRDMTMuNTU1MyAzOS4yMzM2IDE4LjA2NzMgNDMuMzE0OCAyNy40MDI1IDQwLjgxMzRDMzYuMzA5NyAzOC40MjY3IDQxLjg5MjEgMzEuMDk5MyA0MC40NDQ2IDI1LjY5NzJDMzkuOTQ0NyAyMy44MzE3IDM4LjQzOTEgMjIuNTY4OSAzNi4xMTc4IDIyLjc3NDRMMTUuMzYxNSAyNC41MDM4QzE0LjA1NDQgMjQuNjA0MSAxMy40NTUgMjQuMzg5OCAxMy4xMDkyIDIzLjU2NjFDMTIuNzczOCAyMi43ODEyIDEyLjk2NDkgMjEuOTM4NSAxNC41NDM3IDIxLjE0MDZMMzAuMzM5NiAxMy4wMzQyQzMxLjU1MDMgMTIuNDE4MiAzMi4zNTY3IDEyLjE2MDUgMzMuMDkzNiAxMi40MjEzQzMzLjU1NTUgMTIuNTg5MSAzMy44NTk2IDEzLjI1NzQgMzMuNTgwMyAxNC4wODJMMzIuNTU2MSAxNy4xMDU2QzMxLjI5OTIgMjAuODE2NCAzMy45ODk5IDIxLjY3ODQgMzUuNTA2OCAyMS4yNzE5QzM3LjgwMTcgMjAuNjU3IDM4LjM0MTYgMTguNDcxMiAzNy42MDIzIDE1LjcxMTlDMzUuNzI3OCA4LjcxNjI5IDI4LjMwNTkgNy42MjI1NCAyMS41NzY4IDkuNDI1NTlDMTQuNzMxMSAxMS4yNTk5IDguNzk2ODEgMTYuODA3MiAxMC42MDg4IDIzLjU2OTZDMTEuMDM1OCAyNS4xNjMgMTIuNTAyNSAyNi40MzYyIDE0LjIwMTQgMjYuMzk3NUwxNi43OTUgMjYuMzkxMkMxNy4zMjg0IDI2LjM3ODggMTcuMTM2MyAyNi40MjI3IDE4LjE2NTMgMjYuMzM3NEMxOS4xOTQ0IDI2LjI1MjIgMjEuOTQyNSAyNS45MTQgMjEuOTQyNSAyNS45MTRMMzUuNDI3NSAyNC4zODhMMzUuNzc1IDI0LjMzNzVDMzYuNTYzNyAyNC4yMDMgMzcuMTU5NyAyNC40MDc5IDM3LjY2MzYgMjUuMjc2QzM4LjQxNzcgMjYuNTc1IDM3LjI2NzIgMjcuNTU0NiAzNS44ODk5IDI4LjcyNzJDMzUuODUzIDI4Ljc1ODYgMzUuODE2IDI4Ljc5MDEgMzUuNzc4OSAyOC44MjE4TDIzLjkyNSAzOS4wMzc3QzIxLjg5MzMgNDAuNzkwMSAyMC40NjYgNDAuMTMxMSAxOS45NjYyIDM4LjI2NTZMMTguMTk1OCAzMS42NTg3QzE3Ljc1ODUgMzAuMDI2NCAxNi4xNjQ2IDI4Ljc0NTYgMTQuMjk3NiAyOS4yNDU5QzExLjk2MzggMjkuODcxMiAxMS43NzQ2IDMyLjU4NzggMTIuMzQ3MyAzNC43MjU0WiIgZmlsbD0iIzA2MEQxNCIvPgo8L3N2Zz4K',
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

async function getAccountsFromSession(session: string) {
	const { payload } = await decodeJwtSession(session);

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
		this.#accounts = [];
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
			try {
				const accounts = await getAccountsFromSession(getSessionFromStorage());

				if (accounts.length) {
					this.#setAccounts(accounts);
				}
			} catch (error) {
				// Do nothing
			}

			return { accounts: this.accounts };
		}

		const popup = this.#getNewPopupChannel();
		const response = await popup.send({
			type: 'connect',
		});

		setSessionToStorage(response.session);
		this.#setAccounts(await getAccountsFromSession(response.session));

		return { accounts: this.accounts };
	};

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
