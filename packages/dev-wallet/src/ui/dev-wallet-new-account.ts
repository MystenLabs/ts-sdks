// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { SignerAdapter } from '../types.js';
import { sharedStyles } from './styles.js';

@customElement('dev-wallet-new-account')
export class DevWalletNewAccount extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				display: block;
			}

			.overlay {
				position: fixed;
				inset: 0;
				background: color-mix(in oklab, oklch(0 0 0) 50%, transparent);
				z-index: 1000000;
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.dialog {
				width: 300px;
				border-radius: var(--dev-wallet-radius-xl);
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				box-shadow: 0 8px 32px color-mix(in oklab, oklch(0 0 0) 40%, transparent);
				padding: 20px;
			}

			.dialog-title {
				font-size: 16px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
				margin-bottom: 16px;
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

			.actions {
				display: flex;
				gap: 8px;
				margin-top: 16px;
			}

			.btn {
				flex: 1;
				padding: 10px 16px;
				border-radius: var(--dev-wallet-radius-md);
				font-size: 13px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				transition: background-color 0.15s;
			}

			.btn-cancel {
				background: var(--dev-wallet-secondary);
				color: var(--dev-wallet-foreground);
				border: 1px solid var(--dev-wallet-border);
			}

			.btn-cancel:hover {
				background: oklab(from var(--dev-wallet-secondary) calc(l - 0.02) a b);
			}

			.btn-create {
				background: var(--dev-wallet-primary);
				color: var(--dev-wallet-primary-foreground);
			}

			.btn-create:hover {
				background: oklab(from var(--dev-wallet-primary) calc(l - 0.03) a b);
			}

			.btn-create:disabled {
				opacity: 0.5;
				cursor: not-allowed;
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
	private _label = '';

	@state()
	private _selectedAdapterId = '';

	@state()
	private _creating = false;

	@state()
	private _error: string | null = null;

	get #creatableAdapters(): SignerAdapter[] {
		return this.adapters.filter((a) => 'createAccount' in a && a.createAccount);
	}

	override render() {
		if (!this.open) return nothing;

		const creatableAdapters = this.#creatableAdapters;
		const showPicker = creatableAdapters.length > 1;

		return html`
			<div class="overlay" @click=${this.#handleOverlayClick}>
				<div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
					<div class="dialog-title">New Account</div>
					${showPicker
						? html`
								<div class="field">
									<label class="field-label">Type</label>
									<select
										class="field-input"
										.value=${this._selectedAdapterId}
										@change=${this.#handleAdapterChange}
									>
										${creatableAdapters.map((a) => html`<option value=${a.id}>${a.name}</option>`)}
									</select>
								</div>
							`
						: nothing}
					<div class="field">
						<label class="field-label">Label</label>
						<input
							class="field-input"
							type="text"
							placeholder="e.g. Test Account"
							.value=${this._label}
							@input=${this.#handleLabelInput}
							@keydown=${this.#handleKeydown}
						/>
					</div>
					${this._error ? html`<div class="error">${this._error}</div>` : nothing}
					<div class="actions">
						<button class="btn btn-cancel" @click=${this.#handleCancel}>Cancel</button>
						<button class="btn btn-create" ?disabled=${this._creating} @click=${this.#handleCreate}>
							${this._creating ? 'Creating...' : 'Create'}
						</button>
					</div>
				</div>
			</div>
		`;
	}

	#handleOverlayClick() {
		if (!this._creating) {
			this.#close();
		}
	}

	#handleAdapterChange(e: Event) {
		this._selectedAdapterId = (e.target as HTMLSelectElement).value;
		this._error = null;
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
			this.dispatchEvent(new CustomEvent('account-created', { bubbles: true, composed: true }));
		} catch (error) {
			this._error = error instanceof Error ? error.message : 'Failed to create account';
		} finally {
			this._creating = false;
		}
	}

	#close() {
		this._label = '';
		this._selectedAdapterId = '';
		this._error = null;
		this.open = false;
		this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-new-account': DevWalletNewAccount;
	}
}
