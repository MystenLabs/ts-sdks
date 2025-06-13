// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { when } from 'lit/directives/when.js';
import { html, LitElement } from 'lit';
import { formatAddress } from '@mysten/sui/utils';
import { property } from 'lit/decorators.js';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { checkIcon } from './icons/check-icon.js';
import { styles } from './connected-account-menu-item.styles.js';

export type AccountSelectedEvent = CustomEvent<{ account: UiWalletAccount }>;

export class AccountMenuItem extends LitElement {
	static override styles = styles;

	static shadowRootOptions = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	@property({ type: String, reflect: true })
	role = 'menuitemradio' as const;

	@property({ type: Number, reflect: true })
	tabIndex = -1;

	@property({ type: Object })
	account!: UiWalletAccount;

	@property({ type: Boolean })
	selected = false;

	connectedCallback() {
		super.connectedCallback();
		this.addEventListener('click', this.#accountClicked);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.removeEventListener('click', this.#accountClicked);
	}

	override render() {
		return html`<li role=${this.role} tabindex=${this.tabIndex} aria-checked="${this.selected}">
			${formatAddress(this.account.address)} ${when(this.selected, () => checkIcon)}
		</li>`;
	}

	#accountClicked() {
		this.dispatchEvent(
			new CustomEvent<AccountSelectedEvent['detail']>('account-selected', {
				detail: { account: this.account },
				bubbles: true,
				composed: true,
			}),
		);
	}
}
