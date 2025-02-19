// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PropertyValues } from 'lit';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { createDappKitStore } from '../store/index.js';
import type { DappKitStore } from '../store/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { CSSReset } from '../utils/css-reset.js';
import { StoreController } from '@nanostores/lit';
import type { DappKitStoreState } from '../store/state.js';
import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { classMap } from 'lit/directives/class-map.js';

import './internal/wallet-list.js';
import './internal/connect.js';

/**
 * TODO: Write docs
 */
@customElement('dapp-kit-connect-modal')
export class DappKitConnectModal extends LitElement {
	static styles = [
		CSSReset,
		css`
			dialog {
				background-color: var(--primary-background-color);
				border-radius: var(--radii-large);
				color: var(--body-color);
				overflow: hidden;
				min-height: 50vh;
				max-height: 85vh;
				max-width: 700px;
				width: 100%;
			}

			dialog::backdrop {
				background: var(--modal-backdrop-background);
				backdrop-filter: var(--modal-backdrop-filter);
			}

			dialog[open] {
				display: flex;
				flex-direction: column;
			}

			.content {
				flex: 1;
				display: flex;
				flex-direction: column;
				height: 100%;
				width: 100%;
			}

			@media (min-width: 768px) {
				.content {
					flex-direction: row;
				}
			}

			h2 {
				font-size: var(--font-size-large);
				font-weight: var(--font-weight-bold);
			}

			.title {
				padding-left: 8px;
			}

			.view-container {
				display: none;
				padding: 20px;
				flex-grow: 1;

				@media (min-width: 768px) {
					display: flex;
				}
			}

			.view-container--selected {
				display: flex;
			}

			.back-button-container {
				position: absolute;
				top: 20px;
				left: 20px;

				@media (min-width: 768px) {
					display: none;
				}
			}

			.close-button-container {
				position: absolute;
				top: 16px;
				right: 16px;
			}

			.wallet-list-content {
				display: flex;
				flex-direction: column;
				flex-grow: 1;
				gap: 24px;
				padding: 20px;
				background-color: var(--primary-background-color);

				@media (min-width: 768px) {
					background-color: var(--secondary-background-color);
				}
			}

			.wallet-list-container {
				display: flex;
				justify-content: space-between;
				flex-direction: column;
				flex-grow: 1;

				@media (min-width: 768px) {
					flex-direction: row;
					flex-basis: 240px;
					flex-grow: 0;
					flex-shrink: 0;
				}
			}

			.wallet-list-container--view-selected {
				display: none;

				@media (min-width: 768px) {
					display: flex;
				}
			}

			.view-content {
				display: flex;
				flex-direction: column;
				gap: 24px;
				width: 100%;
				height: 100%;
			}

			.view-content-body {
				flex: 1;
			}

			.view-header {
				text-align: center;
			}
		`,
	];

	@property({ attribute: false })
	accessor store!: DappKitStore;

	@property({ type: Boolean })
	accessor open = false;

	@query('dialog')
	accessor #dialog!: HTMLDialogElement;

	@state()
	accessor #selectedWallet: WalletWithRequiredFeatures | null = null;

	#storeController: StoreController<DappKitStoreState> | null = null;

	updated(changedProperties: PropertyValues<this>) {
		if (changedProperties.has('store')) {
			// @ts-expect-error: Unsubscribe is not publicly exposed.
			this.#storeController?.unsubscribe?.();
			this.#storeController = new StoreController(this, this.store.atoms.$state);
		}

		if (changedProperties.has('open')) {
			if (this.open) {
				this.#dialog.showModal();
			} else {
				this.#dialog.close();
			}
		}
	}

	render() {
		const handleClose = () => {
			this.dispatchEvent(new CustomEvent('close'));
		};

		return html`
			<dialog
				part="dialog"
				@cancel=${() => {
					handleClose();
				}}
				@click=${(e: MouseEvent) => {
					if (e.target === e.currentTarget) {
						handleClose();
					}
				}}
			>
				<div class="content">
					<div
						class=${classMap({
							'wallet-list-container': true,
							'wallet-list-container--view-selected': !!this.#selectedWallet,
						})}
					>
						<div class="wallet-list-content">
							<h2 part="title" class="title">Connect a Wallet</h2>

							<dapp-kit-internal-wallet-list
								.wallets=${this.#storeController?.value.wallets ?? []}
								.selectedWallet=${this.#selectedWallet!}
								@wallet-selected=${(e: CustomEvent) => {
									this.#selectedWallet = e.detail.wallet;
								}}
							></dapp-kit-internal-wallet-list>
						</div>
					</div>

					<div
						class=${classMap({
							'view-container': true,
							'view-container--selected': !!this.#selectedWallet,
						})}
					>
						<div class="view-content">
							<h2 class="view-header">What is a Wallet</h2>

							${this.#selectedWallet
								? html`<dapp-kit-internal-connect
										.store=${this.store}
										.selectedWallet=${this.#selectedWallet}
									></dapp-kit-internal-connect>`
								: nothing}
						</div>
					</div>

					<div class="close-button-container">
						<button
							type="button"
							part="close"
							aria-label="close"
							formnovalidate
							@click=${() => {
								handleClose();
							}}
						>
							Close
						</button>
					</div>
				</div>
			</dialog>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dapp-kit-connect-modal': DappKitConnectModal;
	}
}
