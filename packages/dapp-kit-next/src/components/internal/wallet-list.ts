// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { getWalletUniqueIdentifier } from '../../utils/walletUtils.js';
import { CSSReset } from '../../utils/css-reset.js';

@customElement('dapp-kit-internal-wallet-list')
export class DappKitInternalWalletList extends LitElement {
	static override styles = [
		CSSReset,
		css`
			.wallet-list {
				display: flex;
				flex-direction: column;
				gap: 4px;
			}

			.wallet-list-item {
				display: flex;
				align-items: center;
				flex-grow: 1;
				padding: 8px;
				gap: 8px;
				border-radius: 16px;
			}

			.wallet-list-item:hover {
				background-color: var(--secondary-background-color);
			}

			.wallet-list-item--selected {
				background-color: var(--wallet-item-selected-color) !important;
				box-shadow: var(--shadow-wallet-item-selected);
			}

			.wallet-list-item-icon {
				width: 28px;
				height: 28px;
				flex-shrink: 0;
				object-fit: cover;
				border-radius: var(--radii-small);
			}
		`,
	];

	@property({ attribute: false })
	accessor wallets: WalletWithRequiredFeatures[] = [];

	@property({ attribute: false })
	accessor selectedWallet!: WalletWithRequiredFeatures;

	render() {
		return html`
			<ul class="wallet-list">
				<!-- TODO: Handle 0 wallets case: -->
				${this.wallets.map(
					(wallet) => html`
						<li>
							<button
								class=${classMap({
									'wallet-list-item': true,
									'wallet-list-item--selected': this.selectedWallet
										? getWalletUniqueIdentifier(this.selectedWallet) ===
											getWalletUniqueIdentifier(wallet)
										: false,
								})}
								type="button"
								@click=${() => {
									this.dispatchEvent(
										new CustomEvent('wallet-selected', {
											detail: { wallet },
										}),
									);
								}}
							>
									<img class="wallet-list-item-icon" src=${wallet.icon} alt=${`${wallet.name} logo`}></img>
									<div>${wallet.name}</div>
							</button>
						</li>
					`,
				)}
			</ul>
		`;
	}
}
