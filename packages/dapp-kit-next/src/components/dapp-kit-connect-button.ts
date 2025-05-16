// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import '@webcomponents/scoped-custom-element-registry';

import { html, LitElement } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import { getDefaultInstance } from '../core/index.js';
import type { DAppKit } from '../core/index.js';
import type { DAppKitConnectModal } from './dapp-kit-connect-modal.js';

@customElement('mysten-dapp-kit-connect-button')
export class DAppKitConnectButton extends LitElement {
	@storeProperty()
	store?: DAppKit;

	@query('mysten-dapp-kit-connect-modal')
	private readonly _modal!: DAppKitConnectModal;

	override connectedCallback() {
		super.connectedCallback();
		this.store ||= getDefaultInstance();
	}

	override render() {
		return html`
			<button @click=${this.#openModal}>Connect</button>
			<mysten-dapp-kit-connect-modal .store=${this.store}></mysten-dapp-kit-connect-modal>
		`;
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
