// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import '@webcomponents/scoped-custom-element-registry';

import { html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import type { DAppKitConnectModalOptions } from './dapp-kit-connect-modal.js';
import { DAppKitConnectModal } from './dapp-kit-connect-modal.js';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { Button } from './internal/button.js';
import { sharedStyles } from './styles/index.js';
import type { RegisteredDAppKit } from '../types.js';
import { ConnectedAccountMenu } from './internal/connected-account-menu.js';
import type { AccountSelectedEvent } from './internal/connected-account-menu-item.js';

@customElement('mysten-dapp-kit-connect-button')
export class DAppKitConnectButton extends ScopedRegistryHost(LitElement) {
	static elementDefinitions = {
		'internal-button': Button,
		'mysten-dapp-kit-connect-modal': DAppKitConnectModal,
		'connected-account-menu': ConnectedAccountMenu,
	};

	static override shadowRootOptions = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	static override styles = sharedStyles;

	@property({ type: Object })
	modalOptions?: DAppKitConnectModalOptions;

	@storeProperty()
	instance!: RegisteredDAppKit;

	@query('mysten-dapp-kit-connect-modal')
	private readonly _modal!: DAppKitConnectModal;

	override render() {
		const connection = this.instance.stores.$connection.get();
		const client = this.instance.stores.$currentClient.get();

		return connection.account
			? html`<connected-account-menu
					.connection=${connection}
					.client=${client}
					@account-selected=${(event: AccountSelectedEvent) => {
						this.instance!.switchAccount({ account: event.detail.account });
					}}
					@disconnect-click=${() => {
						this.instance!.disconnectWallet();
					}}
					@manage-connection-click=${() => {
						this.instance!.connectWallet({ wallet: connection.wallet });
					}}
				></connected-account-menu>`
			: html`<internal-button @click=${this.#openModal}>
						<slot>Connect Wallet</slot>
					</internal-button>
					<mysten-dapp-kit-connect-modal
						.instance=${this.instance}
						.filterFn=${this.modalOptions?.filterFn}
						.sortFn=${this.modalOptions?.sortFn}
					></mysten-dapp-kit-connect-modal>`;
	}

	#openModal() {
		this._modal.show();
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'mysten-dapp-kit-connect-button': DAppKitConnectButton;
	}
}
