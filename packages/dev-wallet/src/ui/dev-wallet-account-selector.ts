// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { SignerAdapter } from '../types.js';
import { dropdownItemStyles, sharedStyles } from './styles.js';
import { CopyController } from './copy-controller.js';
import { emitEvent, findAdapterForAddress, formatAddress } from './utils.js';
import './dev-wallet-dropdown.js';

/** Short display names for adapter badges. */
const ADAPTER_SHORT_NAMES: Record<string, string> = {
	'WebCrypto Signer': 'WebCrypto',
	'Remote CLI Signer': 'CLI',
	'In-Memory Signer': 'Memory',
	'Passkey Signer': 'Passkey',
};

@customElement('dev-wallet-account-selector')
export class DevWalletAccountSelector extends LitElement {
	static override styles = [
		sharedStyles,
		dropdownItemStyles,
		css`
			:host {
				display: block;
			}

			.active-account {
				display: flex;
				align-items: center;
				gap: 8px;
				width: 100%;
				padding: 8px 10px;
				border-radius: var(--dev-wallet-radius-md);
				background: var(--dev-wallet-secondary);
				cursor: pointer;
				transition: background 0.15s;
			}

			.active-account:hover {
				background: var(--dev-wallet-border);
			}

			.avatar {
				width: 28px;
				height: 28px;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 12px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-primary-foreground);
				background: var(--dev-wallet-primary);
				flex-shrink: 0;
			}

			.account-info {
				flex: 1;
				min-width: 0;
			}

			.account-label {
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.account-address {
				font-size: 11px;
				font-family: var(--dev-wallet-font-mono);
				color: var(--dev-wallet-muted-foreground);
			}

			.copy-btn {
				width: 22px;
				height: 22px;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: var(--dev-wallet-radius-xs);
				color: var(--dev-wallet-muted-foreground);
				flex-shrink: 0;
				font-size: 12px;
			}

			.copy-btn:hover {
				background: var(--dev-wallet-border);
				color: var(--dev-wallet-foreground);
			}

			.copy-btn.copied {
				color: var(--dev-wallet-positive);
			}

			.chevron {
				width: 14px;
				height: 14px;
				color: var(--dev-wallet-muted-foreground);
				flex-shrink: 0;
			}

			.dropdown-item[aria-selected='true'] {
				background: color-mix(in oklab, var(--dev-wallet-primary) 10%, transparent);
			}

			.dropdown-item .avatar {
				width: 24px;
				height: 24px;
				font-size: 10px;
			}

			.dropdown-item .account-label {
				font-size: 12px;
			}

			.dropdown-item .account-address {
				font-size: 10px;
			}

			.dropdown-item .account-info {
				min-width: 0;
			}

			.dropdown-item .account-label {
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.adapter-badge {
				font-size: 9px;
				padding: 1px 4px;
				border-radius: var(--dev-wallet-radius-2xs);
				background: var(--dev-wallet-secondary);
				color: var(--dev-wallet-muted-foreground);
				white-space: nowrap;
			}

			.selector-row {
				display: flex;
				gap: 4px;
				align-items: center;
			}

			.selector-wrapper {
				flex: 1;
				min-width: 0;
				--dropdown-max-height: 240px;
			}

			.empty-state {
				padding: 16px;
				text-align: center;
				font-size: 12px;
				color: var(--dev-wallet-muted-foreground);
			}
		`,
	];

	@property({ attribute: false })
	accounts: ReadonlyWalletAccount[] = [];

	@property({ attribute: false })
	adapters: SignerAdapter[] = [];

	@property({ type: String })
	activeAddress = '';

	@state()
	private _open = false;

	#copy = new CopyController(this);

	override render() {
		const active = this.accounts.find((a) => a.address === this.activeAddress);

		if (!active) {
			return html`<div class="empty-state" part="empty-state">No account selected</div>`;
		}

		const label = this.#getLabel(active);
		const initial = (label[0] ?? '?').toUpperCase();

		return html`
			<div class="selector-row">
				<dev-wallet-dropdown
					full-width
					class="selector-wrapper"
					.open=${this._open}
					@close=${() => (this._open = false)}
				>
					<button
						slot="trigger"
						class="active-account"
						part="trigger"
						aria-expanded=${this._open}
						aria-haspopup="listbox"
						@click=${() => (this._open = !this._open)}
					>
						<span class="avatar">${initial}</span>
						<div class="account-info">
							<div class="account-label">${label}</div>
							<div class="account-address">${formatAddress(active.address)}</div>
						</div>
						<svg
							class="chevron"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<path d="M6 9l6 6 6-6" />
						</svg>
					</button>
					<div slot="popover" role="listbox" aria-label="Select account">
						${this.accounts.map((account) => {
							const accountLabel = this.#getLabel(account);
							const accountInitial = (accountLabel[0] ?? '?').toUpperCase();
							const adapterName = this.#getAdapterName(account.address);

							return html`
								<button
									class="dropdown-item"
									role="option"
									aria-selected=${account.address === this.activeAddress}
									@click=${() => this.#select(account)}
								>
									<span class="avatar">${accountInitial}</span>
									<div class="account-info">
										<div class="account-label">${accountLabel}</div>
										<div class="account-address">${formatAddress(account.address)}</div>
									</div>
									${adapterName ? html`<span class="adapter-badge">${adapterName}</span>` : nothing}
								</button>
							`;
						})}
					</div>
				</dev-wallet-dropdown>
				<button
					class="copy-btn ${this.#copy.isCopied(active.address) ? 'copied' : ''}"
					part="copy-button"
					title="Copy address"
					aria-label="Copy address"
					@click=${(e: Event) => {
						e.stopPropagation();
						this.#copy.copy(active.address);
					}}
				>
					${this.#copy.isCopied(active.address) ? '\u2713' : '\u2398'}
				</button>
			</div>
		`;
	}

	#getLabel(account: ReadonlyWalletAccount): string {
		return account.label ?? `Account ${account.address.slice(0, 8)}`;
	}

	#getAdapterName(address: string): string | null {
		const adapter = findAdapterForAddress(this.adapters, address);
		if (!adapter) return null;
		return ADAPTER_SHORT_NAMES[adapter.name] ?? adapter.name;
	}

	#select(account: ReadonlyWalletAccount) {
		this._open = false;
		emitEvent(this, 'account-selected', { account });
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-account-selector': DevWalletAccountSelector;
	}
}
