// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { DevWallet } from '../wallet/dev-wallet.js';
import { connectDialogStyles, sharedStyles } from './styles.js';
import { WalletController } from './wallet-controller.js';

@customElement('dev-wallet-panel')
export class DevWalletPanel extends LitElement {
	static override styles = [
		sharedStyles,
		connectDialogStyles,
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
				box-shadow: var(--dev-wallet-shadow-md);
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

			.sidebar {
				position: absolute;
				bottom: 56px;
				right: 0;
				width: 360px;
				max-width: calc(100vw - 32px);
				max-height: 520px;
				border-radius: var(--dev-wallet-radius-xl);
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				box-shadow: var(--dev-wallet-shadow-lg);
				display: flex;
				flex-direction: column;
			}

			.sidebar-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 14px 16px;
				border-bottom: 1px solid var(--dev-wallet-border);
				position: relative;
				z-index: 1;
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
				overflow-x: hidden;
				flex: 1;
				min-height: 0;
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

	#ctrl = new WalletController(this);
	#hadPendingRequest = false;

	override willUpdate(changedProperties: Map<string, unknown>) {
		if (changedProperties.has('wallet')) {
			this.#ctrl.wallet = this.wallet;
		}
	}

	override updated() {
		// Refresh balances only when transitioning from having a pending request to not
		const hasPending = this.#ctrl.pendingRequest !== null;
		if (this.#hadPendingRequest && !hasPending) {
			this.updateComplete.then(() => {
				this.shadowRoot
					?.querySelector<
						import('./dev-wallet-balances.js').DevWalletBalances
					>('dev-wallet-balances')
					?.refresh();
			});
		}
		this.#hadPendingRequest = hasPending;

		const dialog = this.shadowRoot?.querySelector<HTMLDialogElement>('.connect-dialog');
		if (this.#ctrl.pendingConnect && dialog && !dialog.open) {
			dialog.showModal();
		} else if (!this.#ctrl.pendingConnect && dialog?.open) {
			dialog.close();
		}
	}

	override render() {
		return html`
			${this._isOpen ? this.#renderSidebar() : nothing}
			<button
				class="trigger"
				part="trigger"
				aria-label="Open Dev Wallet"
				@click=${this.#togglePanel}
			>
				${this.#walletIcon}
			</button>
			${this.#ctrl.renderSigningModal()} ${this.#ctrl.renderConnectPicker()}
		`;
	}

	#renderSidebar() {
		return html`
			<div class="sidebar" part="sidebar">
				<div class="sidebar-header">
					<span class="sidebar-title">${this.wallet?.name ?? 'Dev Wallet'}</span>
					${this.#ctrl.renderNetworkBadge()}
					<button
						class="close-btn"
						part="close-button"
						aria-label="Close"
						@click=${this.#togglePanel}
					>
						&times;
					</button>
				</div>
				<div class="sidebar-body">${this.#ctrl.renderTabContent()}</div>
				${this.#ctrl.renderTabBar()}
			</div>
		`;
	}

	get #walletIcon() {
		return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<rect x="2" y="6" width="20" height="14" rx="2.5" />
			<path d="M2 10h20" />
			<rect x="15" y="12" width="5" height="4" rx="1" />
			<circle cx="17.5" cy="14" r="0.5" fill="currentColor" stroke="none" />
		</svg>`;
	}

	#togglePanel() {
		this._isOpen = !this._isOpen;
		if (this._isOpen) {
			this.#ctrl.syncState();
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-panel': DevWalletPanel;
	}
}
