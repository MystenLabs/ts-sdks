// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import '@webcomponents/scoped-custom-element-registry';

import { html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import { getDefaultInstance } from '../core/index.js';
import type { DAppKit } from '../core/index.js';
import type { DAppKitConnectModalOptions } from './dapp-kit-connect-modal.js';
import { DAppKitConnectModal } from './dapp-kit-connect-modal.js';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { PrimaryButton } from './internal/button/primary-button.js';
import { sharedStyles } from './styles/index.js';

@customElement('mysten-dapp-kit-connect-button')
export class DAppKitConnectButton extends ScopedRegistryHost(LitElement) {
	static elementDefinitions = {
		'primary-button': PrimaryButton,
		'mysten-dapp-kit-connect-modal': DAppKitConnectModal,
	};

	static override styles = sharedStyles;

	@property({ type: Object })
	modalOptions?: DAppKitConnectModalOptions;

	@storeProperty()
	instance?: DAppKit;

	@query('mysten-dapp-kit-connect-modal')
	private readonly _modal!: DAppKitConnectModal;

	override connectedCallback() {
		super.connectedCallback();
		this.instance ||= getDefaultInstance();
	}

	override render() {
		const connection = this.instance!.stores.$connection.get();
		console.log(connection);
		return connection.isConnected
			? html`<div class="dropdown">TODO</div>`
			: html`<primary-button @click=${this.#openModal}>
						<slot>Connect Wallet</slot>
					</primary-button>
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
