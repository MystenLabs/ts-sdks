// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet } from '@wallet-standard/ui';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { styles } from './connection-status.styles.js';

export class ConnectionStatus extends LitElement {
	static override styles = styles;

	@property({ type: Object })
	wallet!: UiWallet;

	@property({ type: String })
	title = '';

	@property({ type: String })
	copy = '';

	override render() {
		return html`
			<img class="logo" src=${this.wallet.icon} alt=${`${this.wallet.name} logo`} />
			<div class="container">
				<h3 class="title">${this.title}</h3>
				<p class="copy">${this.copy}</p>
			</div>
			<slot name="call-to-action"></slot>
		`;
	}
}
