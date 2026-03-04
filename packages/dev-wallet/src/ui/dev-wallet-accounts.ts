// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { SignerAdapter } from '../types.js';
import { CopyController } from './copy-controller.js';
import { actionButtonStyles, sectionHeaderStyles, sharedStyles } from './styles.js';
import { emitEvent, findAdapterForAddress, formatAddress, getErrorMessage } from './utils.js';
import './dev-wallet-new-account.js';

@customElement('dev-wallet-accounts')
export class DevWalletAccounts extends LitElement {
	static override styles = [
		sharedStyles,
		sectionHeaderStyles,
		actionButtonStyles,
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

			.accounts-header .section-header {
				margin-bottom: 0;
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
				font-family: var(--dev-wallet-font-mono);
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
				cursor: pointer;
				border-radius: var(--dev-wallet-radius-2xs);
				padding: 1px 2px;
				transition: background 0.15s;
			}

			.account-address:hover {
				background: color-mix(in oklab, var(--dev-wallet-primary) 15%, transparent);
			}

			.account-address.copied {
				color: var(--dev-wallet-positive);
			}

			.account-label-row {
				display: flex;
				align-items: center;
				gap: 4px;
			}

			.edit-label-btn {
				width: 18px;
				height: 18px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				border-radius: var(--dev-wallet-radius-2xs);
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				opacity: 0;
				transition: opacity 0.15s;
			}

			.account-item:hover .edit-label-btn {
				opacity: 1;
			}

			.edit-label-btn:hover {
				background: var(--dev-wallet-border);
				color: var(--dev-wallet-foreground);
			}

			.edit-label-input {
				padding: 2px 6px;
				border-radius: var(--dev-wallet-radius-2xs);
				border: 1px solid var(--dev-wallet-primary);
				background: var(--dev-wallet-background);
				color: var(--dev-wallet-foreground);
				font-size: 13px;
				font-family: inherit;
				outline: none;
				width: 100%;
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

			.delete-btn {
				width: 18px;
				height: 18px;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				border-radius: var(--dev-wallet-radius-2xs);
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				opacity: 0;
				transition: opacity 0.15s;
				flex-shrink: 0;
			}

			.account-item:hover .delete-btn {
				opacity: 1;
			}

			.delete-btn:hover {
				background: color-mix(in oklab, var(--dev-wallet-destructive) 20%, transparent);
				color: var(--dev-wallet-destructive);
			}

			.confirm-dialog:not([open]) {
				display: none;
			}

			.confirm-dialog {
				width: 300px;
				max-width: calc(100vw - 32px);
				border-radius: var(--dev-wallet-radius-xl);
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				box-shadow: var(--dev-wallet-shadow-lg);
				padding: 20px;
				display: flex;
				flex-direction: column;
				color: inherit;
			}

			.confirm-dialog::backdrop {
				background: color-mix(in oklab, oklch(0 0 0) 50%, transparent);
			}

			.confirm-title {
				font-size: 16px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
				margin-bottom: 12px;
			}

			.confirm-body {
				font-size: 13px;
				color: var(--dev-wallet-muted-foreground);
				margin-bottom: 8px;
				line-height: 1.4;
			}

			.confirm-account {
				padding: 8px 10px;
				border-radius: var(--dev-wallet-radius-sm);
				background: var(--dev-wallet-secondary);
				border: 1px solid var(--dev-wallet-border);
				margin-bottom: 16px;
			}

			.confirm-account-label {
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-foreground);
			}

			.confirm-account-address {
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				font-family: var(--dev-wallet-font-mono);
			}

			.confirm-actions {
				display: flex;
				gap: 8px;
			}

			.confirm-error {
				color: var(--dev-wallet-destructive);
				font-size: 12px;
				margin-bottom: 8px;
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

	#copy = new CopyController(this);

	@state()
	private _editingAddress: string | null = null;

	@state()
	private _editingLabel = '';

	@state()
	private _confirmDeleteAddress: string | null = null;

	@state()
	private _deleting = false;

	@state()
	private _deleteError: string | null = null;

	override render() {
		const canAdd = this.adapters.some(
			(a) =>
				('createAccount' in a && a.createAccount) ||
				('importAccount' in a &&
					a.importAccount &&
					'listAvailableAccounts' in a &&
					a.listAvailableAccounts),
		);

		return html`
			<div class="accounts-header">
				<h3 class="section-header">Accounts</h3>
				${canAdd
					? html`<button class="add-btn" part="add-button" @click=${this.#openDialog}>
							+ Add
						</button>`
					: nothing}
			</div>
			${this.accounts.length === 0
				? html`<div class="empty-state" part="empty-state">No accounts yet</div>`
				: html`
						<div
							class="account-list"
							part="account-list"
							role="listbox"
							aria-label="Wallet accounts"
						>
							${this.accounts.map(
								(account, index) => html`
									<button
										class="account-item ${account.address === this.activeAddress ? 'active' : ''}"
										role="option"
										aria-selected=${account.address === this.activeAddress}
										@click=${() => this.#selectAccount(account)}
									>
										<div class="account-avatar">${index + 1}</div>
										<div class="account-info">
											${this._editingAddress === account.address
												? html`<input
														class="edit-label-input"
														type="text"
														aria-label="Rename account"
														.value=${this._editingLabel}
														@input=${(e: InputEvent) => {
															this._editingLabel = (e.target as HTMLInputElement).value;
														}}
														@keydown=${(e: KeyboardEvent) => {
															e.stopPropagation();
															if (e.key === 'Enter') this.#saveLabel(account.address);
															if (e.key === 'Escape') this.#cancelEditLabel();
														}}
														@click=${(e: Event) => e.stopPropagation()}
													/>`
												: html`<div class="account-label-row">
														<span class="account-label">
															${this.#getAccountLabel(account.address, index)}
														</span>
														<span class="account-badge"
															>${this.#getAdapterName(account.address)}</span
														>
														${this.#canRename(account.address)
															? html`<button
																	class="edit-label-btn"
																	title="Rename"
																	aria-label="Rename account"
																	@click=${(e: Event) => {
																		e.stopPropagation();
																		this.#startEditLabel(account.address, index);
																	}}
																>
																	&#9998;
																</button>`
															: nothing}
													</div>`}
											<div
												class="account-address ${this.#copy.isCopied(account.address)
													? 'copied'
													: ''}"
												title="Click to copy"
												role="button"
												tabindex="0"
												aria-label="Copy address"
												@click=${(e: Event) => {
													e.stopPropagation();
													this.#copy.copy(account.address);
												}}
												@keydown=${(e: KeyboardEvent) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														e.stopPropagation();
														this.#copy.copy(account.address);
													}
												}}
											>
												${this.#copy.isCopied(account.address)
													? 'Copied!'
													: formatAddress(account.address)}
											</div>
										</div>
										${this.#canRemove(account.address)
											? html`<button
													class="delete-btn"
													title="Remove account"
													aria-label="Remove account"
													@click=${(e: Event) => {
														e.stopPropagation();
														this.#promptDelete(account.address);
													}}
												>
													&#128465;
												</button>`
											: nothing}
									</button>
								`,
							)}
						</div>
					`}
			${this.#renderConfirmDialog()}
			<dev-wallet-new-account
				.adapters=${this.adapters}
				.open=${this._dialogOpen}
				@close=${this.#closeDialog}
			></dev-wallet-new-account>
		`;
	}

	#getAccountLabel(address: string, index: number): string {
		const adapter = findAdapterForAddress(this.adapters, address);
		if (!adapter) return `Account ${index + 1}`;
		const managed = adapter.getAccount(address);
		return managed?.label ?? `Account ${index + 1}`;
	}

	#canRename(address: string): boolean {
		const adapter = findAdapterForAddress(this.adapters, address);
		return !!(adapter && adapter.renameAccount);
	}

	#getAdapterName(address: string): string {
		return findAdapterForAddress(this.adapters, address)?.name ?? 'Unknown';
	}

	#selectAccount(account: ReadonlyWalletAccount) {
		emitEvent(this, 'account-selected', { account });
	}

	#startEditLabel(address: string, index: number) {
		this._editingAddress = address;
		this._editingLabel = this.#getAccountLabel(address, index);
	}

	async #saveLabel(address: string) {
		const label = this._editingLabel.trim();
		if (!label) {
			this.#cancelEditLabel();
			return;
		}
		try {
			for (const adapter of this.adapters) {
				if (adapter.getAccount(address) && adapter.renameAccount) {
					await adapter.renameAccount(address, label);
					break;
				}
			}
		} catch (e) {
			console.error('[dev-wallet] rename failed:', e);
		}
		this._editingAddress = null;
		this._editingLabel = '';
		emitEvent(this, 'account-renamed', { address, label });
	}

	#cancelEditLabel() {
		this._editingAddress = null;
		this._editingLabel = '';
	}

	#canRemove(address: string): boolean {
		const adapter = findAdapterForAddress(this.adapters, address);
		return !!(adapter && adapter.removeAccount);
	}

	#isImportedAccount(address: string): boolean {
		const adapter = findAdapterForAddress(this.adapters, address);
		if (!adapter) return false;
		return !('createAccount' in adapter && adapter.createAccount);
	}

	#promptDelete(address: string) {
		this._confirmDeleteAddress = address;
		this._deleteError = null;
		this.updateComplete.then(() => {
			const dialog = this.shadowRoot?.querySelector<HTMLDialogElement>('.confirm-dialog');
			if (dialog && !dialog.open) dialog.showModal();
		});
	}

	#cancelDelete() {
		const dialog = this.shadowRoot?.querySelector<HTMLDialogElement>('.confirm-dialog');
		if (dialog?.open) dialog.close();
		this._confirmDeleteAddress = null;
		this._deleting = false;
		this._deleteError = null;
	}

	async #confirmDelete() {
		const address = this._confirmDeleteAddress;
		if (!address) return;

		this._deleting = true;
		this._deleteError = null;

		try {
			const adapter = findAdapterForAddress(this.adapters, address);
			if (!adapter?.removeAccount) throw new Error('Adapter does not support removal');
			const removed = await adapter.removeAccount(address);
			if (!removed) throw new Error('Account not found');
			this.#cancelDelete();
			emitEvent(this, 'account-removed', { address });
		} catch (error) {
			this._deleteError = getErrorMessage(error, 'Failed to remove account');
			this._deleting = false;
		}
	}

	#renderConfirmDialog() {
		if (!this._confirmDeleteAddress) return nothing;

		const address = this._confirmDeleteAddress;
		const index = this.accounts.findIndex((a) => a.address === address);
		const label = index >= 0 ? this.#getAccountLabel(address, index) : 'Unknown';
		const imported = this.#isImportedAccount(address);

		return html`
			<dialog
				class="confirm-dialog"
				@cancel=${(e: Event) => {
					e.preventDefault();
					this.#cancelDelete();
				}}
			>
				<div class="confirm-title">Remove Account</div>
				<div class="confirm-body">
					${imported
						? 'This will remove the imported account from your wallet. You can re-import it later.'
						: 'This will permanently delete this account and its keys. This cannot be undone.'}
				</div>
				<div class="confirm-account">
					<div class="confirm-account-label">${label}</div>
					<div class="confirm-account-address">${formatAddress(address)}</div>
				</div>
				${this._deleteError ? html`<div class="confirm-error">${this._deleteError}</div>` : nothing}
				<div class="confirm-actions">
					<button class="btn btn-cancel" ?disabled=${this._deleting} @click=${this.#cancelDelete}>
						Cancel
					</button>
					<button class="btn btn-reject" ?disabled=${this._deleting} @click=${this.#confirmDelete}>
						${this._deleting ? 'Removing...' : 'Remove'}
					</button>
				</div>
			</dialog>
		`;
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
