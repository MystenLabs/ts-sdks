// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import '@webcomponents/scoped-custom-element-registry';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import { WalletList } from './internal/wallet-list.js';
import { getDefaultInstance } from '../core/index.js';
import type { DAppKit } from '../core/index.js';
import { BaseModal } from './internal/base-modal.js';
import type { UiWallet } from '@wallet-standard/ui';
import { closeIcon } from './templates/close-icon.js';
import { backIcon } from './templates/back-icon.js';
import type { WalletClickedEvent } from './internal/wallet-list-item.js';
import { ConnectionStatus } from './internal/connection-status.js';
import {
	isWalletStandardError,
	WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED,
} from '@mysten/wallet-standard';
import { PrimaryButton } from './internal/button/primary-button.js';
import { SecondaryButton } from './internal/button/secondary-button.js';
import { IconButton } from './internal/button/icon-button.js';
import { styles } from './dapp-kit-connect-modal.styles.js';

type ModalViewState =
	| { view: 'wallet-selection' }
	| { view: 'connecting'; wallet: UiWallet }
	| { view: 'error'; wallet: UiWallet; error: unknown };

export type DAppKitConnectModalOptions = {
	filterFn?: (value: UiWallet, index: number, array: UiWallet[]) => UiWallet;
	sortFn?: (a: UiWallet, b: UiWallet) => number;
};

@customElement('mysten-dapp-kit-connect-modal')
export class DAppKitConnectModal
	extends ScopedRegistryHost(BaseModal)
	implements DAppKitConnectModalOptions
{
	static override styles = styles;

	static elementDefinitions = {
		'wallet-list': WalletList,
		'primary-button': PrimaryButton,
		'secondary-button': SecondaryButton,
		'icon-button': IconButton,
		'connection-status': ConnectionStatus,
	};

	@storeProperty()
	instance?: DAppKit;

	@state()
	state: ModalViewState = { view: 'wallet-selection' };

	@property({ attribute: false })
	filterFn?: (value: UiWallet, index: number, array: UiWallet[]) => UiWallet;

	@property({ attribute: false })
	sortFn?: (a: UiWallet, b: UiWallet) => number;

	override connectedCallback() {
		super.connectedCallback();
		this.instance ||= getDefaultInstance();
	}

	override render() {
		const showBackButton = this.state.view === 'connecting' || this.state.view === 'error';

		return html`<dialog @click=${this.handleDialogClick} @close=${this.#resetSelection}>
			<div class="content" @click=${this.handleContentClick}>
				<div class="connect-header">
					${showBackButton
						? html`<icon-button
								class="back-button"
								aria-label="Go back"
								@click=${this.#resetSelection}
							>
								${backIcon}
							</icon-button>`
						: nothing}
					<h2 class="title">${this.#getModalTitle()}</h2>
					<icon-button class="close-button" aria-label="Close" @click=${() => this.close('cancel')}>
						${closeIcon}
					</icon-button>
				</div>
				${this.#renderModalView()}
			</div>
		</dialog>`;
	}

	#renderModalView() {
		switch (this.state.view) {
			case 'wallet-selection':
				return html`<wallet-list
					.wallets=${this.#getWallets}
					@wallet-clicked=${async (event: WalletClickedEvent) => {
						this.#attemptConnect(event.detail.wallet);
					}}
				></wallet-list>`;
			case 'connecting':
				return html`<connection-status
					.title=${'Awaiting your approval...'}
					.copy=${`Accept the request from ${this.state.wallet.name} in order to proceed.`}
					.wallet=${this.state.wallet}
				>
					<secondary-button slot="call-to-action" @click=${this.#resetSelection}>
						Cancel
					</secondary-button>
				</connection-status>`;
			case 'error':
				const { wallet, error } = this.state;
				const wasRequestCancelled = isWalletStandardError(
					error,
					WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED,
				);

				return html`<connection-status
					.title=${wasRequestCancelled ? 'Request canceled' : 'Connection failed'}
					.copy=${wasRequestCancelled ? `You canceled the request.` : 'Something went wrong.'}
					.wallet=${wallet}
				>
					<primary-button
						slot="call-to-action"
						@click=${() => {
							this.#attemptConnect(wallet);
						}}
					>
						Retry
					</primary-button>
				</connection-status>`;
			default:
				throw new Error(`Encountered unknown view state: ${this.state}`);
		}
	}

	#getModalTitle() {
		switch (this.state.view) {
			case 'wallet-selection':
				const wallets = this.#getWallets();
				return wallets.length > 0 ? 'Connect a wallet' : 'No wallets installed';
			case 'connecting':
			case 'error':
				return this.state.wallet.name;
			default:
				throw new Error(`Encountered unknown view state: ${this.state}`);
		}
	}

	async #attemptConnect(wallet: UiWallet) {
		try {
			this.state = { view: 'connecting', wallet };
			await this.instance!.connectWallet({ wallet });
			this.close('successful-connection');
		} catch (error) {
			this.state = { view: 'error', wallet, error };
		}
	}

	#resetSelection() {
		this.state = { view: 'wallet-selection' };
	}

	#getWallets() {
		const wallets = this.instance!.stores.$wallets.get();
		const filtered = this.filterFn ? wallets.filter(this.filterFn) : wallets;
		const sorted = this.sortFn ? filtered.toSorted(this.sortFn) : filtered;
		return sorted;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'mysten-dapp-kit-connect-modal': DAppKitConnectModal;
	}
}
