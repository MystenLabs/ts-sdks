// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSSReset } from '../../utils/css-reset.js';
import { Task } from '@lit/task';
import type { DappKitStore } from '../../store/index.js';

@customElement('dapp-kit-internal-connect')
export class DappKitInternalConnect extends LitElement {
	static override styles = [
		CSSReset,
		css`
			.container {
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				width: 100%;
			}

			.wallet-icon {
				object-fit: cover;
				width: 72px;
				height: 72px;
				border-radius: var(--radii-large);
			}

			.title {
				margin-top: 12px;
				font-size: var(--font-size-xlarge);
				font-weight: var(--font-weight-bold);
			}

			.connection-status {
				margin-top: 4px;
			}

			.retry-button-container {
				position: absolute;
				bottom: 20px;
				right: 20px;
			}

			.muted {
				color: var(--text-color-muted);
			}

			.connection-failed {
				color: var(--text-color-danger);
			}
		`,
	];

	@property({ attribute: false })
	accessor store!: DappKitStore;

	@property({ attribute: false })
	accessor selectedWallet!: WalletWithRequiredFeatures;

	#connectTask = new Task(this, {
		args: () => [this.selectedWallet],
		task: async ([selectedWallet]) => {
			return await this.store?.connectWallet({ wallet: selectedWallet });
		},
	});

	render() {
		return html`
			<div class="container">
				${this.selectedWallet.icon &&
				html`<img
					class="wallet-icon"
					src=${this.selectedWallet.icon}
					alt=${`${this.selectedWallet.name} logo`}
				></img>`}

				<h2 className="title">Opening ${this.selectedWallet.name}</h2>

				<div>
					${this.#connectTask.render({
						pending: () => html`<p class="muted">Confirm connection in the wallet...</p>`,
						error: () => html`<p class="connection-failed">Connection failed</p>`,
					})}
				</div>

				${this.#connectTask.render({
					error: () =>
						html`<div class="retry-button-container">
							<button type="button" @click=${() => this.#connectTask.run()}>
								Retry Connection
							</button>
						</div>`,
				})}
			</div>
		`;
	}
}
