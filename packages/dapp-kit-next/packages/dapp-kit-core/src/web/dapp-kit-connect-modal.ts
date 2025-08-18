// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import { WalletList } from './internal/wallet-list.js';
import { BaseModal } from './internal/base-modal.js';
import type { UiWallet } from '@wallet-standard/ui';
import { closeIcon } from './internal/icons/close-icon.js';
import { backIcon } from './internal/icons/back-icon.js';
import type { WalletSelectedEvent } from './internal/wallet-list-item.js';
import { ConnectionStatus } from './internal/connection-status.js';
import {
	isWalletStandardError,
	WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED,
} from '@mysten/wallet-standard';
import { styles } from './dapp-kit-connect-modal.styles.js';
import { Button } from './internal/button.js';
import { iconButtonStyles } from './styles/icon-button.js';
import type { DefaultExpectedDppKit } from '../types.js';

type ModalViewState =
	| { view: 'wallet-selection' }
	| { view: 'connecting'; wallet: UiWallet }
	| { view: 'error'; wallet: UiWallet; error: unknown };

export type DAppKitConnectModalOptions = {
	filterFn?: (value: UiWallet, index: number, array: UiWallet[]) => boolean;
	sortFn?: (a: UiWallet, b: UiWallet) => number;
};

/**
 * A modal component for connecting to a Sui wallet, meant to be opened via a trigger button.
 *
 * Opens a modal to let the user select and connect to a wallet.
 *
 * @element mysten-dapp-kit-connect-modal
 *
 * @fires open - Fired *before* the dialog opens (cancelable).
 * @fires opened - Fired *after* the dialog has fully opened.
 * @fires close - Fired *before* the dialog closes (cancelable).
 * @fires closed - Fired *after* the dialog has fully closed.
 * @fires cancel - Fired when clicking the backdrop or pressing Escape (cancelable).
 *
 * @prop {Boolean} open - Programmatic access to the open state of the dialog.
 * @prop {DAppKitConnectModalOptions['filterFn']} filterFn - Function to filter the list of shown wallets (optional).
 * @prop {DAppKitConnectModalOptions['sortFn']} sortFn - Function to sort the list of available wallets (optional).
 * @prop {RegisteredDAppKit} instance - The dApp Kit instance used for state management.
 *
 * @cssprop --background - Background color of the component. Used as the default background for UI elements.
 * @cssprop --foreground - Foreground color of the component. Used as the default text color.
 * @cssprop --primary - Primary color used for interactive elements such as buttons and links.
 * @cssprop --primary-foreground - Text or icon color placed on top of primary elements.
 * @cssprop --secondary - Secondary color used for less prominent interactive elements.
 * @cssprop --secondary-foreground - Text or icon color placed on top of secondary elements.
 * @cssprop --border - Border color for UI elements.
 * @cssprop --accent - Accent color used for highlights and decorative elements.
 * @cssprop --accent-foreground - Text or icon color placed on top of accent elements.
 * @cssprop --muted - Background color for subtle or muted UI elements (e.g., placeholders, disabled states).
 * @cssprop --muted-foreground - Text or icon color for muted UI elements.
 * @cssprop --popover - Background color for floating elements such as popovers, dropdowns, or tooltips.
 * @cssprop --popover-foreground - Text or icon color inside popover elements.
 * @cssprop --ring - Color used for focus rings (visible focus indicators on interactive elements).
 * @cssprop --radius - Border radius used for UI elements.
 * @cssprop --font-sans - Font family used for text content.
 * @cssprop --font-weight-medium - Medium font weight for text (typically used for buttons and interactive elements).
 * @cssprop --font-weight-semibold - Semibold font weight for text (typically used for headings or emphasized text).
 */
@customElement('mysten-dapp-kit-connect-modal')
export class DAppKitConnectModal
	extends ScopedRegistryHost(BaseModal)
	implements DAppKitConnectModalOptions
{
	static override styles = [styles, iconButtonStyles];

	static elementDefinitions = {
		'wallet-list': WalletList,
		'internal-button': Button,
		'connection-status': ConnectionStatus,
	};

	/**
	 * The dApp Kit instance used for state management.
	 */
	@storeProperty()
	instance!: DefaultExpectedDppKit;

	@state()
	private _state: ModalViewState = { view: 'wallet-selection' };

	/**
	 * Function to filter the list of shown wallets.
	 */
	@property({ attribute: false })
	filterFn: DAppKitConnectModalOptions['filterFn'];

	/**
	 * Function to sort the list of shown wallets.
	 */
	@property({ attribute: false })
	sortFn: DAppKitConnectModalOptions['sortFn'];

	#abortController?: AbortController;

	override render() {
		const showBackButton = this._state.view === 'connecting' || this._state.view === 'error';
		const wallets = this.#getWallets();

		return html`<dialog @click=${this.handleDialogClick} @close=${this.#resetSelection}>
			<div class="content" @click=${this.handleContentClick}>
				<div class="connect-header">
					${showBackButton
						? html`<button
								class="icon-button back-button"
								aria-label="Go back"
								@click=${this.#resetSelection}
							>
								${backIcon}
							</button>`
						: nothing}
					<h2 class="title">${wallets.length > 0 ? 'Connect a wallet' : 'No wallets installed'}</h2>
					<button
						class="icon-button close-button"
						aria-label="Close"
						@click=${() => this.close('cancel')}
					>
						${closeIcon}
					</button>
				</div>
				${this.#renderModalView(wallets)}
			</div>
		</dialog>`;
	}

	#renderModalView(wallets: UiWallet[]) {
		switch (this._state.view) {
			case 'wallet-selection':
				return html`<wallet-list
					.wallets=${wallets}
					@wallet-selected=${async (event: WalletSelectedEvent) => {
						this.#attemptConnect(event.detail.wallet);
					}}
				></wallet-list>`;
			case 'connecting':
				return html`<connection-status
					.title=${'Awaiting connection...'}
					.copy=${`Accept the request from ${this._state.wallet.name} in order to proceed`}
					.wallet=${this._state.wallet}
				>
					<internal-button
						slot="call-to-action"
						.variant=${'secondary'}
						@click=${this.#resetSelection}
					>
						Cancel
					</internal-button>
				</connection-status>`;
			case 'error':
				const { wallet, error } = this._state;
				const wasRequestCancelled = isWalletStandardError(
					error,
					WALLET_STANDARD_ERROR__USER__REQUEST_REJECTED,
				);

				return html`<connection-status
					.title=${wasRequestCancelled ? 'Request canceled' : 'Connection failed'}
					.copy=${wasRequestCancelled
						? `You canceled the request`
						: 'Something went wrong. Please try again'}
					.wallet=${wallet}
				>
					<internal-button
						slot="call-to-action"
						@click=${() => {
							this.#attemptConnect(wallet);
						}}
					>
						Retry
					</internal-button>
				</connection-status>`;
			default:
				throw new Error(`Encountered unknown view state: ${this._state}`);
		}
	}

	async #attemptConnect(wallet: UiWallet) {
		let delayTimeout: number | undefined;

		try {
			const abortPromise = new Promise((_, reject) => {
				this.#abortController = new AbortController();
				this.#abortController.signal.addEventListener(
					'abort',
					() => reject(new DOMException('Aborted', 'AbortError')),
					{ once: true },
				);
			});

			// Connection attempts can sometimes be instantaneous when accounts are
			// already authorized or the wallet isn't setup yet, so we'll introduce
			// a tiny delay to prevent the UI flickering on the loading state.
			delayTimeout = setTimeout(() => {
				this._state = { view: 'connecting', wallet };
			}, 100);

			await Promise.race([abortPromise, this.instance.connectWallet({ wallet })]);
			this.close('successful-connection');
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				this._state = { view: 'wallet-selection' };
			} else {
				this._state = { view: 'error', wallet, error };
			}
		} finally {
			clearTimeout(delayTimeout);
		}
	}

	#resetSelection() {
		if (this._state.view === 'connecting') {
			this.#abortController?.abort('cancelled');
		} else {
			this._state = { view: 'wallet-selection' };
		}
	}

	#getWallets() {
		const wallets = this.instance.stores.$wallets.get();
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
