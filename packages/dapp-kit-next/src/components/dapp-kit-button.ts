// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PropertyValues } from 'lit';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StoreController } from '@nanostores/lit';
import { createDappKitStore } from '../store/index.js';
import type { DappKitStore } from '../store/index.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import type { DappKitStoreState } from '../store/state.js';

import './dapp-kit-connect-modal.js';
import { CSSReset } from '../utils/css-reset.js';
import { Task } from '@lit/task';
import { formatAddress } from '@mysten/sui/utils';
import type { WalletAccount } from '@mysten/wallet-standard';

/**
 * TODO: Write docs
 */
@customElement('dapp-kit-button')
export class DappKitButton extends LitElement {
	static override styles = [CSSReset, css``];

	@state()
	accessor open = false;

	@property({ attribute: false })
	accessor store: DappKitStore = createDappKitStore({
		client: new SuiClient({ url: getFullnodeUrl('mainnet') }),
	});

	#storeController: StoreController<DappKitStoreState> | null = null;
	updated(changedProperties: PropertyValues<this>) {
		if (changedProperties.has('store')) {
			// @ts-expect-error: Unsubscribe is not publicly exposed.
			this.#storeController?.unsubscribe?.();
			this.#storeController = new StoreController(this, this.store.atoms.$state);
		}
	}

	storeController: StoreController<DappKitStoreState> = new StoreController(
		this,
		this.store.atoms.$state,
	);

	currentAccount = new StoreController(this, this.store.atoms.$currentAccount);

	#domain = new Task(this, {
		args: () => [this.storeController.value.currentAccount],
		task: async ([currentAccount]) => {
			if (!currentAccount) return null;

			if (currentAccount.label) return currentAccount.label;

			const domain = await this.store.atoms.$client.get().resolveNameServiceNames({
				address: currentAccount.address,
				limit: 1,
			});

			return domain.data[0] || formatAddress(currentAccount.address);
		},
	});

	getDisplayAddress(account: WalletAccount) {
		return account.label || formatAddress(account.address);
	}

	override render() {
		return html`
			${this.currentAccount.value
				? html`
						<button
							part="account-button"
							@click=${async () => {
								await this.store.disconnectWallet();
							}}
						>
							<slot name="account">
								${this.#domain.render({
									pending: () =>
										html`${this.getDisplayAddress(this.storeController.value.currentAccount!)}`,
									error: () =>
										html`${this.getDisplayAddress(this.storeController.value.currentAccount!)}`,
									complete: (value) => html`${value}`,
								})}
							</slot>
						</button>
					`
				: html`
						<button part="connect-button" @click=${() => (this.open = true)}>
							<slot name="connect">Connect</slot>
						</button>

						<dapp-kit-connect-modal
							?open=${this.open}
							.store=${this.store}
							@close=${() => (this.open = false)}
						></dapp-kit-connect-modal>
					`}
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dapp-kit-button': DappKitButton;
	}
}
