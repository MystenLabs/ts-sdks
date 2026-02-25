// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { SignerAdapter } from '../types.js';
import { sharedStyles } from './styles.js';
import { formatAddress } from './utils.js';
import './dev-wallet-new-account.js';

@customElement('dev-wallet-accounts')
export class DevWalletAccounts extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				display: block;
			}

			.accounts-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 12px;
			}

			.accounts-header h3 {
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-muted-foreground);
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}

			.add-btn {
				font-size: 12px;
				color: var(--dev-wallet-primary);
				padding: 4px 8px;
				border-radius: var(--dev-wallet-radius-sm);
			}

			.add-btn:hover {
				background: color-mix(in oklab, var(--dev-wallet-primary) 15%, transparent);
			}

			.account-list {
				display: flex;
				flex-direction: column;
				gap: 4px;
			}

			.account-item {
				display: flex;
				align-items: center;
				gap: 10px;
				padding: 10px 12px;
				border-radius: var(--dev-wallet-radius-sm);
				border: 1px solid var(--dev-wallet-border);
				background: var(--dev-wallet-secondary);
				width: 100%;
				text-align: left;
			}

			.account-item:hover {
				border-color: var(--dev-wallet-primary);
			}

			.account-item.active {
				border-color: var(--dev-wallet-primary);
				background: color-mix(in oklab, var(--dev-wallet-primary) 10%, var(--dev-wallet-secondary));
			}

			.account-avatar {
				width: 32px;
				height: 32px;
				border-radius: 50%;
				background: var(--dev-wallet-primary);
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 14px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-primary-foreground);
				flex-shrink: 0;
			}

			.account-info {
				flex: 1;
				min-width: 0;
			}

			.account-label {
				font-size: 14px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-foreground);
			}

			.account-address {
				font-size: 12px;
				color: var(--dev-wallet-muted-foreground);
				font-family: monospace;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.account-badge {
				font-size: 10px;
				padding: 1px 6px;
				border-radius: var(--dev-wallet-radius-xs);
				background: var(--dev-wallet-secondary);
				border: 1px solid var(--dev-wallet-border);
				color: var(--dev-wallet-muted-foreground);
				font-weight: var(--dev-wallet-font-weight-medium);
				text-transform: uppercase;
				letter-spacing: 0.3px;
				white-space: nowrap;
			}

			.empty-state {
				text-align: center;
				padding: 24px;
				color: var(--dev-wallet-muted-foreground);
				font-size: 14px;
			}
		`,
	];

	@property({ attribute: false })
	accounts: readonly ReadonlyWalletAccount[] = [];

	@property({ attribute: false })
	adapters: SignerAdapter[] = [];

	@property({ type: String })
	activeAddress = '';

	@state()
	private _dialogOpen = false;

	override render() {
		const canCreate = this.adapters.some((a) => 'createAccount' in a && a.createAccount);

		return html`
			<div class="accounts-header">
				<h3>Accounts</h3>
				${canCreate
					? html`<button class="add-btn" @click=${this.#openDialog}>+ Add</button>`
					: nothing}
			</div>
			${this.accounts.length === 0
				? html`<div class="empty-state">No accounts yet</div>`
				: html`
						<div class="account-list">
							${this.accounts.map(
								(account, index) => html`
									<button
										class="account-item ${account.address === this.activeAddress ? 'active' : ''}"
										@click=${() => this.#selectAccount(account)}
									>
										<div class="account-avatar">${index + 1}</div>
										<div class="account-info">
											<div class="account-label">
												${this.#getAccountLabel(account.address, index)}
												<span class="account-badge">${this.#getAdapterName(account.address)}</span>
											</div>
											<div class="account-address">${formatAddress(account.address)}</div>
										</div>
									</button>
								`,
							)}
						</div>
					`}
			<dev-wallet-new-account
				.adapters=${this.adapters}
				.open=${this._dialogOpen}
				@close=${this.#closeDialog}
			></dev-wallet-new-account>
		`;
	}

	#getAccountLabel(address: string, index: number): string {
		for (const adapter of this.adapters) {
			const managed = adapter.getAccount(address);
			if (managed) return managed.label;
		}
		return `Account ${index + 1}`;
	}

	#getAdapterName(address: string): string {
		for (const adapter of this.adapters) {
			if (adapter.getAccount(address)) return adapter.name;
		}
		return 'Unknown';
	}

	#selectAccount(account: ReadonlyWalletAccount) {
		this.dispatchEvent(
			new CustomEvent('account-selected', {
				detail: { account },
				bubbles: true,
				composed: true,
			}),
		);
	}

	#openDialog() {
		this._dialogOpen = true;
	}

	#closeDialog() {
		this._dialogOpen = false;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-accounts': DevWalletAccounts;
	}
}
