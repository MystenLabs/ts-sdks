// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { sharedStyles } from './styles.js';

/**
 * Connect approval UI for wallet popup requests.
 *
 * Displays the requesting app's name/URL and provides
 * Connect and Reject buttons. Dispatches `approve` and `reject` events.
 */
@customElement('dev-wallet-connect')
export class DevWalletConnect extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				display: flex;
				flex-direction: column;
				min-height: 0;
			}

			.connect-content {
				flex: 1;
				padding: 16px;
				text-align: center;
			}

			.connect-icon {
				width: 48px;
				height: 48px;
				border-radius: 50%;
				background: color-mix(in oklab, var(--dev-wallet-primary) 15%, transparent);
				color: var(--dev-wallet-primary);
				display: flex;
				align-items: center;
				justify-content: center;
				margin: 0 auto 16px;
			}

			.connect-icon svg {
				width: 24px;
				height: 24px;
			}

			.connect-title {
				font-size: 16px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
				margin-bottom: 12px;
			}

			.app-info {
				margin-bottom: 16px;
			}

			.app-name {
				font-size: 14px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-foreground);
				display: block;
				margin-bottom: 4px;
			}

			.app-url {
				font-size: 12px;
				color: var(--dev-wallet-muted-foreground);
				word-break: break-all;
			}

			.connect-desc {
				font-size: 13px;
				color: var(--dev-wallet-muted-foreground);
			}

			.connect-footer {
				padding: 12px 16px;
				border-top: 1px solid var(--dev-wallet-border);
			}

			.actions {
				display: flex;
				gap: 8px;
			}

			.btn {
				flex: 1;
				padding: 10px 16px;
				border-radius: var(--dev-wallet-radius-md);
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				transition: background-color 0.15s;
			}

			.btn-approve {
				background: var(--dev-wallet-primary);
				color: var(--dev-wallet-primary-foreground);
			}

			.btn-approve:hover {
				background: oklab(from var(--dev-wallet-primary) calc(l - 0.03) a b);
			}

			.btn-approve:disabled {
				opacity: 0.7;
				cursor: default;
			}

			.btn-reject {
				background: var(--dev-wallet-destructive);
				color: var(--dev-wallet-primary-foreground);
			}

			.btn-reject:hover {
				background: oklab(from var(--dev-wallet-destructive) calc(l - 0.05) a b);
			}

			.error-message {
				color: var(--dev-wallet-destructive);
				font-size: 12px;
				margin-top: 8px;
				text-align: center;
			}
		`,
	];

	@property({ type: String })
	appName = '';

	@property({ type: String })
	appUrl = '';

	@state()
	private _connecting = false;

	@state()
	private _error: string | null = null;

	override render() {
		return html`
			<div class="connect-content">
				<div class="connect-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path
							d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<path
							d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<h3 class="connect-title">Connection Request</h3>
				<div class="app-info">
					<span class="app-name">${this.appName}</span>
					<span class="app-url">${this.appUrl}</span>
				</div>
				<p class="connect-desc">This app wants to connect to your wallet.</p>
			</div>
			<div class="connect-footer">
				<div class="actions">
					<button class="btn btn-reject" @click=${this.#reject}>Reject</button>
					<button class="btn btn-approve" ?disabled=${this._connecting} @click=${this.#approve}>
						${this._connecting ? 'Connecting...' : 'Connect'}
					</button>
				</div>
				${this._error ? html`<p class="error-message">${this._error}</p>` : ''}
			</div>
		`;
	}

	#approve() {
		this._connecting = true;
		this._error = null;
		this.dispatchEvent(new CustomEvent('approve', { bubbles: true, composed: true }));
	}

	#reject() {
		this.dispatchEvent(new CustomEvent('reject', { bubbles: true, composed: true }));
	}

	/** Call this from the parent if the approve operation fails. */
	showError(message: string) {
		this._connecting = false;
		this._error = message;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-connect': DevWalletConnect;
	}
}
