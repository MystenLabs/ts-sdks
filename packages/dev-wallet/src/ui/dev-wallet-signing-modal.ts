// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { WalletRequest } from '../wallet/dev-wallet.js';
import { sharedStyles } from './styles.js';
import './dev-wallet-signing.js';

/**
 * A centered modal overlay for signing requests.
 *
 * Renders a backdrop and centered dialog containing the
 * `<dev-wallet-signing>` component. Dispatches `approve` and
 * `reject` events to the parent.
 */
@customElement('dev-wallet-signing-modal')
export class DevWalletSigningModal extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				display: block;
			}

			.overlay {
				position: fixed;
				inset: 0;
				background: color-mix(in oklab, oklch(0 0 0) 50%, transparent);
				z-index: 1000000;
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.modal {
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

			.modal-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 14px 16px;
				border-bottom: 1px solid var(--dev-wallet-border);
			}

			.modal-title {
				font-size: 15px;
				font-weight: var(--dev-wallet-font-weight-semibold);
				color: var(--dev-wallet-foreground);
			}

			.modal-body {
				flex: 1;
				overflow: hidden;
				display: flex;
				flex-direction: column;
			}
		`,
	];

	@property({ attribute: false })
	request: WalletRequest | null = null;

	@property({ attribute: false })
	client: ClientWithCoreApi | null = null;

	@property({ type: String })
	walletName = 'Dev Wallet';

	#boundKeyHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			this.dispatchEvent(new CustomEvent('reject', { bubbles: true, composed: true }));
		}
	};

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener('keydown', this.#boundKeyHandler);
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener('keydown', this.#boundKeyHandler);
	}

	override render() {
		if (!this.request) return nothing;

		return html`
			<div class="overlay">
				<div class="modal">
					<div class="modal-header">
						<span class="modal-title">${this.walletName}</span>
					</div>
					<div class="modal-body">
						<dev-wallet-signing
							.request=${this.request}
							.client=${this.client}
							@approve=${this.#handleApprove}
							@reject=${this.#handleReject}
						></dev-wallet-signing>
					</div>
				</div>
			</div>
		`;
	}

	#handleApprove(e: Event) {
		// Stop the composed signing event from also reaching the parent
		e.stopPropagation();
		this.dispatchEvent(new CustomEvent('approve', { bubbles: true, composed: true }));
	}

	#handleReject(e: Event) {
		e.stopPropagation();
		this.dispatchEvent(new CustomEvent('reject', { bubbles: true, composed: true }));
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-signing-modal': DevWalletSigningModal;
	}
}
