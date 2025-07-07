// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet } from '@wallet-standard/ui';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { styles } from './wallet-list-item.styles.js';

export type WalletSelectedEvent = CustomEvent<{ wallet: UiWallet }>;

export type InstallableWallet = {
	/**
	 * The human-readable name of the wallet (e.g., "Phantom", "MetaMask").
	 */
	name: string;

	/**
	 * The display icon for the wallet.
	 */
	icon: string;

	/**
	 * An installation link that redirects users to the appropriate
	 * platform-specific installation target, such as:
	 * - A mobile app store (iOS or Android)
	 * - A browser extension page (e.g., Chrome Web Store)
	 * - A wallet website with platform detection
	 */
	installUrl: string;
};

export type WalletItem =
	| { type: 'detected'; data: UiWallet }
	| { type: 'installable'; data: InstallableWallet };

export class WalletListItem extends LitElement {
	static override styles = styles;

	@property()
	wallet!: WalletItem;

	@property({ type: Boolean, reflect: true })
	override autofocus = false;

	override render() {
		const content = html`
			<img src=${this.wallet.data.icon} alt=${`${this.wallet.data.name} logo`} />
			<p>${this.wallet.data.name}</p>
		`;

		switch (this.wallet.type) {
			case 'detected':
				return html`
					<li>
						<button
							class="item"
							type="button"
							@click=${() => {
								this.dispatchEvent(
									new CustomEvent<WalletSelectedEvent['detail']>('wallet-selected', {
										detail: { wallet: this.wallet.data as UiWallet },
										bubbles: true,
										composed: true,
									}),
								);
							}}
							?autofocus=${this.autofocus}
						>
							${content}
						</button>
					</li>
				`;
			case 'installable':
				return html`
					<li>
						<a
							class="item"
							href=${this.wallet.data.installUrl}
							target="_blank"
							rel="noreferrer"
							?autofocus=${this.autofocus}
						>
							${content}
						</a>
					</li>
				`;
			default:
				throw new Error(`Encountered unknown wallet type: ${this.wallet}.`);
		}
	}
}
