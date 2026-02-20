// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { storeProperty } from '../utils/lit.js';
import type { DAppKitConnectModalOptions } from './dapp-kit-connect-modal.js';
import { DAppKitConnectModal } from './dapp-kit-connect-modal.js';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { Button } from './internal/button.js';
import { sharedStyles } from './styles/index.js';
import type { DefaultExpectedDppKit } from '../types.js';
import { ConnectedAccountMenu } from './internal/connected-account-menu.js';
import type { AccountSelectedEvent } from './internal/connected-account-menu-item.js';

/**
 * A button component for connecting to a Sui wallet.
 *
 * Displays a "Connect Wallet" button when no wallet is connected or a connected account menu when a wallet is active.
 *
 * @element mysten-dapp-kit-connect-button
 *
 * @prop {DAppKitConnectModalOptions} modalOptions - Options to configure the connect modal.
 * @prop {RegisteredDAppKit} instance - The dApp Kit instance used for state management.
 *
 * @slot - The default slot used to customize the button content (shown when not connected).
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
 *
 * @csspart trigger - The underlying button element. Use `::part(trigger)` to customize sizing, padding, border-radius, etc.
 */
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

	/**
	 * Options to configure the connect modal.
	 */
	@property({ type: Object })
	modalOptions?: DAppKitConnectModalOptions;

	/**
	 * The dApp Kit instance used for state management.
	 */
	@storeProperty()
	instance!: DefaultExpectedDppKit;

	@query('mysten-dapp-kit-connect-modal')
	private readonly _modal!: DAppKitConnectModal;

	override render() {
		const connection = this.instance.stores.$connection.get();
		const client = this.instance.stores.$currentClient.get();

		return connection.account
			? html`<connected-account-menu
					exportparts="trigger"
					.connection=${connection}
					.client=${client}
					@account-selected=${(event: AccountSelectedEvent) => {
						this.instance.switchAccount({ account: event.detail.account });
					}}
					@disconnect-click=${() => {
						this.instance.disconnectWallet();
					}}
					@manage-connection-click=${() => {
						this.instance.connectWallet({ wallet: connection.wallet });
					}}
				></connected-account-menu>`
			: html`<internal-button exportparts="trigger" @click=${this.#openModal}>
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
