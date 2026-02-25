// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { WalletRequest } from '../wallet/dev-wallet.js';
import { sharedStyles } from './styles.js';
import './dev-wallet-connect.js';
import './dev-wallet-signing.js';

/**
 * Popup request container that delegates to `<dev-wallet-connect>` or
 * `<dev-wallet-signing>` based on request type.
 *
 * Used as the top-level UI in the wallet popup window for dApp requests.
 * Dispatches `approve` and `reject` events to the parent.
 */
@customElement('dev-wallet-popup')
export class DevWalletPopup extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				display: flex;
				align-items: center;
				justify-content: center;
				min-height: 100vh;
				padding: 20px;
			}

			.popup-card {
				width: 360px;
				max-height: min(600px, 80vh);
				border-radius: var(--dev-wallet-radius-xl);
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				box-shadow: 0 8px 32px color-mix(in oklab, oklch(0 0 0) 40%, transparent);
				overflow: hidden;
				display: flex;
				flex-direction: column;
			}

			.popup-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 14px 16px;
				border-bottom: 1px solid var(--dev-wallet-border);
			}

			.popup-title {
				font-size: 15px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
			}

			.popup-body {
				flex: 1;
				overflow: hidden;
				display: flex;
				flex-direction: column;
			}
		`,
	];

	@property({ type: String })
	walletName = 'Dev Wallet';

	@property({ type: String })
	requestType:
		| 'connect'
		| 'sign-transaction'
		| 'sign-and-execute-transaction'
		| 'sign-personal-message' = 'connect';

	@property({ type: String })
	appName = '';

	@property({ type: String })
	appUrl = '';

	@property({ type: String })
	address = '';

	@property({ type: String })
	chain = '';

	@property({ attribute: false })
	data: string | Uint8Array | null = null;

	@property({ attribute: false })
	client: ClientWithCoreApi | null = null;

	override render() {
		return html`
			<div class="popup-card">
				<div class="popup-header">
					<span class="popup-title">${this.walletName}</span>
				</div>
				<div class="popup-body">
					${this.requestType === 'connect' ? this.#renderConnect() : this.#renderSigning()}
				</div>
			</div>
		`;
	}

	#renderConnect() {
		return html`
			<dev-wallet-connect .appName=${this.appName} .appUrl=${this.appUrl}></dev-wallet-connect>
		`;
	}

	#renderSigning() {
		const request: WalletRequest = {
			id: crypto.randomUUID(),
			type: this.requestType as WalletRequest['type'],
			account: {
				address: this.address,
				publicKey: new Uint8Array(0),
				chains: [],
				features: [],
			},
			chain: this.chain,
			data: this.data ?? '',
			resolve: () => {},
			reject: () => {},
		};

		return html`
			<dev-wallet-signing .request=${request} .client=${this.client}></dev-wallet-signing>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-popup': DevWalletPopup;
	}
}
