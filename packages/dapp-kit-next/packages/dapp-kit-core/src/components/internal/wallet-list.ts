// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import type { UiWallet } from '@wallet-standard/ui';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { WalletListItem } from './wallet-list-item.js';
import { styles } from './wallet-list.styles.js';
import { Button } from './button.js';

export class WalletList extends ScopedRegistryHost(LitElement) {
	static elementDefinitions = {
		'wallet-list-item': WalletListItem,
		'internal-button': Button,
	};

	static override styles = styles;

	@property({ type: Object })
	wallets: UiWallet[] = [];

	override render() {
		return this.wallets.length === 0
			? html`<div class="no-wallets-container">
					<h2 class="title">No wallets installed</h2>
					<p class="copy-text">Lorem ipsum TODO</p>
					<internal-button class="wallet-cta" href="https://sui.io/get-started">
						Choose a Wallet
					</internal-button>
				</div>`
			: html`<ul class="wallet-list">
					${this.wallets.map(
						(wallet, index) =>
							html`<wallet-list-item
								.wallet=${wallet}
								?autofocus=${index === 0}
							></wallet-list-item>`,
					)}
				</ul>`;
	}
}
