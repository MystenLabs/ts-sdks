// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { html, nothing } from 'lit';
import type { ReactiveController, ReactiveControllerHost } from 'lit';

import type {
	DevWallet,
	PendingConnectRequest,
	PendingSigningRequest,
} from '../wallet/dev-wallet.js';
import './dev-wallet-account-selector.js';
import './dev-wallet-balances.js';
import './dev-wallet-connect.js';
import './dev-wallet-network-badge.js';
import './dev-wallet-objects.js';
import './dev-wallet-settings.js';
import './dev-wallet-signing-modal.js';
import type { TabId } from './dev-wallet-tab-bar.js';
import './dev-wallet-tab-bar.js';

/**
 * Lit Reactive Controller that encapsulates all shared wallet management logic
 * between `dev-wallet-panel` and `dev-wallet-standalone`.
 *
 * Both components delegate state management, event subscription, and shared
 * render fragments to this controller, keeping only layout-specific code.
 */
export class WalletController implements ReactiveController {
	host: ReactiveControllerHost;

	activeTab: TabId = 'assets';
	accounts: ReadonlyWalletAccount[] = [];
	activeAccountIndex = 0;
	pendingRequest: PendingSigningRequest | null = null;
	pendingConnect: PendingConnectRequest | null = null;

	#wallet: DevWallet | null = null;
	#unsubscribeEvents: (() => void) | null = null;
	#unsubscribeRequests: (() => void) | null = null;
	#unsubscribeConnect: (() => void) | null = null;

	constructor(host: ReactiveControllerHost) {
		this.host = host;
		host.addController(this);
	}

	get wallet(): DevWallet | null {
		return this.#wallet;
	}

	set wallet(value: DevWallet | null) {
		if (value === this.#wallet) return;
		this.#unsubscribe();
		this.#wallet = value;
		this.#subscribe();
		this.syncState();
	}

	hostConnected(): void {
		this.#subscribe();
		this.syncState();
	}

	hostDisconnected(): void {
		this.#unsubscribe();
	}

	// ── State sync ──────────────────────────────────────────────────────────

	syncState(): void {
		if (!this.#wallet) return;
		const newAccounts = this.#wallet.accounts;
		const newPending = this.#wallet.pendingRequest;

		const accountsChanged =
			newAccounts.length !== this.accounts.length ||
			newAccounts.some((a, i) => a.address !== this.accounts[i]?.address);
		const pendingChanged = newPending !== this.pendingRequest;

		if (!accountsChanged && !pendingChanged) return;

		if (accountsChanged) {
			this.accounts = [...newAccounts];
			// Clamp activeAccountIndex when accounts shrink
			if (this.activeAccountIndex >= newAccounts.length && newAccounts.length > 0) {
				this.activeAccountIndex = newAccounts.length - 1;
			}
		}
		this.pendingRequest = newPending;
		this.host.requestUpdate();
	}

	syncConnectState(): void {
		if (!this.#wallet) return;
		const newConnect = this.#wallet.pendingConnect;
		if (newConnect === this.pendingConnect) return;
		this.pendingConnect = newConnect;
		this.host.requestUpdate();
	}

	// ── Client resolution ───────────────────────────────────────────────────

	getActiveClient(): ClientWithCoreApi | null {
		if (!this.#wallet) return null;

		if (this.pendingRequest) {
			const network = this.pendingRequest.chain.split(':')[1];
			if (network) {
				try {
					return this.#wallet.getClient(network);
				} catch {
					return this.#wallet.activeClient;
				}
			}
		}

		return this.#wallet.activeClient;
	}

	// ── Event handlers ──────────────────────────────────────────────────────

	async handleApprove(): Promise<void> {
		if (!this.#wallet) return;
		try {
			await this.#wallet.approveRequest();
		} catch {
			// Error is propagated to the caller via the request's reject
		}
	}

	handleReject(): void {
		if (!this.#wallet) return;
		try {
			this.#wallet.rejectRequest();
		} catch {
			// No pending request
		}
	}

	handleTabChanged(e: CustomEvent<{ tab: TabId }>): void {
		this.activeTab = e.detail.tab;
		this.host.requestUpdate();
	}

	handleNetworkChanged(e: CustomEvent<{ network: string }>): void {
		this.#wallet?.setActiveNetwork(e.detail.network);
	}

	handleAccountSelected(e: CustomEvent<{ account: ReadonlyWalletAccount }>): void {
		const index = this.accounts.findIndex((a) => a.address === e.detail.account.address);
		if (index !== -1) {
			this.activeAccountIndex = index;
			this.host.requestUpdate();
		}
	}

	handleApproveConnect(e: CustomEvent<{ selectedAddresses: string[] }>): void {
		e.stopPropagation();
		if (!this.#wallet) return;
		try {
			this.#wallet.approveConnect(e.detail.selectedAddresses);
		} catch {
			// No pending connect
		}
	}

	handleRejectConnect(e?: Event): void {
		e?.preventDefault();
		if (e instanceof CustomEvent) e.stopPropagation();
		if (!this.#wallet) return;
		try {
			this.#wallet.rejectConnect();
		} catch {
			// No pending connect
		}
	}

	// ── Shared render fragments ─────────────────────────────────────────────

	renderAssetsTab() {
		const activeAddress = this.accounts[this.activeAccountIndex]?.address ?? '';

		return html`
			<div class="section">
				<dev-wallet-account-selector
					exportparts="trigger: selector-trigger, copy-button: selector-copy-button, empty-state: selector-empty-state"
					.accounts=${this.accounts}
					.adapters=${this.#wallet ? [...this.#wallet.adapters] : []}
					.activeAddress=${activeAddress}
					@account-selected=${(e: CustomEvent) => this.handleAccountSelected(e)}
				></dev-wallet-account-selector>
			</div>
			${activeAddress && this.#wallet
				? html`
						<div class="section">
							<dev-wallet-balances
								exportparts="balance-list, loading: balances-loading, error-message: balances-error-message, empty-state: balances-empty-state"
								.address=${activeAddress}
								.client=${this.getActiveClient()}
							></dev-wallet-balances>
						</div>
					`
				: nothing}
		`;
	}

	renderObjectsTab() {
		const activeAddress = this.accounts[this.activeAccountIndex]?.address ?? '';

		return html`
			<div class="section">
				<dev-wallet-account-selector
					exportparts="trigger: selector-trigger, copy-button: selector-copy-button, empty-state: selector-empty-state"
					.accounts=${this.accounts}
					.adapters=${this.#wallet ? [...this.#wallet.adapters] : []}
					.activeAddress=${activeAddress}
					@account-selected=${(e: CustomEvent) => this.handleAccountSelected(e)}
				></dev-wallet-account-selector>
			</div>
			<dev-wallet-objects
				exportparts="object-list, loading: objects-loading, error-message: objects-error-message, empty-state: objects-empty-state, load-more-button"
				.address=${activeAddress}
				.client=${this.getActiveClient()}
			></dev-wallet-objects>
		`;
	}

	renderSettingsTab() {
		const activeAddress = this.accounts[this.activeAccountIndex]?.address ?? '';

		return html`
			<dev-wallet-settings
				exportparts="accounts-account-list, accounts-add-button, accounts-empty-state"
				.wallet=${this.#wallet}
				.accounts=${this.accounts}
				.adapters=${this.#wallet ? [...this.#wallet.adapters] : []}
				.activeAddress=${activeAddress}
				@account-selected=${(e: CustomEvent) => this.handleAccountSelected(e)}
			></dev-wallet-settings>
		`;
	}

	renderTabContent() {
		if (this.activeTab === 'assets') return this.renderAssetsTab();
		if (this.activeTab === 'objects') return this.renderObjectsTab();
		if (this.activeTab === 'settings') return this.renderSettingsTab();
		return nothing;
	}

	renderSigningModal() {
		if (!this.pendingRequest) return nothing;

		return html`
			<dev-wallet-signing-modal
				exportparts="signing-approve-button, signing-reject-button, signing-request-type, signing-empty-state, signing-error-message, signing-footer, dialog: signing-dialog"
				.request=${this.pendingRequest}
				.client=${this.getActiveClient()}
				.walletName=${this.#wallet?.name ?? 'Dev Wallet'}
				@approve=${() => this.handleApprove()}
				@reject=${() => this.handleReject()}
			></dev-wallet-signing-modal>
		`;
	}

	renderConnectPicker() {
		if (!this.pendingConnect) return nothing;

		const allAccounts = this.#wallet
			? this.#wallet.adapters.flatMap((a) =>
					a.getAccounts().map((acc) => ({ address: acc.address, label: acc.label })),
				)
			: [];

		return html`
			<dialog class="connect-dialog" @cancel=${(e: Event) => this.handleRejectConnect(e)}>
				<div class="connect-dialog-header">
					<span class="connect-dialog-title">${this.#wallet?.name ?? 'Dev Wallet'}</span>
				</div>
				<dev-wallet-connect
					exportparts="approve-button: connect-approve-button, reject-button: connect-reject-button, account-list: connect-account-list, error-message: connect-error-message"
					.accounts=${allAccounts}
					@approve=${(e: CustomEvent) => this.handleApproveConnect(e)}
					@reject=${(e: Event) => this.handleRejectConnect(e)}
				></dev-wallet-connect>
			</dialog>
		`;
	}

	renderNetworkBadge() {
		if (!this.#wallet) return nothing;
		return html`
			<dev-wallet-network-badge
				exportparts="trigger: network-trigger"
				.active=${this.#wallet.activeNetwork}
				.networks=${this.#wallet.availableNetworks}
				@network-changed=${(e: CustomEvent) => this.handleNetworkChanged(e)}
			></dev-wallet-network-badge>
		`;
	}

	renderTabBar() {
		return html`
			<dev-wallet-tab-bar
				exportparts="tab-bar, tab"
				.active=${this.activeTab}
				@tab-changed=${(e: CustomEvent) => this.handleTabChanged(e)}
			></dev-wallet-tab-bar>
		`;
	}

	// ── Subscriptions ───────────────────────────────────────────────────────

	#subscribe(): void {
		if (!this.#wallet) return;
		this.#unsubscribeEvents = this.#wallet.features['standard:events'].on('change', () => {
			this.syncState();
		});
		this.#unsubscribeRequests = this.#wallet.onRequestChange(() => {
			this.syncState();
		});
		this.#unsubscribeConnect = this.#wallet.onConnectChange(() => {
			this.syncConnectState();
		});
	}

	#unsubscribe(): void {
		this.#unsubscribeEvents?.();
		this.#unsubscribeEvents = null;
		this.#unsubscribeRequests?.();
		this.#unsubscribeRequests = null;
		this.#unsubscribeConnect?.();
		this.#unsubscribeConnect = null;
	}
}
