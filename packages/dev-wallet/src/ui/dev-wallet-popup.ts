// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { PendingSigningRequest } from '../wallet/dev-wallet.js';
import { sharedStyles } from './styles.js';
import './dev-wallet-connect.js';
import './dev-wallet-signing.js';

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
				box-shadow: var(--dev-wallet-shadow-lg);
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
	walletName = 'Dev Wallet (Web)';

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
	accountLabel = '';

	@property({ type: String })
	chain = '';

	@property({ attribute: false })
	data: string | Uint8Array | null = null;

	@property({ attribute: false })
	client: ClientWithCoreApi | null = null;

	@property({ attribute: false })
	connectAccounts: Array<{ address: string; label?: string; adapterName?: string }> = [];

	@state()
	private _request: PendingSigningRequest | null = null;

	#requestId: string | null = null;

	override willUpdate(changed: Map<string, unknown>) {
		if (
			this.requestType !== 'connect' &&
			(changed.has('requestType') ||
				changed.has('address') ||
				changed.has('accountLabel') ||
				changed.has('chain') ||
				changed.has('data'))
		) {
			if (!this.#requestId) {
				this.#requestId = crypto.randomUUID();
			}
			this._request = {
				id: this.#requestId,
				type: this.requestType as PendingSigningRequest['type'],
				account: {
					address: this.address,
					label: this.accountLabel || undefined,
					publicKey: new Uint8Array(0),
					chains: [],
					features: [],
				},
				chain: this.chain,
				data: this.data ?? '',
			};
		}
	}

	override render() {
		return html`
			<div class="popup-card" part="card">
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
			<dev-wallet-connect
				exportparts="approve-button: connect-approve-button, reject-button: connect-reject-button, account-list: connect-account-list, error-message: connect-error-message"
				.appName=${this.appName}
				.appUrl=${this.appUrl}
				.accounts=${this.connectAccounts}
			></dev-wallet-connect>
		`;
	}

	#renderSigning() {
		if (!this._request) return html``;

		return html`
			<dev-wallet-signing
				exportparts="approve-button: signing-approve-button, reject-button: signing-reject-button, request-type: signing-request-type, empty-state: signing-empty-state, error-message: signing-error-message, footer: signing-footer"
				.request=${this._request}
				.client=${this.client}
			></dev-wallet-signing>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-popup': DevWalletPopup;
	}
}
