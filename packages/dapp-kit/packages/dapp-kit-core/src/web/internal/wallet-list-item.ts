// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet } from '@wallet-standard/ui';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { styles } from './wallet-list-item.styles.js';

export type WalletSelectedEvent = CustomEvent<{ wallet: UiWallet }>;

export class WalletListItem extends LitElement {
	static override styles = styles;

	@property()
	wallet!: UiWallet;

	@property({ type: Boolean, reflect: true })
	override autofocus = false;

	override render() {
		return html`
			<li>
				<button
					type="button"
					class="wallet-button"
					@click=${this.#walletClicked}
					?autofocus=${this.autofocus}
				>
					<img src=${this.wallet.icon} alt=${`${this.wallet.name} logo`} />
					<p>${this.wallet.name}</p>
				</button>
			</li>
		`;
	}

	#walletClicked() {
		this.dispatchEvent(
			new CustomEvent<WalletSelectedEvent['detail']>('wallet-selected', {
				detail: { wallet: this.wallet },
				bubbles: true,
				composed: true,
			}),
		);
	}
}
