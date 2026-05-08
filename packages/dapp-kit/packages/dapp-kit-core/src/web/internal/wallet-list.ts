// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import type { UiWallet } from '@wallet-standard/ui';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { WalletListItem } from './wallet-list-item.js';
import { styles } from './wallet-list.styles.js';
import { Button } from './button.js';
import { downloadIcon } from './icons/download-icon.js';
import { arrowRightUpIcon } from './icons/arrow-right-up-icon.js';

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
					<div class="no-wallets-content">
						${downloadIcon}
						<h2 class="title">Install a wallet to get started on Sui</h2>
					</div>
					<internal-button class="wallet-cta" href="https://sui.io/get-started">
						Select a wallet to install ${arrowRightUpIcon}
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
