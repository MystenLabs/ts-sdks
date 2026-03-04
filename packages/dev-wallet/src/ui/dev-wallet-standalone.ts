// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { DevWallet } from '../wallet/dev-wallet.js';
import { connectDialogStyles, sharedStyles } from './styles.js';
import { WalletController } from './wallet-controller.js';

@customElement('dev-wallet-standalone')
export class DevWalletStandalone extends LitElement {
	static override styles = [
		sharedStyles,
		connectDialogStyles,
		css`
			:host {
				display: flex;
				justify-content: center;
				padding: 24px 16px;
				min-height: 100vh;
				box-sizing: border-box;
			}

			.card {
				width: 100%;
				max-width: 480px;
				border-radius: var(--dev-wallet-radius-xl);
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				box-shadow: var(--dev-wallet-shadow-lg);
				overflow: hidden;
				display: flex;
				flex-direction: column;
				height: min(640px, calc(100vh - 48px));
			}

			.card-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 16px 20px;
				border-bottom: 1px solid var(--dev-wallet-border);
			}

			.card-title {
				font-size: 17px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
			}

			.header-right {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.status-dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				background: var(--dev-wallet-status-connected);
			}

			.status-text {
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
			}

			.card-body {
				padding: 16px 20px;
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

	/** When set, the settings tab shows a bookmarklet section pointing to this origin. */
	@property({ type: String })
	bookmarkletOrigin = '';

	#ctrl = new WalletController(this);

	override willUpdate(changedProperties: Map<string, unknown>) {
		if (changedProperties.has('wallet')) {
			this.#ctrl.wallet = this.wallet;
		}
		if (changedProperties.has('bookmarkletOrigin')) {
			this.#ctrl.bookmarkletOrigin = this.bookmarkletOrigin;
		}
	}

	override updated() {
		const dialog = this.shadowRoot?.querySelector<HTMLDialogElement>('.connect-dialog');
		if (this.#ctrl.pendingConnect && dialog && !dialog.open) {
			dialog.showModal();
		} else if (!this.#ctrl.pendingConnect && dialog?.open) {
			dialog.close();
		}
	}

	override render() {
		return html`
			<div class="card" part="card">
				<div class="card-header">
					<span class="card-title">${this.wallet?.name ?? 'Dev Wallet'}</span>
					<div class="header-right">
						${this.#ctrl.renderNetworkBadge()}
						<span class="status-dot"></span>
						<span class="status-text">Running</span>
					</div>
				</div>
				<div class="card-body">${this.#ctrl.renderTabContent()}</div>
				${this.#ctrl.renderTabBar()}
			</div>
			${this.#ctrl.renderSigningModal()} ${this.#ctrl.renderConnectPicker()}
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-standalone': DevWalletStandalone;
	}
}
