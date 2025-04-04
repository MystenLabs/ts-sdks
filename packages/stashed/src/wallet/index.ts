// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';
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
} from '@mysten/wallet-standard';
import { getWallets, ReadonlyWalletAccount, SUI_MAINNET_CHAIN } from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';

import { DEFAULT_STASHED_ORIGIN, StashedPopup } from './channel/index.js';
import type { StashedSupportedNetwork } from './types.js';

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

const STASHED_SESSION_KEY = 'stashed:session';

let embeddedIframe: HTMLIFrameElement;

let walletStatusCheckEnabled = false;

export const STASHED_WALLET_NAME = 'Stashed' as const;

const getStashedSession = () => {
	const { addresses = [], token } = JSON.parse(localStorage.getItem(STASHED_SESSION_KEY) || '{}');
	return { addresses, token };
};

export class StashedWallet implements Wallet {
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#origin: string;
	#name: string;
	#network: StashedSupportedNetwork;

	get name() {
		return STASHED_WALLET_NAME;
	}

	get icon() {
		return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1NiIgaGVpZ2h0PSI1NiIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjU0IiBoZWlnaHQ9IjU0IiB4PSIxIiB5PSIxIiBmaWxsPSIjNTE5REU5IiByeD0iMjciLz48cmVjdCB3aWR0aD0iNTQiIGhlaWdodD0iNTQiIHg9IjEiIHk9IjEiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyIiByeD0iMjciLz48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTguMzUzIDM1LjA2NGMuOTIxIDMuNDM4IDQuMzYzIDYuNTUxIDExLjQ4MyA0LjY0NCA2Ljc5NC0xLjgyMSAxMS4wNTItNy40MSA5Ljk0OC0xMS41My0uMzgxLTEuNDIzLTEuNTMtMi4zODctMy4zLTIuMjNsLTE1LjgzMiAxLjMyYy0uOTk3LjA3Ni0xLjQ1NC0uMDg4LTEuNzE4LS43MTYtLjI1Ni0uNTk5LS4xMS0xLjI0MSAxLjA5NC0xLjg1bDEyLjA0OC02LjE4M2MuOTI0LS40NyAxLjUzOS0uNjY2IDIuMTAxLS40NjguMzUyLjEyOC41ODQuNjM4LjM3MSAxLjI2N2wtLjc4MSAyLjMwNmMtLjk1OSAyLjgzIDEuMDk0IDMuNDg4IDIuMjUgMy4xNzggMS43NTEtLjQ2OSAyLjE2My0yLjEzNiAxLjU5OS00LjI0LTEuNDMtNS4zMzctNy4wOS02LjE3LTEyLjIyMy00Ljc5Ni01LjIyMiAxLjQtOS43NDggNS42My04LjM2NiAxMC43ODkuMzI1IDEuMjE1IDEuNDQ0IDIuMTg2IDIuNzQgMi4xNTdsMS45NzgtLjAwNWMuNDA3LS4wMS4yNi4wMjQgMS4wNDYtLjA0MS43ODQtLjA2NSAyLjg4LS4zMjMgMi44OC0uMzIzbDEwLjI4Ni0xLjE2NC4yNjUtLjAzOGMuNjAyLS4xMDMgMS4wNTYuMDUzIDEuNDQuNzE1LjU3Ni45OTEtLjMwMiAxLjczOC0xLjM1MiAyLjYzM2wtLjA4NS4wNzItOS4wNDEgNy43OTJjLTEuNTUgMS4zMzctMi42MzkuODM0LTMuMDItLjU4OWwtMS4zNS01LjA0Yy0uMzM0LTEuMjQ0LTEuNTUtMi4yMjEtMi45NzQtMS44NC0xLjc4LjQ3Ny0xLjkyNCAyLjU1LTEuNDg3IDQuMThaIi8+PC9zdmc+Cg==' as const;
	}

	get version() {
		return '1.0.0' as const;
	}

	get chains() {
		return [SUI_MAINNET_CHAIN] as const;
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
		name,
		network,
		address,
		origin = DEFAULT_STASHED_ORIGIN,
	}: {
		name: string;
		network: StashedSupportedNetwork;
		origin?: string;
		address?: string | null;
	}) {
		this.#accounts = [];
		this.#events = mitt();
		this.#origin = origin;
		this.#name = name;
		this.#network = network;

		if (address) {
			this.#setAccount(address);
		}
	}

	#signTransactionBlock: SuiSignTransactionBlockMethod = async ({ transactionBlock, account }) => {
		transactionBlock.setSenderIfNotSet(account.address);

		const data = transactionBlock.serialize();

		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
			network: this.#network,
		});

		const response = await popup.send({
			type: 'sign-transaction-block',
			data,
			address: account.address,
			network: this.#network,
			session: getStashedSession().token,
		});

		return {
			transactionBlockBytes: response.bytes,
			signature: response.signature,
		};
	};

	#signTransaction: SuiSignTransactionMethod = async ({ transaction, account }) => {
		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
			network: this.#network,
		});

		const tx = Transaction.from(await transaction.toJSON());
		tx.setSenderIfNotSet(account.address);

		const data = tx.serialize();

		const response = await popup.send({
			type: 'sign-transaction-block',
			data,
			address: account.address,
			network: this.#network,
			session: getStashedSession().token,
		});

		return {
			bytes: response.bytes,
			signature: response.signature,
		};
	};

	#signPersonalMessage: SuiSignPersonalMessageMethod = async ({ message, account }) => {
		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
			network: this.#network,
		});
		const bytes = toBase64(message);

		const response = await popup.send({
			type: 'sign-personal-message',
			bytes,
			address: account.address,
			network: this.#network,
			session: getStashedSession().token,
		});

		console.log('response', response);

		return {
			bytes,
			signature: response.signature,
		};
	};

	#on: StandardEventsOnMethod = (event, listener) => {
		this.#events.on(event, listener);
		return () => this.#events.off(event, listener);
	};

	#setAccount(address?: string) {
		if (address) {
			this.#accounts = [
				new ReadonlyWalletAccount({
					address,
					chains: [SUI_MAINNET_CHAIN],
					features: ['sui:signTransactionBlock', 'sui:signPersonalMessage'],
					// NOTE: Stashed doesn't support getting public keys, and zkLogin accounts don't have meaningful public keys anyway
					publicKey: new Uint8Array(),
				}),
			];
		} else {
			this.#accounts = [];
		}

		this.#events.emit('change', { accounts: this.accounts });
	}
	addAccount(address: string) {
		this.#accounts.push(
			new ReadonlyWalletAccount({
				address,
				chains: [SUI_MAINNET_CHAIN],
				features: ['sui:signTransactionBlock', 'sui:signPersonalMessage'],
				// NOTE: Stashed doesn't support getting public keys, and zkLogin accounts don't have meaningful public keys anyway
				publicKey: new Uint8Array(),
			}),
		);

		this.#events.emit('change', { accounts: this.accounts });
	}

	removeAccount(address: string) {
		const { addresses, token } = getStashedSession();

		if (addresses.includes(address)) {
			addresses.splice(addresses.indexOf(address), 1);
			localStorage.setItem(
				STASHED_SESSION_KEY,
				JSON.stringify({
					addresses,
					token,
				}),
			);
		}

		this.#accounts = this.#accounts.filter((account) => account.address !== address);

		this.#events.emit('change', { accounts: this.accounts });
	}

	#setMultipleAccounts(addresses: string[]) {
		if (addresses) {
			this.#accounts = addresses.map((address) => {
				return new ReadonlyWalletAccount({
					address,
					chains: [SUI_MAINNET_CHAIN],
					features: ['sui:signTransactionBlock', 'sui:signPersonalMessage'],
					// NOTE: Stashed doesn't support getting public keys, and zkLogin accounts don't have meaningful public keys anyway
					publicKey: new Uint8Array(),
				});
			});
		} else {
			this.#accounts = [];
		}

		this.#events.emit('change', { accounts: this.accounts });
	}

	#connect: StandardConnectMethod = async (input) => {
		if (input?.silent) {
			const { addresses } = getStashedSession();

			if (addresses.length) {
				this.#setMultipleAccounts(addresses);
			}

			return { accounts: this.accounts };
		}
		walletStatusCheckEnabled = false;
		const popup = new StashedPopup({
			name: this.#name,
			origin: this.#origin,
			network: this.#network,
		});

		const response = await popup.send({
			type: 'connect',
			network: this.#network,
		});

		if (!('selectedAddresses' in response)) {
			throw new Error('Unexpected response');
		}

		localStorage.setItem(
			STASHED_SESSION_KEY,
			JSON.stringify({ addresses: response.selectedAddresses, token: response.session }),
		);

		this.#setMultipleAccounts(response.selectedAddresses);

		setTimeout(() => {
			walletStatusCheckEnabled = true;
		}, 2000);
		return { accounts: this.accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		localStorage.removeItem(STASHED_SESSION_KEY);
		this.#setAccount();

		embeddedIframe.contentWindow?.postMessage(
			{ type: 'WALLET_DISCONNECTED', payload: { message: 'The wallet has been disconnected.' } },
			'http://localhost:3000', // todo: use actual domain
		);
	};
}

export function registerStashedWallet(
	name: string,
	{
		origin,
		network = 'mainnet',
	}: {
		origin?: string;
		network?: StashedSupportedNetwork;
	} = {},
) {
	/* @ts-ignore */
	embeddedIframe = document.createElement('iframe');
	embeddedIframe.style.display = 'none';
	embeddedIframe.src = 'http://localhost:3000/embed'; // origin || DEFAULT_STASHED_ORIGIN;
	document.body.appendChild(embeddedIframe);

	const wallets = getWallets();

	let addressFromRedirect: string | null = null;

	const wallet = new StashedWallet({
		name,
		network,
		origin,
		address: addressFromRedirect,
	});

	const unregister = wallets.register(wallet);

	// every 3 seconds, check if the wallet is connected
	walletStatusCheckEnabled = true;
	setInterval(() => {
		if (!walletStatusCheckEnabled) return;
		embeddedIframe.contentWindow?.postMessage(
			{ type: 'WALLET_STATUS_REQUEST' },
			'http://localhost:3000', // todo: use actual domain
		);
	}, 1000);

	window.addEventListener('message', (event) => {
		if (event.origin !== 'http://localhost:3000' && event.origin !== 'https://getstashed.com')
			return;
		const { type, payload } = event.data;

		if (type === 'WALLET_STATUS') {
			if (!walletStatusCheckEnabled) return;

			wallet.accounts.forEach((account) => {
				const foundAddress = (payload?.accounts || []).some((item: any) => {
					return item.account.address === account.address;
				});
				if (!foundAddress) {
					wallet.removeAccount(account.address);
				}
			});
		}
	});

	/* @ts-ignore */
	if (window.stashed) {
		// don't register stashed web if extension is installed.
		// we prefer the extension over the web wallet.
		document.body.removeChild(embeddedIframe);
		window.removeEventListener('message', () => {});
		unregister();
	}

	return {
		wallet,
		unregister,
		addressFromRedirect,
	};
}
