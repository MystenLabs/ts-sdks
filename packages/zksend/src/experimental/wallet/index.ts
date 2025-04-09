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
import {
	getWallets,
	ReadonlyWalletAccount,
	SUI_CHAINS,
	SUI_MAINNET_CHAIN,
} from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';
import type { InferOutput } from 'valibot';
import { boolean, object, parse, string } from 'valibot';

import { DEFAULT_STASHED_ORIGIN, StashedPopup } from './channel/index.js';

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

const STASHED_SESSION_KEY = 'stashed:session';

export const STASHED_WALLET_NAME = 'Stashed' as const;
type StashedAccount = { address: string; publicKey?: string };

const getStashedSession = (): { accounts: StashedAccount[]; token: string } => {
	const { accounts = [], token } = JSON.parse(localStorage.getItem(STASHED_SESSION_KEY) || '{}');
	return { accounts, token };
};

const SUI_WALLET_EXTENSION_ID = 'com.mystenlabs.suiwallet' as const;
const METADATA_API_URL = 'http://localhost:3001/api/wallet/metadata';

const WalletMetadataSchema = object({
	id: string('Wallet ID is required'),
	walletName: string('Wallet name is required'),
	icon: string('Icon must be a valid wallet icon format'),
	enabled: boolean('Enabled is required'),
});

type WalletMetadata = InferOutput<typeof WalletMetadataSchema>;
export class StashedWallet implements Wallet {
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
		this.#origin = origin || DEFAULT_STASHED_ORIGIN;
		this.#name = name;
		this.#walletName = metadata.walletName;
		this.#icon = metadata.icon as WalletIcon;
	}

	#signTransactionBlock: SuiSignTransactionBlockMethod = async ({
		transactionBlock,
		account,
		chain,
	}) => {
		transactionBlock.setSenderIfNotSet(account.address);

		const data = await transactionBlock.toJSON();

		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
		});

		const response = await popup.send({
			type: 'sign-transaction',
			transaction: data,
			address: account.address,
			chain,
			session: getStashedSession().token,
		});

		return {
			transactionBlockBytes: response.bytes,
			signature: response.signature,
		};
	};

	#signTransaction: SuiSignTransactionMethod = async ({ transaction, account, chain }) => {
		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
			chain,
		});

		const tx = await transaction.toJSON();

		const response = await popup.send({
			type: 'sign-transaction',
			transaction: tx,
			address: account.address,
			chain,
			session: getStashedSession().token,
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
		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
			chain,
		});

		const tx = Transaction.from(await transaction.toJSON());
		tx.setSenderIfNotSet(account.address);

		const data = await tx.toJSON();

		const response = await popup.send({
			type: 'sign-and-execute-transaction',
			transaction: data,
			address: account.address,
			chain,
			session: getStashedSession().token,
		});
		return {
			bytes: response.bytes,
			signature: response.signature,
			digest: response.digest,
			effects: response.effects || '',
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account }) => {
		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
		});

		const response = await popup.send({
			type: 'sign-personal-message',
			message: toBase64(message),
			address: account.address,
			session: getStashedSession().token,
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

	removeAccount(address: string) {
		const { accounts, token } = getStashedSession();

		const filteredAccounts = accounts.filter((account) => account.address !== address);
		if (filteredAccounts.length !== accounts.length) {
			localStorage.setItem(
				STASHED_SESSION_KEY,
				JSON.stringify({
					accounts: filteredAccounts,
					token,
				}),
			);
		}

		this.#accounts = this.#accounts.filter((account) => account.address !== address);

		this.#events.emit('change', { accounts: this.accounts });
	}

	#setAccounts(accounts?: StashedAccount[]) {
		if (accounts && accounts.length) {
			this.#accounts = accounts.map((account) => {
				return new ReadonlyWalletAccount({
					address: account.address,
					chains: [SUI_MAINNET_CHAIN],
					features: ['sui:signTransactionBlock', 'sui:signPersonalMessage'],
					publicKey: account.publicKey ? fromBase64(account.publicKey) : new Uint8Array(),
				});
			});
		} else {
			this.#accounts = [];
		}

		this.#events.emit('change', { accounts: this.accounts });
	}

	#connect: StandardConnectMethod = async (input) => {
		if (input?.silent) {
			const { accounts } = getStashedSession();

			if (accounts.length) {
				this.#setAccounts(accounts);
			}

			return { accounts: this.accounts };
		}
		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
		});

		const response = await popup.send({
			type: 'connect',
		});

		if (!('accounts' in response)) {
			throw new Error('Unexpected response');
		}

		localStorage.setItem(
			STASHED_SESSION_KEY,
			JSON.stringify({ accounts: response.accounts, token: response.session }),
		);

		this.#setAccounts(response.accounts);

		return { accounts: this.accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		localStorage.removeItem(STASHED_SESSION_KEY);

		this.#setAccounts();
	};
}
async function fetchMetadata(metadataApiUrl: string): Promise<WalletMetadata> {
	const response = await fetch(metadataApiUrl);
	if (!response.ok) {
		throw new Error('Failed to fetch wallet metadata');
	}
	const data = await response.json();
	return parse(WalletMetadataSchema, data);
}

export async function registerStashedWallet(
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

	const extension = wallets.get().find((wallet) => wallet.id === SUI_WALLET_EXTENSION_ID);
	if (extension) {
		return;
	}

	let metadata: WalletMetadata | undefined;
	try {
		metadata = await fetchMetadata(metadataApiUrl);
	} catch (error) {
		console.error('Error fetching metadata', error);
	}

	if (!metadata?.enabled) {
		console.log('Stashed wallet is not currently enabled.');
		return;
	}
	const stashedWalletInstance = new StashedWallet({
		name,
		origin,
		metadata,
	});

	const unregister = wallets.register(stashedWalletInstance);

	// listen for wallet registration
	wallets.on('register', (wallet) => {
		if (wallet.id === SUI_WALLET_EXTENSION_ID) {
			unregister();
		}
	});

	return {
		wallet: stashedWalletInstance,
		unregister,
	};
}
