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
					<h2 class="title">Get Started with Sui</h2>
					<p class="copy-text">
						Start Exploring Web3 Your wallet is the gateway to all things Ethereum, the magical
						technology that makes it possible to explore web3.
					</p>
					<internal-button
						variant="secondary"
						href="https://blog.sui.io/unlock-sui-with-the-right-wallet/"
						>Choose your first wallet</internal-button
					>
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
