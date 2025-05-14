// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import '@webcomponents/scoped-custom-element-registry';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import { WalletList } from './internal/wallet-list.js';
import { getDefaultStore } from '../store/index.js';
import type { DAppKitStore } from '../store/index.js';

@customElement('mysten-dapp-kit-connect-modal')
export class DAppKitConnectModal extends ScopedRegistryHost(LitElement) {
	static elementDefinitions = {
		'wallet-list': WalletList,
	};

	@storeProperty()
	store?: DAppKitStore;

	override willUpdate() {
		this.store ||= getDefaultStore();
	}

	override render() {
		return html`<div class="dapp-kit-connect-modal">
			<wallet-list></wallet-list>
			<div>${JSON.stringify(this.store?.$state.get(), null, 2) ?? 'No store'}</div>
		</div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'mysten-dapp-kit-connect-modal': DAppKitConnectModal;
	}
}
