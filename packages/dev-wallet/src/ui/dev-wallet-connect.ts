// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { actionButtonStyles, sharedStyles } from './styles.js';
import { emitEvent, formatAddress, toggleSetItem } from './utils.js';

interface AccountInfo {
	address: string;
	label?: string;
}

/**
 * Connect approval UI shared between the embedded modal and standalone popup.
 *
 * Displays a list of accounts to select and Connect/Reject buttons.
 * When `appName` is provided (standalone popup context), shows app info.
 * Dispatches `approve` (with selected addresses) and `reject` events.
 */
@customElement('dev-wallet-connect')
export class DevWalletConnect extends LitElement {
	static override styles = [
		sharedStyles,
		actionButtonStyles,
		css`
			:host {
				display: flex;
				flex-direction: column;
				min-height: 0;
			}

			.connect-content {
				flex: 1;
				padding: 16px;
			}

			.connect-header {
				text-align: center;
				margin-bottom: 12px;
			}

			.connect-title {
				font-size: 14px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
			}

			.connect-desc {
				font-size: 12px;
				color: var(--dev-wallet-muted-foreground);
				margin-top: 4px;
			}

			.app-info {
				margin-top: 8px;
			}

			.app-name {
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-foreground);
				display: block;
			}

			.app-url {
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				word-break: break-all;
			}

			.account-list {
				max-height: 240px;
				overflow-y: auto;
			}

			.account-item {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 8px;
				border-radius: var(--dev-wallet-radius-md);
				cursor: pointer;
			}

			.account-item:hover {
				background: var(--dev-wallet-secondary);
			}

			.account-item input[type='checkbox'] {
				accent-color: var(--dev-wallet-primary);
			}

			.account-label {
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
			}

			.account-address {
				font-size: 11px;
				font-family: var(--dev-wallet-font-mono);
				color: var(--dev-wallet-muted-foreground);
			}

			.connect-footer {
				padding: 12px 16px;
				border-top: 1px solid var(--dev-wallet-border);
			}

			/* Override: connect uses --primary instead of --positive for approve */
			.btn-approve {
				background: var(--dev-wallet-primary);
			}

			.btn-approve:hover {
				background: oklab(from var(--dev-wallet-primary) calc(l - 0.03) a b);
			}

			.btn-approve:disabled {
				cursor: default;
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

	@property({ attribute: false })
	accounts: AccountInfo[] = [];

	@state()
	private _connecting = false;

	@state()
	private _error: string | null = null;

	@state()
	private _selectedAddresses: Set<string> = new Set();

	override willUpdate(changedProperties: Map<string, unknown>) {
		if (
			changedProperties.has('accounts') &&
			this.accounts.length > 0 &&
			this._selectedAddresses.size === 0
		) {
			this._selectedAddresses = new Set(this.accounts.map((a) => a.address));
		}
	}

	override render() {
		return html`
			<div class="connect-content">
				<div class="connect-header">
					<div class="connect-title">Connection Request</div>
					<div class="connect-desc">Select accounts to share with the app</div>
					${this.appName
						? html`
								<div class="app-info">
									<span class="app-name">${this.appName}</span>
									<span class="app-url">${this.appUrl}</span>
								</div>
							`
						: nothing}
				</div>
				${this.accounts.length > 0
					? html`
							<div class="account-list" part="account-list">
								${this.accounts.map(
									(account) => html`
										<label class="account-item">
											<input
												type="checkbox"
												.checked=${this._selectedAddresses.has(account.address)}
												@change=${() => this.#toggleAccount(account.address)}
											/>
											<div>
												${account.label
													? html`<div class="account-label">${account.label}</div>`
													: nothing}
												<div class="account-address">${formatAddress(account.address)}</div>
											</div>
										</label>
									`,
								)}
							</div>
						`
					: nothing}
			</div>
			<div class="connect-footer">
				<div class="actions">
					<button class="btn btn-reject" part="reject-button" @click=${this.#reject}>Reject</button>
					<button
						class="btn btn-approve"
						part="approve-button"
						?disabled=${this._connecting || this._selectedAddresses.size === 0}
						@click=${this.#approve}
					>
						${this._connecting ? 'Connecting...' : `Connect (${this._selectedAddresses.size})`}
					</button>
				</div>
				${this._error
					? html`<p class="error-message" part="error-message">${this._error}</p>`
					: nothing}
			</div>
		`;
	}

	/** Returns the currently selected addresses. */
	get selectedAddresses(): string[] {
		return [...this._selectedAddresses];
	}

	#toggleAccount(address: string) {
		this._selectedAddresses = toggleSetItem(this._selectedAddresses, address);
	}

	#approve() {
		this._connecting = true;
		this._error = null;
		emitEvent(this, 'approve', { selectedAddresses: this.selectedAddresses });
	}

	#reject() {
		emitEvent(this, 'reject');
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
