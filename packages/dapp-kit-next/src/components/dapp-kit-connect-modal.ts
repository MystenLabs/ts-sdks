// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import '@webcomponents/scoped-custom-element-registry';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import { WalletList } from './internal/wallet-list.js';
import { getDefaultInstance } from '../core/index.js';
import type { DAppKit } from '../core/index.js';
import { BaseModal } from './internal/base-modal.js';

@customElement('mysten-dapp-kit-connect-modal')
export class DAppKitConnectModal extends ScopedRegistryHost(BaseModal) {
	static elementDefinitions = {
		'wallet-list': WalletList,
	};

	@storeProperty()
	store?: DAppKit;

	override connectedCallback() {
		super.connectedCallback();
		this.store ||= getDefaultInstance();
	}

	override render() {
		return html`<dialog @click=${this.handleDialogClick}>
			<div @click=${this.handleContentClick}>
				hello
				<button @click=${this.close}>cancel</button>
			</div>
		</dialog>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'mysten-dapp-kit-connect-modal': DAppKitConnectModal;
	}
}
