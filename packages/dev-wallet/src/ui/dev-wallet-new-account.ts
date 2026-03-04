// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { SignerAdapter } from '../types.js';
import { actionButtonStyles, sharedStyles, stateStyles } from './styles.js';
import {
	emitEvent,
	formatAddress,
	getErrorMessage,
	isPairableAdapter,
	toggleSetItem,
} from './utils.js';
import './dev-wallet-dropdown.js';

interface AvailableAccount {
	adapterId: string;
	adapterName: string;
	address: string;
	scheme: string;
	alias?: string | null;
}

@customElement('dev-wallet-new-account')
export class DevWalletNewAccount extends LitElement {
	static override styles = [
		sharedStyles,
		actionButtonStyles,
		stateStyles,
		css`
			:host {
				display: block;
			}

			dialog:not([open]) {
				display: none;
			}

			dialog {
				width: 320px;
				max-width: calc(100vw - 32px);
				max-height: min(420px, 80vh);
				border-radius: var(--dev-wallet-radius-xl);
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				box-shadow: var(--dev-wallet-shadow-lg);
				padding: 20px;
				display: flex;
				flex-direction: column;
				color: inherit;
			}

			dialog::backdrop {
				background: color-mix(in oklab, oklch(0 0 0) 50%, transparent);
			}

			.dialog-title {
				font-size: 16px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
				margin-bottom: 16px;
			}

			.tabs {
				display: flex;
				gap: 4px;
				margin-bottom: 16px;
				background: var(--dev-wallet-secondary);
				border-radius: var(--dev-wallet-radius-sm);
				padding: 3px;
			}

			.tab {
				flex: 1;
				padding: 6px 12px;
				border-radius: var(--dev-wallet-radius-xs);
				font-size: 12px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-muted-foreground);
				text-align: center;
				transition: all 0.15s;
			}

			.tab.active {
				background: var(--dev-wallet-background);
				color: var(--dev-wallet-foreground);
				box-shadow: var(--dev-wallet-shadow-sm);
			}

			.tab:not(.active):hover {
				color: var(--dev-wallet-foreground);
			}

			.field {
				margin-bottom: 12px;
			}

			.field-label {
				display: block;
				font-size: 12px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-muted-foreground);
				margin-bottom: 4px;
			}

			.field-input {
				width: 100%;
				padding: 8px 10px;
				border-radius: var(--dev-wallet-radius-sm);
				border: 1px solid var(--dev-wallet-input);
				background: var(--dev-wallet-secondary);
				color: var(--dev-wallet-foreground);
				font-size: 14px;
				font-family: inherit;
				outline: none;
				box-sizing: border-box;
			}

			.field-input:focus {
				border-color: var(--dev-wallet-primary);
				outline: 2px solid color-mix(in oklab, var(--dev-wallet-ring) 50%, transparent);
				outline-offset: -1px;
			}

			.select-trigger {
				width: 100%;
				padding: 8px 10px;
				border-radius: var(--dev-wallet-radius-sm);
				border: 1px solid var(--dev-wallet-input);
				background: var(--dev-wallet-secondary);
				color: var(--dev-wallet-foreground);
				font-size: 14px;
				font-family: inherit;
				box-sizing: border-box;
				display: flex;
				align-items: center;
				justify-content: space-between;
				cursor: pointer;
				text-align: left;
			}

			.select-trigger:hover {
				border-color: var(--dev-wallet-primary);
			}

			.select-trigger .chevron {
				font-size: 10px;
				color: var(--dev-wallet-muted-foreground);
				transition: transform 0.15s;
			}

			.select-trigger.open .chevron {
				transform: rotate(180deg);
			}

			.select-option {
				width: 100%;
				padding: 8px 10px;
				font-size: 14px;
				font-family: inherit;
				color: var(--dev-wallet-foreground);
				background: transparent;
				text-align: left;
				cursor: pointer;
				transition: background 0.1s;
			}

			.select-option:hover {
				background: color-mix(in oklab, var(--dev-wallet-primary) 15%, transparent);
			}

			.select-option.selected {
				color: var(--dev-wallet-primary);
				font-weight: var(--dev-wallet-font-weight-medium);
			}

			.import-list {
				display: flex;
				flex-direction: column;
				gap: 4px;
				overflow-y: auto;
				max-height: 240px;
				min-height: 60px;
			}

			.import-item {
				display: flex;
				align-items: center;
				gap: 10px;
				padding: 8px 10px;
				border-radius: var(--dev-wallet-radius-sm);
				border: 1px solid var(--dev-wallet-border);
				background: var(--dev-wallet-secondary);
				width: 100%;
				text-align: left;
				transition: border-color 0.15s;
			}

			.import-item:hover {
				border-color: var(--dev-wallet-primary);
			}

			.import-item.selected {
				border-color: var(--dev-wallet-primary);
				background: color-mix(in oklab, var(--dev-wallet-primary) 10%, var(--dev-wallet-secondary));
			}

			.import-item:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.import-checkbox {
				width: 16px;
				height: 16px;
				border-radius: var(--dev-wallet-radius-2xs);
				border: 2px solid var(--dev-wallet-border);
				flex-shrink: 0;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 10px;
				color: var(--dev-wallet-primary-foreground);
				transition: all 0.15s;
			}

			.import-checkbox.checked {
				background: var(--dev-wallet-primary);
				border-color: var(--dev-wallet-primary);
			}

			.import-item-info {
				flex: 1;
				min-width: 0;
			}

			.import-item-label {
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-foreground);
			}

			.import-item-address {
				font-size: 11px;
				color: var(--dev-wallet-muted-foreground);
				font-family: var(--dev-wallet-font-mono);
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.import-item-badge {
				font-size: 10px;
				padding: 1px 6px;
				border-radius: var(--dev-wallet-radius-xs);
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				color: var(--dev-wallet-muted-foreground);
				font-weight: var(--dev-wallet-font-weight-medium);
				text-transform: uppercase;
				letter-spacing: 0.3px;
				white-space: nowrap;
				flex-shrink: 0;
			}

			.empty-state,
			.loading {
				padding: 20px;
			}

			.actions {
				margin-top: 16px;
			}

			.error {
				color: var(--dev-wallet-destructive);
				font-size: 12px;
				margin-top: 8px;
			}
		`,
	];

	@property({ attribute: false })
	adapters: SignerAdapter[] = [];

	@property({ type: Boolean })
	open = false;

	@state()
	private _mode: 'create' | 'import' = 'create';

	@state()
	private _label = '';

	@state()
	private _selectedAdapterId = '';

	@state()
	private _creating = false;

	@state()
	private _error: string | null = null;

	@state()
	private _availableAccounts: AvailableAccount[] = [];

	@state()
	private _loadingImports = false;

	@state()
	private _dropdownOpen = false;

	@state()
	private _selectedImports = new Set<string>();

	get #creatableAdapters(): SignerAdapter[] {
		return this.adapters.filter((a) => 'createAccount' in a && a.createAccount);
	}

	get #importableAdapters(): SignerAdapter[] {
		return this.adapters.filter(
			(a) =>
				'importAccount' in a &&
				a.importAccount &&
				'listAvailableAccounts' in a &&
				a.listAvailableAccounts &&
				// Skip adapters that require pairing but aren't paired yet
				(!isPairableAdapter(a) || a.isPaired),
		);
	}

	get #hasUnpairedImportableAdapters(): boolean {
		return this.adapters.some(
			(a) =>
				'importAccount' in a &&
				a.importAccount &&
				'listAvailableAccounts' in a &&
				a.listAvailableAccounts &&
				isPairableAdapter(a) &&
				!a.isPaired,
		);
	}

	override updated(changed: Map<string, unknown>) {
		if (changed.has('open')) {
			const dialog = this.shadowRoot?.querySelector('dialog');
			if (this.open && dialog && !dialog.open) {
				const canCreate = this.#creatableAdapters.length > 0;
				const canImport = this.#importableAdapters.length > 0;
				if (canImport && !canCreate) {
					this._mode = 'import';
				} else {
					this._mode = 'create';
				}
				if (canImport) {
					this.#loadAvailableAccounts();
				}
				dialog.showModal();
			} else if (!this.open && dialog?.open) {
				dialog.close();
			}
		}
	}

	override render() {
		const canCreate = this.#creatableAdapters.length > 0;
		const canImport = this.#importableAdapters.length > 0;
		const showTabs = canCreate && canImport;

		return html`
			<dialog part="dialog" @cancel=${this.#handleDialogCancel}>
				<div class="dialog-title">Add Account</div>
				${showTabs
					? html`
							<div class="tabs">
								<button
									class="tab ${this._mode === 'create' ? 'active' : ''}"
									@click=${() => (this._mode = 'create')}
								>
									Create
								</button>
								<button
									class="tab ${this._mode === 'import' ? 'active' : ''}"
									@click=${() => (this._mode = 'import')}
								>
									Import
								</button>
							</div>
						`
					: nothing}
				${this._mode === 'create' ? this.#renderCreateForm() : this.#renderImportList()}
				${this._error
					? html`<div class="error" part="error-message">${this._error}</div>`
					: nothing}
			</dialog>
		`;
	}

	#handleDialogCancel(e: Event) {
		e.preventDefault();
		if (!this._creating) {
			this.#close();
		}
	}

	#renderCreateForm() {
		const creatableAdapters = this.#creatableAdapters;
		const showPicker = creatableAdapters.length > 1;

		const selectedAdapter =
			creatableAdapters.find((a) => a.id === this._selectedAdapterId) ?? creatableAdapters[0];

		return html`
			${showPicker
				? html`
						<div class="field">
							<label class="field-label">Type</label>
							<dev-wallet-dropdown
								full-width
								.open=${this._dropdownOpen}
								@close=${() => (this._dropdownOpen = false)}
							>
								<button
									slot="trigger"
									class="select-trigger ${this._dropdownOpen ? 'open' : ''}"
									@click=${() => (this._dropdownOpen = !this._dropdownOpen)}
								>
									<span>${selectedAdapter?.name ?? 'Select...'}</span>
									<span class="chevron">▼</span>
								</button>
								<div slot="popover">
									${creatableAdapters.map(
										(a) => html`
											<button
												class="select-option ${a.id === (selectedAdapter?.id ?? '')
													? 'selected'
													: ''}"
												@click=${() => {
													this._selectedAdapterId = a.id;
													this._dropdownOpen = false;
													this._error = null;
												}}
											>
												${a.name}
											</button>
										`,
									)}
								</div>
							</dev-wallet-dropdown>
						</div>
					`
				: nothing}
			<div class="field">
				<label class="field-label">Label</label>
				<input
					class="field-input"
					part="label-input"
					type="text"
					placeholder="e.g. Test Account"
					.value=${this._label}
					@input=${this.#handleLabelInput}
					@keydown=${this.#handleKeydown}
				/>
			</div>
			<div class="actions">
				<button class="btn btn-cancel" part="cancel-button" @click=${this.#handleCancel}>
					Cancel
				</button>
				<button
					class="btn btn-create"
					part="create-button"
					?disabled=${this._creating}
					@click=${this.#handleCreate}
				>
					${this._creating ? 'Creating...' : 'Create'}
				</button>
			</div>
		`;
	}

	#renderImportList() {
		if (this._loadingImports) {
			return html`<div class="loading">Loading accounts...</div>
				<div class="actions">
					<button class="btn btn-cancel" part="cancel-button" @click=${this.#handleCancel}>
						Cancel
					</button>
				</div>`;
		}

		if (this._availableAccounts.length === 0) {
			return html`<div class="empty-state">
					${this.#hasUnpairedImportableAdapters
						? 'Open the token URL from your terminal to connect CLI accounts.'
						: 'No accounts available to import'}
				</div>
				<div class="actions">
					<button class="btn btn-cancel" part="cancel-button" @click=${this.#handleCancel}>
						Cancel
					</button>
				</div>`;
		}

		return html`
			<div class="import-list">
				${this._availableAccounts.map((account) => {
					const selected = this._selectedImports.has(account.address);
					return html`
						<button
							class="import-item ${selected ? 'selected' : ''}"
							role="checkbox"
							aria-checked="${selected}"
							?disabled=${this._creating}
							@click=${() => this.#toggleImportSelection(account.address)}
						>
							<span class="import-checkbox ${selected ? 'checked' : ''}"
								>${selected ? '✓' : ''}</span
							>
							<div class="import-item-info">
								<div class="import-item-label">
									${account.alias || formatAddress(account.address)}
								</div>
								<div class="import-item-address">${formatAddress(account.address)}</div>
							</div>
							<span class="import-item-badge">${account.scheme}</span>
						</button>
					`;
				})}
			</div>
			<div class="actions">
				<button class="btn btn-cancel" part="cancel-button" @click=${this.#handleCancel}>
					Cancel
				</button>
				<button
					class="btn btn-create"
					part="create-button"
					?disabled=${this._creating || this._selectedImports.size === 0}
					@click=${this.#handleImportSelected}
				>
					${this._creating
						? 'Importing...'
						: `Import${this._selectedImports.size > 0 ? ` (${this._selectedImports.size})` : ''}`}
				</button>
			</div>
		`;
	}

	async #loadAvailableAccounts() {
		this._loadingImports = true;
		this._availableAccounts = [];

		try {
			const results: AvailableAccount[] = [];
			for (const adapter of this.#importableAdapters) {
				const accounts = await adapter.listAvailableAccounts!();
				for (const account of accounts) {
					results.push({
						adapterId: adapter.id,
						adapterName: adapter.name,
						address: account.address,
						scheme: account.scheme,
						alias: 'alias' in account ? (account.alias as string | null) : null,
					});
				}
			}
			this._availableAccounts = results;
		} catch (error) {
			this._error = getErrorMessage(error, 'Failed to load accounts');
		} finally {
			this._loadingImports = false;
		}
	}

	#handleLabelInput(e: InputEvent) {
		this._label = (e.target as HTMLInputElement).value;
		this._error = null;
	}

	#handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !this._creating) {
			this.#handleCreate();
		} else if (e.key === 'Escape') {
			this.#close();
		}
	}

	#handleCancel() {
		this.#close();
	}

	async #handleCreate() {
		const creatableAdapters = this.#creatableAdapters;
		if (creatableAdapters.length === 0) return;

		const adapter =
			creatableAdapters.find((a) => a.id === this._selectedAdapterId) ?? creatableAdapters[0];
		if (!adapter?.createAccount) return;

		this._creating = true;
		this._error = null;

		try {
			const options: Record<string, unknown> = {};
			if (this._label.trim()) {
				options.label = this._label.trim();
			}
			await adapter.createAccount(options);
			this.#close();
			emitEvent(this, 'account-created');
		} catch (error) {
			this._error = getErrorMessage(error, 'Failed to create account');
		} finally {
			this._creating = false;
		}
	}

	#toggleImportSelection(address: string) {
		this._selectedImports = toggleSetItem(this._selectedImports, address);
	}

	async #handleImportSelected() {
		const selected = this._availableAccounts.filter((a) => this._selectedImports.has(a.address));
		if (selected.length === 0) return;

		this._creating = true;
		this._error = null;

		try {
			for (const account of selected) {
				const adapter = this.#importableAdapters.find((a) => a.id === account.adapterId);
				if (!adapter?.importAccount) continue;
				await adapter.importAccount({ address: account.address });
			}
			this.#close();
			emitEvent(this, 'account-created');
		} catch (error) {
			this._error = getErrorMessage(error, 'Failed to import account');
		} finally {
			this._creating = false;
		}
	}

	#close() {
		this._label = '';
		this._selectedAdapterId = '';
		this._error = null;
		this._availableAccounts = [];
		this._selectedImports = new Set();
		this._mode = 'create';
		this._dropdownOpen = false;
		// Don't mutate `this.open` — let the parent control it via the `close` event
		emitEvent(this, 'close');
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-new-account': DevWalletNewAccount;
	}
}
