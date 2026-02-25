// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { DevWallet } from '../wallet/dev-wallet.js';
import { sharedStyles } from './styles.js';
import './dev-wallet-accounts.js';
import './dev-wallet-balances.js';
import './dev-wallet-signing-modal.js';

@customElement('dev-wallet-panel')
export class DevWalletPanel extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				display: block;
				position: fixed;
				bottom: 16px;
				right: 16px;
				z-index: 999999;
				font-size: 14px;
			}

			.trigger {
				width: 48px;
				height: 48px;
				border-radius: 50%;
				background: var(--dev-wallet-primary);
				color: var(--dev-wallet-primary-foreground);
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 4px 12px color-mix(in oklab, oklch(0 0 0) 30%, transparent);
				transition: transform 0.15s;
				position: relative;
			}

			.trigger:hover {
				transform: scale(1.05);
			}

			.trigger svg {
				width: 24px;
				height: 24px;
			}

			.badge {
				position: absolute;
				top: -2px;
				right: -2px;
				width: 12px;
				height: 12px;
				border-radius: 50%;
				background: var(--dev-wallet-warning);
				border: 2px solid var(--dev-wallet-background);
			}

			.sidebar {
				position: absolute;
				bottom: 56px;
				right: 0;
				width: 320px;
				max-height: 480px;
				border-radius: var(--dev-wallet-radius-xl);
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				box-shadow: 0 8px 32px color-mix(in oklab, oklch(0 0 0) 40%, transparent);
				overflow: hidden;
				display: flex;
				flex-direction: column;
			}

			.sidebar-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 14px 16px;
				border-bottom: 1px solid var(--dev-wallet-border);
			}

			.sidebar-title {
				font-size: 15px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
			}

			.close-btn {
				font-size: 18px;
				color: var(--dev-wallet-muted-foreground);
				width: 28px;
				height: 28px;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: var(--dev-wallet-radius-xs);
			}

			.close-btn:hover {
				background: var(--dev-wallet-secondary);
			}

			.sidebar-body {
				padding: 16px;
				overflow-y: auto;
				flex: 1;
			}

			.section {
				margin-bottom: 16px;
			}

			.section:last-child {
				margin-bottom: 0;
			}
		`,
	];

	@property({ attribute: false })
	wallet: DevWallet | null = null;

	@state()
	private _isOpen = false;

	@state()
	private _accounts: import('@mysten/wallet-standard').ReadonlyWalletAccount[] = [];

	@state()
	private _activeAccountIndex = 0;

	@state()
	private _pendingRequest: import('../wallet/dev-wallet.js').WalletRequest | null = null;

	#unsubscribeEvents: (() => void) | null = null;
	#unsubscribeRequests: (() => void) | null = null;
	#wasOpenBeforeRequest = false;

	override connectedCallback() {
		super.connectedCallback();
		this.#subscribe();
		this.#syncState();
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#unsubscribe();
	}

	override willUpdate(changedProperties: Map<string, unknown>) {
		if (changedProperties.has('wallet')) {
			this.#unsubscribe();
			this.#subscribe();
			this.#syncState();
		}
	}

	#subscribe() {
		if (!this.wallet) return;
		this.#unsubscribeEvents = this.wallet.features['standard:events'].on('change', () => {
			this.#syncState();
		});
		this.#unsubscribeRequests = this.wallet.onRequestChange(() => {
			this.#syncState();
		});
	}

	#unsubscribe() {
		if (this.#unsubscribeEvents) {
			this.#unsubscribeEvents();
			this.#unsubscribeEvents = null;
		}
		if (this.#unsubscribeRequests) {
			this.#unsubscribeRequests();
			this.#unsubscribeRequests = null;
		}
	}

	override render() {
		const hasPending = this._pendingRequest !== null;

		return html`
			${this._isOpen && !hasPending ? this.#renderSidebar() : nothing}
			<button class="trigger" @click=${this.#togglePanel}>
				${this.#walletIcon} ${hasPending ? html`<span class="badge"></span>` : nothing}
			</button>
			${hasPending
				? html`
						<dev-wallet-signing-modal
							.request=${this._pendingRequest}
							.client=${this.#getActiveClient()}
							.walletName=${this.wallet?.name ?? 'Dev Wallet'}
							@approve=${this.#handleApprove}
							@reject=${this.#handleReject}
						></dev-wallet-signing-modal>
					`
				: nothing}
		`;
	}

	#renderSidebar() {
		return html`
			<div class="sidebar">
				<div class="sidebar-header">
					<span class="sidebar-title">${this.wallet?.name ?? 'Dev Wallet'}</span>
					<button class="close-btn" @click=${this.#togglePanel}>&times;</button>
				</div>
				<div class="sidebar-body">
					${this._accounts.length > 0 && this.wallet
						? html`
								<div class="section">
									<dev-wallet-balances
										.address=${this._accounts[this._activeAccountIndex]?.address ?? ''}
										.client=${this.#getActiveClient()}
									></dev-wallet-balances>
								</div>
							`
						: nothing}
					<div class="section">
						<dev-wallet-accounts
							.accounts=${this._accounts}
							.adapters=${this.wallet ? [...this.wallet.adapters] : []}
							.activeAddress=${this._accounts[this._activeAccountIndex]?.address ?? ''}
							@account-selected=${this.#handleAccountSelected}
						></dev-wallet-accounts>
					</div>
				</div>
			</div>
		`;
	}

	get #walletIcon() {
		return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="2" y="4" width="20" height="16" rx="2" />
			<path d="M16 12h.01" />
		</svg>`;
	}

	#togglePanel() {
		this._isOpen = !this._isOpen;
		if (this._isOpen) {
			this.#syncState();
		}
	}

	#syncState() {
		if (!this.wallet) return;
		this._accounts = [...this.wallet.accounts];

		const prevPending = this._pendingRequest;
		const newPending = this.wallet.pendingRequest;
		this._pendingRequest = newPending;

		if (!prevPending && newPending) {
			// Request just arrived — remember sidebar state
			this.#wasOpenBeforeRequest = this._isOpen;
		} else if (prevPending && !newPending) {
			// Request just resolved — restore sidebar state and refresh balances
			this._isOpen = this.#wasOpenBeforeRequest;
			this.updateComplete.then(() => {
				this.shadowRoot
					?.querySelector<import('./dev-wallet-balances.js').DevWalletBalances>(
						'dev-wallet-balances',
					)
					?.refresh();
			});
		}
	}

	#getActiveClient(): ClientWithCoreApi | null {
		if (!this.wallet) return null;
		const clients = this.wallet.clients;

		// Use the chain from the pending request when available
		if (this._pendingRequest) {
			const network = this._pendingRequest.chain.split(':')[1];
			if (network && clients[network]) {
				return clients[network];
			}
		}

		// Fallback: first available client
		return Object.values(clients)[0] ?? null;
	}

	async #handleApprove() {
		if (!this.wallet) return;
		try {
			await this.wallet.approveRequest();
		} catch {
			// Error is propagated to the caller via the request's reject
		}
	}

	#handleReject() {
		if (!this.wallet) return;
		try {
			this.wallet.rejectRequest();
		} catch {
			// No pending request
		}
	}

	#handleAccountSelected(
		e: CustomEvent<{ account: import('@mysten/wallet-standard').ReadonlyWalletAccount }>,
	) {
		const index = this._accounts.findIndex((a) => a.address === e.detail.account.address);
		if (index !== -1) {
			this._activeAccountIndex = index;
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-panel': DevWalletPanel;
	}
}
