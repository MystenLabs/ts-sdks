// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { mitt, type Emitter } from '@mysten/utils';
import type {
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
	StandardEventsListeners,
	StandardEventsOnMethod,
	SuiFeatures,
	SuiSignAndExecuteTransactionMethod,
	SuiSignPersonalMessageMethod,
	SuiSignTransactionMethod,
	Wallet,
	WalletAccount,
	WalletIcon,
} from '@mysten/wallet-standard';
import { getWallets, ReadonlyWalletAccount, SUI_CHAINS } from '@mysten/wallet-standard';

import type { SignerAdapter } from '../types.js';
import { executeSigning } from './signing.js';

type WalletEventsMap = {
	[E in keyof StandardEventsListeners]: Parameters<StandardEventsListeners[E]>[0];
};

const DEFAULT_WALLET_NAME = 'Dev Wallet';

const DEFAULT_WALLET_ICON: WalletIcon =
	'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjNjM2NkYxIi8+PHBhdGggZD0iTTkgMjJWMTBoMy41YTQgNCAwIDAgMSAwIDhoLTIuNW0wIDBoLTFtMS00aDIuNSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMTkgMTBsMy41IDEyTTI2IDEwbC0zLjUgMTJNMTkuNSAxOGg1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==';

/**
 * A pending signing request waiting for user approval via the wallet UI.
 */
export interface WalletRequest {
	id: string;
	type: 'sign-transaction' | 'sign-and-execute-transaction' | 'sign-personal-message';
	account: WalletAccount;
	chain: string;
	/** Transaction JSON string for sign/execute, Uint8Array for personal messages. */
	data: string | Uint8Array;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- wallet-standard return types vary by method
	resolve: (result: any) => void;
	reject: (error: Error) => void;
}

/**
 * Auto-approval policy for signing requests.
 *
 * - `true` — approve all requests automatically (useful for testing/CI)
 * - A function — called with the request details, return `true` to auto-approve
 */
export type AutoApprovePolicy =
	| boolean
	| ((request: {
			type: WalletRequest['type'];
			account: WalletAccount;
			chain: string;
			data: string | Uint8Array;
	  }) => boolean);

/**
 * Configuration for creating a DevWallet instance.
 */
export interface DevWalletConfig {
	/** The signer adapters that manage accounts and signing. Each adapter manages its own type of accounts. */
	adapters: SignerAdapter[];
	/** Map of network name to SuiClient instance (e.g. { testnet: suiClient }). */
	clients: Record<string, ClientWithCoreApi>;
	/** Display name for the wallet. Defaults to 'Dev Wallet'. */
	name?: string;
	/** Data URI icon for the wallet. */
	icon?: WalletIcon;
	/**
	 * Auto-approval policy. When set, matching requests are signed immediately
	 * without queuing for user approval.
	 *
	 * - `true` — approve all requests (replaces burner wallet behavior)
	 * - A function — fine-grained control over which requests to auto-approve
	 *
	 * @default false (all requests require manual approval)
	 */
	autoApprove?: AutoApprovePolicy;
}

/**
 * DevWallet implements the wallet-standard Wallet interface, parameterized by a SignerAdapter.
 *
 * All signing requests are queued and require approval (via UI or programmatic call).
 * This makes it behave like a real wallet — the developer sees what they're signing
 * and explicitly approves or rejects each request.
 */
export class DevWallet implements Wallet {
	readonly #adapters: SignerAdapter[];
	readonly #clients: Record<string, ClientWithCoreApi>;
	readonly #name: string;
	readonly #icon: WalletIcon;
	readonly #autoApprove: AutoApprovePolicy;
	#accounts: ReadonlyWalletAccount[];
	#events: Emitter<WalletEventsMap>;
	#unsubscribeAdapters: (() => void)[];
	#pendingRequest: WalletRequest | null;
	#requestListeners: Set<(request: WalletRequest | null) => void>;
	#destroyed = false;

	constructor(config: DevWalletConfig) {
		this.#adapters = config.adapters;
		this.#clients = config.clients;
		this.#name = config.name ?? DEFAULT_WALLET_NAME;
		this.#icon = config.icon ?? DEFAULT_WALLET_ICON;
		this.#autoApprove = config.autoApprove ?? false;
		this.#accounts = this.#aggregateAccounts();
		this.#events = mitt();
		this.#unsubscribeAdapters = [];
		this.#pendingRequest = null;
		this.#requestListeners = new Set();

		this.#setupAdapterListeners();
	}

	get version() {
		return '1.0.0' as const;
	}

	get name() {
		return this.#name;
	}

	get icon() {
		return this.#icon;
	}

	get chains() {
		return SUI_CHAINS;
	}

	get accounts(): readonly ReadonlyWalletAccount[] {
		return this.#accounts;
	}

	get features(): StandardConnectFeature &
		StandardEventsFeature &
		StandardDisconnectFeature &
		SuiFeatures {
		return {
			'standard:connect': {
				version: '1.0.0',
				connect: this.#connect,
			},
			'standard:events': {
				version: '1.0.0',
				on: this.#on,
			},
			'standard:disconnect': {
				version: '1.0.0',
				disconnect: this.#disconnect,
			},
			'sui:signPersonalMessage': {
				version: '1.1.0',
				signPersonalMessage: this.#signPersonalMessage,
			},
			'sui:signTransaction': {
				version: '2.0.0',
				signTransaction: this.#signTransaction,
			},
			'sui:signAndExecuteTransaction': {
				version: '2.0.0',
				signAndExecuteTransaction: this.#signAndExecuteTransaction,
			},
		};
	}

	/** The current pending signing request, or null if none. */
	get pendingRequest(): WalletRequest | null {
		return this.#pendingRequest;
	}

	/** The signer adapters backing this wallet. */
	get adapters(): readonly SignerAdapter[] {
		return this.#adapters;
	}

	/** Returns the adapter that owns the given account address, or undefined. */
	getAdapterForAccount(address: string): SignerAdapter | undefined {
		return this.#adapters.find((a) => a.getAccount(address) !== undefined);
	}

	/** Returns adapters that support account creation. */
	getCreatableAdapters(): SignerAdapter[] {
		return this.#adapters.filter((a) => 'createAccount' in a && a.createAccount);
	}

	/** The configured clients, keyed by network name. */
	get clients(): Record<string, ClientWithCoreApi> {
		return this.#clients;
	}

	/**
	 * Register this wallet with the wallet-standard registry.
	 * @returns An unregister function that removes this wallet from the registry.
	 */
	register(): () => void {
		if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
			console.warn(
				'[@mysten/dev-wallet] DevWallet is intended for development only. Do not use in production.',
			);
		}
		const walletsApi = getWallets();
		return walletsApi.register(this);
	}

	/**
	 * Clean up all resources: unsubscribe from the adapter, reject any pending
	 * request, and clear all listeners. The wallet should not be used after this.
	 */
	destroy(): void {
		this.#destroyed = true;
		for (const unsub of this.#unsubscribeAdapters) {
			unsub();
		}
		this.#unsubscribeAdapters = [];
		if (this.#pendingRequest) {
			this.#pendingRequest.reject(new Error('Wallet destroyed.'));
			this.#pendingRequest = null;
		}
		this.#requestListeners.clear();
		this.#events.all.clear();
	}

	/**
	 * Mount the wallet UI panel to the DOM.
	 *
	 * Creates a `<dev-wallet-panel>` element bound to this wallet and appends it
	 * to the given target element (defaults to `document.body`).
	 *
	 * @returns A cleanup function that removes the UI from the DOM.
	 */
	async mountUI(target?: HTMLElement): Promise<() => void> {
		// Await the import to ensure the custom element is registered before createElement
		await import('../ui/dev-wallet-panel.js');
		const container = target ?? document.body;
		const panel = document.createElement('dev-wallet-panel');
		(panel as any).wallet = this;
		container.appendChild(panel);
		return () => {
			panel.remove();
		};
	}

	/**
	 * Approve the current pending request. The wallet signs the request
	 * using the adapter's signer and resolves the promise.
	 */
	async approveRequest(): Promise<void> {
		const request = this.#pendingRequest;
		if (!request) {
			throw new Error('No pending request to approve.');
		}

		try {
			const result = await this.#executeSigning(
				request.type,
				request.account,
				request.chain,
				request.data,
			);
			this.#pendingRequest = null;
			this.#notifyRequestListeners();
			request.resolve(result);
		} catch (error) {
			this.#pendingRequest = null;
			this.#notifyRequestListeners();
			request.reject(error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Reject the current pending request with an optional reason.
	 */
	rejectRequest(reason?: string): void {
		const request = this.#pendingRequest;
		if (!request) {
			throw new Error('No pending request to reject.');
		}
		this.#pendingRequest = null;
		this.#notifyRequestListeners();
		request.reject(new Error(reason ?? 'Request rejected by user.'));
	}

	/**
	 * Subscribe to pending request changes.
	 * The callback fires whenever a new request is enqueued, approved, or rejected.
	 *
	 * @returns An unsubscribe function.
	 */
	onRequestChange(callback: (request: WalletRequest | null) => void): () => void {
		this.#requestListeners.add(callback);
		return () => {
			this.#requestListeners.delete(callback);
		};
	}

	#notifyRequestListeners() {
		const request = this.#pendingRequest;
		for (const listener of this.#requestListeners) {
			listener(request);
		}
	}

	#aggregateAccounts(): ReadonlyWalletAccount[] {
		return this.#adapters.flatMap((a) => a.getAccounts().map((acc) => acc.walletAccount));
	}

	#setupAdapterListeners() {
		for (const adapter of this.#adapters) {
			const unsub = adapter.onAccountsChanged(() => {
				this.#accounts = this.#aggregateAccounts();
				this.#events.emit('change', { accounts: this.#accounts });
			});
			this.#unsubscribeAdapters.push(unsub);
		}
	}

	#on: StandardEventsOnMethod = (event, listener) => {
		this.#events.on(event, listener);
		return () => this.#events.off(event, listener);
	};

	#connect: StandardConnectMethod = async () => {
		if (this.#unsubscribeAdapters.length === 0) {
			this.#setupAdapterListeners();
		}
		this.#accounts = this.#aggregateAccounts();
		return { accounts: this.accounts };
	};

	#disconnect: StandardDisconnectMethod = async () => {
		for (const unsub of this.#unsubscribeAdapters) {
			unsub();
		}
		this.#unsubscribeAdapters = [];
	};

	#getClient(chain: string) {
		const network = chain.split(':')[1];
		if (!network) {
			throw new Error(`Invalid chain identifier: ${chain}`);
		}
		const client = this.#clients[network];
		if (!client) {
			throw new Error(
				`No client configured for network "${network}". Available networks: ${Object.keys(this.#clients).join(', ')}`,
			);
		}
		return client;
	}

	#getSigner(address: string) {
		for (const adapter of this.#adapters) {
			const account = adapter.getAccount(address);
			if (account) return account.signer;
		}
		const allAddresses = this.#adapters.flatMap((a) => a.getAccounts().map((acc) => acc.address));
		throw new Error(
			`No account found for address "${address}". Available addresses: ${allAddresses.join(', ')}`,
		);
	}

	#shouldAutoApprove(
		type: WalletRequest['type'],
		account: WalletAccount,
		chain: string,
		data: string | Uint8Array,
	): boolean {
		if (this.#autoApprove === true) {
			return true;
		}
		if (typeof this.#autoApprove === 'function') {
			return this.#autoApprove({ type, account, chain, data });
		}
		return false;
	}

	async #executeSigning(
		type: WalletRequest['type'],
		account: WalletAccount,
		chain: string,
		data: string | Uint8Array,
	) {
		const signer = this.#getSigner(account.address);
		const client = type !== 'sign-personal-message' ? this.#getClient(chain) : undefined;
		return executeSigning({ type, signer, data, client });
	}

	#enqueueRequest(
		type: WalletRequest['type'],
		account: WalletAccount,
		chain: string,
		data: string | Uint8Array,
	): Promise<any> {
		if (this.#destroyed) {
			return Promise.reject(new Error('Wallet has been destroyed.'));
		}
		if (this.#shouldAutoApprove(type, account, chain, data)) {
			return this.#executeSigning(type, account, chain, data);
		}

		// Only one request at a time — subsequent requests are immediately rejected.
		// DApps that batch transactions should serialize their signing calls.
		if (this.#pendingRequest) {
			return Promise.reject(new Error('A signing request is already pending.'));
		}

		return new Promise((resolve, reject) => {
			this.#pendingRequest = {
				id: crypto.randomUUID(),
				type,
				account,
				chain,
				data,
				resolve,
				reject,
			};
			this.#notifyRequestListeners();
		});
	}

	#signPersonalMessage: SuiSignPersonalMessageMethod = async (input) => {
		return this.#enqueueRequest(
			'sign-personal-message',
			input.account,
			input.chain ?? 'sui:unknown',
			input.message,
		);
	};

	#signTransaction: SuiSignTransactionMethod = async (input) => {
		const txJson = await input.transaction.toJSON();
		return this.#enqueueRequest('sign-transaction', input.account, input.chain, txJson);
	};

	#signAndExecuteTransaction: SuiSignAndExecuteTransactionMethod = async (input) => {
		const txJson = await input.transaction.toJSON();
		return this.#enqueueRequest('sign-and-execute-transaction', input.account, input.chain, txJson);
	};
}
