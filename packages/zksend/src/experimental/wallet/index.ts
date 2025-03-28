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
} from '@mysten/wallet-standard';
import {
	getWallets,
	ReadonlyWalletAccount,
	SUI_CHAINS,
	SUI_MAINNET_CHAIN,
} from '@mysten/wallet-standard';
import type { Emitter } from 'mitt';
import mitt from 'mitt';

import { DEFAULT_STASHED_ORIGIN, StashedPopup } from './channel/index.js';

const PACKAGE_VERSION = 'v1';

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

const STASHED_SESSION_KEY = 'stashed:session';

let embeddedIframe: HTMLIFrameElement;

let walletStatusCheckEnabled = false;
let stashedWalletInstance: StashedWallet | null = null;
let stashedWalletOrigin: string;
let walletStatusIntervalId: NodeJS.Timeout | null = null;

export const STASHED_WALLET_NAME = 'Stashed' as const;
type StashedAccount = { address: string; publicKey?: string };

const getStashedSession = (): { accounts: StashedAccount[]; token: string } => {
	const { accounts = [], token } = JSON.parse(localStorage.getItem(STASHED_SESSION_KEY) || '{}');
	return { accounts, token };
};

const getPostMessagePayload = () => {
	return {
		version: PACKAGE_VERSION,
		originUrl: window.location.href,
		userAgent: navigator.userAgent,
		screenResolution: `${window.screen.width}x${window.screen.height}`,
		language: navigator.language,
		platform: navigator.platform,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		timestamp: Date.now(),
	};
};

export class StashedWallet implements Wallet {
	#events: Emitter<WalletEventsMap>;
	#accounts: ReadonlyWalletAccount[];
	#origin: string;
	#name: string;

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
		address,
		origin = DEFAULT_STASHED_ORIGIN,
	}: {
		name: string;
		origin?: string;
		address?: string | null;
		chain?: SuiChain;
	}) {
		this.#accounts = [];
		this.#events = mitt();
		this.#origin = origin;
		this.#name = name;

		if (address) {
			this.#setAccounts([{ address }]);
		}
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

		const tx = Transaction.from(await transaction.toJSON());
		tx.setSenderIfNotSet(account.address);

		const data = await tx.toJSON();

		const response = await popup.send({
			type: 'sign-transaction',
			transaction: data,
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

		const response = await popup
			.send({
				type: 'sign-and-execute-transaction',
				transaction: data,
				address: account.address,
				chain,
				session: getStashedSession().token,
			})
			.catch((error) => {
				throw error;
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

			embedStashedIframe();

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

		embedStashedIframe();

		return { accounts: this.accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		embeddedIframe.contentWindow?.postMessage(
			{
				type: 'WALLET_DISCONNECTED',
				payload: getPostMessagePayload(),
				session: getStashedSession().token,
			},
			this.#origin,
		);

		localStorage.removeItem(STASHED_SESSION_KEY);

		this.#setAccounts();

		setTimeout(() => {
			document.body.removeChild(embeddedIframe);
			window.removeEventListener('message', () => {});
			clearWalletStatusInterval();
		}, 2000);
	};
}

// Function to clear the interval
function clearWalletStatusInterval() {
	if (walletStatusIntervalId !== null) {
		clearInterval(walletStatusIntervalId);
		walletStatusIntervalId = null;
	}
}

const embedStashedIframe = () => {
	/* @ts-ignore */
	embeddedIframe = document.createElement('iframe');
	embeddedIframe.style.display = 'none';
	embeddedIframe.src = `${stashedWalletOrigin}/embed`;
	document.body.appendChild(embeddedIframe);
	// every second, check if the wallet is connected
	walletStatusCheckEnabled = true;
	walletStatusIntervalId = setInterval(() => {
		if (!walletStatusCheckEnabled) return;
		embeddedIframe.contentWindow?.postMessage(
			{
				type: 'WALLET_STATUS_REQUEST',
				payload: getPostMessagePayload(),
				session: getStashedSession().token,
			},
			stashedWalletOrigin,
		);
	}, 1000);

	window.addEventListener('message', (event) => {
		if (event.origin !== stashedWalletOrigin) return;
		const { type, payload } = event.data;

		if (type === 'WALLET_STATUS') {
			if (!walletStatusCheckEnabled || !stashedWalletInstance) return;

			stashedWalletInstance.accounts.forEach((account) => {
				const foundAddress = (payload?.accounts || []).some((item: any) => {
					return item.account.address === account.address;
				});
				if (!foundAddress) {
					stashedWalletInstance?.removeAccount(account.address);
				}
			});
		}
	});
};

export function registerStashedWallet(
	name: string,
	{
		origin,
	}: {
		origin?: string;
	} = {},
) {
	const wallets = getWallets();

	let addressFromRedirect: string | null = null;

	try {
		const params = new URLSearchParams(window.location.search);
		addressFromRedirect = params.get('stashed_address') || params.get('zksend_address');
	} catch {
		// Ignore errors
	}

	stashedWalletInstance = new StashedWallet({
		name,
		origin,
		address: addressFromRedirect,
	});

	stashedWalletOrigin = origin || DEFAULT_STASHED_ORIGIN;

	const unregister = wallets.register(stashedWalletInstance);

	/* @ts-ignore */
	if (window.stashed) {
		// don't register stashed web if extension is installed.
		// we prefer the extension over the web wallet.
		unregister();
	}

	return {
		wallet: stashedWalletInstance,
		unregister,
		addressFromRedirect,
	};
}
