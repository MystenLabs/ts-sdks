// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { when } from 'lit/directives/when.js';
import { html, LitElement } from 'lit';
import { formatAddress } from '@mysten/sui/utils';
import { property, state } from 'lit/decorators.js';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { copyIcon } from './icons/copy-icon.js';
import { Task } from '@lit/task';
import type { DAppKitCompatibleClient } from '../../core/types.js';
import { resolveNameServiceName } from '../../utils/name.js';
import { circleCheckIcon } from './icons/circle-check-icon.js';

export type AccountSelectedEvent = CustomEvent<{ account: UiWalletAccount }>;

export class AccountMenuItem extends LitElement {
	override createRenderRoot() {
		return this;
	}

	@property({ type: Object })
	account!: UiWalletAccount;

	@property({ type: Object })
	client!: DAppKitCompatibleClient;

	@property({ type: Boolean })
	selected = false;

	@state()
	private _wasCopySuccessful = false;

	#resolveNameTask = new Task(this, {
		args: () => [this.client, this.account.address],
		task: async ([client, address]) => resolveNameServiceName(client, address),
	});

	override connectedCallback() {
		super.connectedCallback();
		this.addEventListener('click', this.#accountSelected);
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.removeEventListener('click', this.#accountSelected);
	}

	override render() {
		return html`
			<div class="container" data-checked=${this.selected}>
				<input
					type="radio"
					name="wallet-address"
					tabindex="${this.selected ? '0' : '-1'}"
					value=${this.account.address}
					?checked=${this.selected}
					@change=${this.#accountSelected}
					class="radio-input"
					id=${this.account.address}
				/>
				<label class="content" for=${this.account.address}>
					${when(this.account.icon, (icon) => html`<img src=${icon} alt="" />`)}
					${this.#resolveNameTask.render({
						pending: this.#renderAccountInfo,
						complete: this.#renderAccountInfo,
						error: () => this.#renderAccountInfo(),
					})}
				</label>
				<button
					class="copy-address-button"
					@click=${this.#copyAddressToClipboard}
					aria-label="Copy address"
				>
					${this._wasCopySuccessful ? circleCheckIcon : copyIcon}
				</button>
			</div>
		`;
	}

	async #copyAddressToClipboard(event: Event) {
		event.stopPropagation();

		try {
			await navigator.clipboard.writeText(this.account.address);
			this._wasCopySuccessful = true;

			setTimeout(() => {
				this._wasCopySuccessful = false;
			}, 2000);
		} catch {
			// Do nothing here
		}
	}

	#renderAccountInfo = (name?: string | null) => {
		const { address, label } = this.account;
		const formattedAddress = formatAddress(address);
		const title = name || label;

		return html`<div class="account-info">
			<div class="account-title">${title || formattedAddress}</div>
			${when(title, () => html`<div class="account-subtitle">${formattedAddress}</div>`)}
		</div>`;
	};

	#accountSelected() {
		this.dispatchEvent(
			new CustomEvent<AccountSelectedEvent['detail']>('account-selected', {
				detail: { account: this.account },
				bubbles: true,
				composed: true,
			}),
		);
	}
}
