// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { mitt, type Emitter } from '@mysten/utils';
import type {
	StandardConnectFeature,
	StandardConnectMethod,
	StandardDisconnectFeature,
	StandardDisconnectMethod,
	StandardEventsFeature,
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
import { DEFAULT_WALLET_ICON, getNetworkFromChain, type WalletEventsMap } from './constants.js';
import { type SigningResult, executeSigning } from './signing.js';

const DEFAULT_WALLET_NAME = 'Dev Wallet';

/**
 * Default gRPC endpoint URLs for standard Sui networks (devnet, testnet, localnet).
 */
export const DEFAULT_NETWORK_URLS = {
	devnet: 'https://fullnode.devnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
	localnet: 'http://127.0.0.1:9000',
} as const;

/**
 * A pending signing request waiting for user approval via the wallet UI.
 * @internal — use {@link PendingSigningRequest} for public consumption.
 */
export interface WalletRequest {
	id: string;
	type: 'sign-transaction' | 'sign-and-execute-transaction' | 'sign-personal-message';
	account: WalletAccount;
	chain: string;
	/** Transaction JSON string for sign/execute, Uint8Array for personal messages. */
	data: string | Uint8Array;
	resolve: (result: SigningResult) => void;
	reject: (error: Error) => void;
}

/**
 * Public view of a pending signing request, omitting internal resolve/reject callbacks.
 */
export type PendingSigningRequest = Omit<WalletRequest, 'resolve' | 'reject'>;

/**
 * A pending connect request waiting for user to select which accounts to expose.
 */
export interface ConnectRequest {
	id: string;
	resolve: (result: { accounts: readonly WalletAccount[] }) => void;
	reject: (error: Error) => void;
}

/**
 * Public view of a pending connect request, omitting internal resolve/reject callbacks.
 */
export type PendingConnectRequest = Omit<ConnectRequest, 'resolve' | 'reject'>;

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
	/**
	 * Network URLs by name. Keys are network names, values are gRPC endpoint URLs.
	 * Defaults to devnet, testnet, and localnet.
	 *
	 * @example
	 * ```ts
	 * { devnet: 'https://fullnode.devnet.sui.io:443' }
	 * ```
	 */
	networks?: Record<string, string>;
	/** Display name for the wallet. Defaults to 'Dev Wallet'. */
	name?: string;
	/** Data URI icon for the wallet. */
	icon?: WalletIcon;
	/**
	 * The initially active network. Defaults to the first key in `networks`.
	 */
	activeNetwork?: string;
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
	/**
	 * When true, connect requests are auto-approved with all accounts
	 * (no account picker shown). Useful for testing/CI.
	 *
	 * @default false
	 */
	autoConnect?: boolean;
	/** Factory to create a client for a given network. Defaults to creating SuiGrpcClient instances. */
	clientFactory?: (network: string, url: string) => ClientWithCoreApi;
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
	#networkUrls: Record<string, string>;
	#clients: Record<string, ClientWithCoreApi>;
	#activeNetwork: string;
	readonly #name: string;
	readonly #icon: WalletIcon;
	readonly #autoApprove: AutoApprovePolicy;
	readonly #autoConnect: boolean;
	readonly #clientFactory: (network: string, url: string) => ClientWithCoreApi;
	#accounts: ReadonlyWalletAccount[];
	#events: Emitter<WalletEventsMap>;
	#unsubscribeAdapters: (() => void)[];
	#pendingRequest: WalletRequest | null;
	#requestListeners: Set<(request: PendingSigningRequest | null) => void>;
	#pendingConnect: ConnectRequest | null;
	#connectListeners: Set<(request: PendingConnectRequest | null) => void>;
	#destroyed = false;

	constructor(config: DevWalletConfig) {
		if (config.adapters.length === 0) {
			console.warn('[dev-wallet] No adapters provided. The wallet will have no accounts.');
		}
		this.#adapters = config.adapters;
		this.#networkUrls = { ...(config.networks ?? DEFAULT_NETWORK_URLS) };
		this.#clients = {};
		this.#activeNetwork = config.activeNetwork ?? Object.keys(this.#networkUrls)[0] ?? '';
		this.#name = config.name ?? DEFAULT_WALLET_NAME;
		this.#icon = config.icon ?? DEFAULT_WALLET_ICON;
		this.#autoApprove = config.autoApprove ?? false;
		this.#autoConnect = config.autoConnect ?? false;
		this.#clientFactory =
			config.clientFactory ?? ((network, url) => new SuiGrpcClient({ baseUrl: url, network }));
		this.#accounts = this.#aggregateAccounts();
		this.#events = mitt();
		this.#unsubscribeAdapters = [];
		this.#pendingRequest = null;
		this.#requestListeners = new Set();
		this.#pendingConnect = null;
		this.#connectListeners = new Set();

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
	get pendingRequest(): PendingSigningRequest | null {
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

	/**
	 * The configured clients, keyed by network name.
	 * Note: This eagerly creates clients for all networks. Prefer `getClient()` or `activeClient` for single-network access.
	 */
	get clients(): Record<string, ClientWithCoreApi> {
		for (const name of Object.keys(this.#networkUrls)) {
			this.#ensureClient(name);
		}
		return { ...this.#clients };
	}

	/** Get or create the client for a specific network name. */
	getClient(network: string): ClientWithCoreApi {
		return this.#ensureClient(network);
	}

	/** The configured network URLs, keyed by network name. */
	get networkUrls(): Record<string, string> {
		return { ...this.#networkUrls };
	}

	/** The currently active network name. */
	get activeNetwork(): string {
		return this.#activeNetwork;
	}

	/** The client for the currently active network. */
	get activeClient(): ClientWithCoreApi | null {
		if (!this.#activeNetwork || !this.#networkUrls[this.#activeNetwork]) return null;
		return this.#ensureClient(this.#activeNetwork);
	}

	/** List of available network names. */
	get availableNetworks(): string[] {
		return Object.keys(this.#networkUrls);
	}

	/** Switch the active network. Emits a `change` event. */
	setActiveNetwork(network: string): void {
		if (!this.#networkUrls[network]) {
			throw new Error(
				`No client for network "${network}". Available: ${this.availableNetworks.join(', ')}`,
			);
		}
		this.#activeNetwork = network;
		this.#events.emit('change', { accounts: this.#accounts });
	}

	/** Add or update a network. Creates a new gRPC client for the URL. */
	addNetwork(name: string, url: string): void {
		try {
			new URL(url);
		} catch {
			throw new Error(`Invalid URL: ${url}`);
		}
		this.#networkUrls[name] = url;
		this.#clients[name] = this.#clientFactory(name, url);
		this.#events.emit('change', { accounts: this.#accounts });
	}

	/** Remove a network. Resets active network if it was the removed one. */
	removeNetwork(name: string): void {
		delete this.#networkUrls[name];
		delete this.#clients[name];
		if (this.#activeNetwork === name) {
			this.#activeNetwork = Object.keys(this.#networkUrls)[0] ?? '';
		}
		this.#events.emit('change', { accounts: this.#accounts });
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
		if (this.#pendingConnect) {
			this.#pendingConnect.reject(new Error('Wallet destroyed.'));
			this.#pendingConnect = null;
		}
		this.#requestListeners.clear();
		this.#connectListeners.clear();
		this.#events.all.clear();
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
	onRequestChange(callback: (request: PendingSigningRequest | null) => void): () => void {
		this.#requestListeners.add(callback);
		return () => {
			this.#requestListeners.delete(callback);
		};
	}

	/** The current pending connect request, or null if none. */
	get pendingConnect(): PendingConnectRequest | null {
		return this.#pendingConnect;
	}

	/**
	 * Approve a connect request, exposing only the given addresses to the dApp.
	 */
	approveConnect(selectedAddresses: string[]): void {
		const request = this.#pendingConnect;
		if (!request) {
			throw new Error('No pending connect request to approve.');
		}

		const selected =
			selectedAddresses.length > 0
				? this.#accounts.filter((a) => selectedAddresses.includes(a.address))
				: [...this.#accounts];

		this.#pendingConnect = null;
		this.#notifyConnectListeners();
		request.resolve({ accounts: selected });
	}

	/**
	 * Reject a connect request.
	 */
	rejectConnect(reason?: string): void {
		const request = this.#pendingConnect;
		if (!request) {
			throw new Error('No pending connect request to reject.');
		}
		this.#pendingConnect = null;
		this.#notifyConnectListeners();
		request.reject(new Error(reason ?? 'Connection rejected by user.'));
	}

	/**
	 * Subscribe to pending connect request changes.
	 */
	onConnectChange(callback: (request: PendingConnectRequest | null) => void): () => void {
		this.#connectListeners.add(callback);
		return () => {
			this.#connectListeners.delete(callback);
		};
	}

	#notifyRequestListeners() {
		const request = this.#pendingRequest;
		for (const listener of this.#requestListeners) {
			listener(request);
		}
	}

	#notifyConnectListeners() {
		const request = this.#pendingConnect;
		for (const listener of this.#connectListeners) {
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
		// Auto-connect: return all accounts immediately
		if (this.#autoConnect) {
			return { accounts: this.accounts };
		}

		// Queue a connect request for user to select accounts
		if (this.#pendingConnect) {
			return Promise.reject(new Error('A connect request is already pending.'));
		}

		return new Promise((resolve, reject) => {
			this.#pendingConnect = {
				id: crypto.randomUUID(),
				resolve,
				reject,
			};
			this.#notifyConnectListeners();
		});
	};

	#disconnect: StandardDisconnectMethod = async () => {
		// Disconnecting ends the dApp session but does not affect wallet state.
		// The wallet retains its accounts and adapter subscriptions.
	};

	#getClientForChain(chain: string) {
		const network = getNetworkFromChain(chain);
		if (!network) {
			throw new Error(`Invalid chain identifier: ${chain}`);
		}
		return this.#ensureClient(network);
	}

	#ensureClient(network: string): ClientWithCoreApi {
		if (!this.#clients[network]) {
			const url = this.#networkUrls[network];
			if (!url) {
				throw new Error(
					`No client for network "${network}". Available: ${this.availableNetworks.join(', ')}`,
				);
			}
			this.#clients[network] = this.#clientFactory(network, url);
		}
		return this.#clients[network];
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
		// Check adapter-level opt-out first — CLI adapters never auto-sign
		const adapter = this.getAdapterForAccount(account.address);
		if (adapter?.allowAutoSign === false) {
			return false;
		}

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
		const client = type !== 'sign-personal-message' ? this.#getClientForChain(chain) : undefined;
		return executeSigning({ type, signer, data, client });
	}

	#enqueueRequest<T extends WalletRequest['type']>(
		type: T,
		account: WalletAccount,
		chain: string,
		data: string | Uint8Array,
	): Promise<Extract<SigningResult, { type: T }>> {
		type Result = Extract<SigningResult, { type: T }>;
		if (this.#destroyed) {
			return Promise.reject(new Error('Wallet has been destroyed.'));
		}
		if (this.#shouldAutoApprove(type, account, chain, data)) {
			return this.#executeSigning(type, account, chain, data) as Promise<Result>;
		}

		// Only one request at a time — subsequent requests are immediately rejected.
		// DApps that batch transactions should serialize their signing calls.
		if (this.#pendingRequest) {
			return Promise.reject(new Error('A signing request is already pending.'));
		}

		return new Promise<Result>((resolve, reject) => {
			this.#pendingRequest = {
				id: crypto.randomUUID(),
				type,
				account,
				chain,
				data,
				resolve: resolve as (result: SigningResult) => void,
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
