// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import '@webcomponents/scoped-custom-element-registry';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import { WalletList } from './internal/wallet-list.js';
import { getDefaultInstance } from '../core/index.js';
import type { DAppKit } from '../core/index.js';

@customElement('mysten-dapp-kit-connect-modal')
export class DAppKitConnectModal extends ScopedRegistryHost(LitElement) {
	static elementDefinitions = {
		'wallet-list': WalletList,
	};

	@storeProperty()
	instance?: DAppKit;

	override connectedCallback() {
		this.instance ||= getDefaultInstance();
	}

	override render() {
		return html`<div class="dapp-kit-connect-modal">
			<wallet-list></wallet-list>
			<div>${JSON.stringify(this.instance?.stores.$wallets.get(), null, 2)}</div>
		</div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'mysten-dapp-kit-connect-modal': DAppKitConnectModal;
	}
}
