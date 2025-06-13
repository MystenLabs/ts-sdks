// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

import { html, LitElement } from 'lit';
import { Button } from './button.js';
import { formatAddress } from '@mysten/sui/utils';
import { property, query, queryAll, state } from 'lit/decorators.js';
import { disconnectIcon } from './icons/disconnect-icon.js';
import { copyIcon } from './icons/copy-icon.js';
import { styles } from './connected-account-menu.styles.js';
import type { DAppKitCompatibleClient } from '../../core/types.js';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { connectIcon } from './icons/connect-icon.js';
import { AccountMenuItem } from './connected-account-menu-item.js';
import { chevronDownIcon } from './icons/chevron-down-icon.js';
import { circleCheckIcon } from './icons/circle-check-icon.js';
import { when } from 'lit/directives/when.js';
import { SLUSH_WALLET_NAME } from '@mysten/slush-wallet';
import type { WalletConnection } from '../../core/store.js';

export class ConnectedAccountMenu extends ScopedRegistryHost(LitElement) {
	static elementDefinitions = {
		'internal-button': Button,
		'account-menu-item': AccountMenuItem,
	};

	static override styles = styles;

	@property({ type: Object })
	connection!: Extract<WalletConnection, { status: 'connected' }>;

	@property({ type: Object })
	client!: DAppKitCompatibleClient;

	@query('#menu-button')
	private _trigger!: HTMLElement;

	@query('#menu')
	private _menu!: HTMLElement;

	@queryAll('[role="menuitem"], [role="menuitemradio"]')
	private _menuItems!: NodeListOf<HTMLElement>;

	@state()
	private _open = false;

	@state()
	private _wasCopySuccessful = false;

	@state()
	private _focusedIndex = -1;

	#unsubscribeFromAutoUpdate?: () => void;

	override connectedCallback() {
		super.connectedCallback();
		document.addEventListener('click', this.#onDocumentClick);
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#stopPositioning();
		document.removeEventListener('click', this.#onDocumentClick);
	}

	override render() {
		return html`<internal-button
				id="menu-button"
				aria-haspopup="true"
				aria-controls="menu"
				aria-expanded="${this._open}"
				@click=${this.#toggleMenu}
			>
				<div class="trigger-content">
					<img src=${this.connection.account.icon ?? this.connection.wallet.icon} alt="" />
					${this.#getDisplayAddress()}
					<div class="chevron">${chevronDownIcon}</div>
				</div>
			</internal-button>
			<div
				id="menu"
				role="menu"
				tabindex="-1"
				aria-labelledby="menu-button"
				@keydown="${this.#onMenuKeydown}"
			>
				<div class="current-account-container">
					<img src=${this.connection.account.icon ?? this.connection.wallet.icon} alt="" />
					<div>
						<div>${formatAddress(this.connection.account.address)}</div>
						<div class="connected-text">Connected</div>
					</div>
					<button
						class="copy-address-button icon-button"
						aria-label="Copy address"
						@click=${this.#copyAddressToClipboard}
					>
						${this._wasCopySuccessful ? circleCheckIcon : copyIcon}
					</button>
				</div>
				<div role="separator" aria-orientation="horizontal"></div>
				<div class="accounts-container" role="group">
					<div class="accounts-label">Accounts</div>
					<ul class="accounts-list">
						${this.connection.wallet.accounts.map(
							(account) => html`
								<account-menu-item
									.account=${account}
									.selected=${account.address === this.connection.account.address}
									tabIndex="-1"
								></account-menu-item>
							`,
						)}
					</ul>
				</div>
				<div role="separator" aria-orientation="horizontal"></div>
				<div class="actions-container" role="group">
					<!-- ${when(
						// NOTE: No compatible wallets conform with the standard
						// in a way to allow selecting other accounts besides Slush
						// so we'll just hardcode this for now.
						//this.connection.wallet.name === SLUSH_WALLET_NAME,
						() =>
							html`<div
								class="action-menu-item"
								role="menuitem"
								tabindex="-1"
								@click=${this.#onManageConnectionClick}
							>
								${connectIcon} Manage Connection
							</div>`,
					)} -->
					<div
						class="action-menu-item"
						role="menuitem"
						tabindex="-1"
						@click=${this.#onManageConnectionClick}
					>
						${connectIcon} Manage Connection
					</div>
					<div
						class="action-menu-item"
						role="menuitem"
						tabindex="-1"
						@click=${this.#onDisconnectClick}
					>
						${disconnectIcon} Disconnect Wallet
					</div>
				</div>
			</div>`;
	}

	#onDisconnectClick() {
		this.dispatchEvent(
			new CustomEvent('disconnect-click', {
				bubbles: true,
				composed: true,
			}),
		);
	}

	#onManageConnectionClick() {
		this.dispatchEvent(
			new CustomEvent('manage-connection-click', {
				bubbles: true,
				composed: true,
			}),
		);
	}

	#getDisplayAddress = () => {
		return this.connection.account.label || formatAddress(this.connection.account.address);
	};

	async #copyAddressToClipboard() {
		try {
			await navigator.clipboard.writeText(this.connection.account.address);
			this._wasCopySuccessful = true;

			setTimeout(() => {
				this._wasCopySuccessful = false;
			}, 2000);
		} catch (error) {
			// Do nothing here
		}
	}

	#onDocumentClick = (event: MouseEvent) => {
		if (!this._open) return;

		const path = event.composedPath();
		if (!path.includes(this)) {
			this.#closeMenu();
		}
	};

	#onMenuKeydown(event: KeyboardEvent) {
		if (!this._open) return;

		switch (event.key) {
			case 'Escape':
				this.#closeMenu();
				this._trigger.focus();
				break;
			case 'ArrowDown':
				event.preventDefault();
				this.#focusMenuItem(Math.min(this._focusedIndex + 1, this._menuItems.length - 1));
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.#focusMenuItem(Math.max(this._focusedIndex - 1, 0));
				break;
			case 'Home':
				event.preventDefault();
				this.#focusMenuItem(0);
				break;
			case 'End':
				event.preventDefault();
				this.#focusMenuItem(this._menuItems.length - 1);
				break;
			case 'Enter':
				if (this._focusedIndex !== -1) {
					event.preventDefault();
					this._menuItems.item(this._focusedIndex).click();
					this.#closeMenu();
				}
				break;
		}
	}

	#focusMenuItem(index: number) {
		const currentItem = this._focusedIndex > 0 ? this._menuItems.item(this._focusedIndex) : null;
		if (currentItem) {
			currentItem.setAttribute('tabindex', '-1');
		}

		this._focusedIndex = index;
		const itemToFocus = this._menuItems.item(this._focusedIndex);

		itemToFocus.setAttribute('tabindex', '0');
		itemToFocus.focus();
	}

	#toggleMenu() {
		if (this._open) {
			this.#closeMenu();
		} else {
			this.#openMenu();
		}
	}

	async #openMenu() {
		this._open = true;
		this._focusedIndex = -1;

		await this.updateComplete;
		this._menu.focus();
		this.#startPositioning();
	}

	#closeMenu() {
		this._open = false;
		this._focusedIndex = -1;
		this.#stopPositioning();
	}

	#startPositioning() {
		this.#unsubscribeFromAutoUpdate = autoUpdate(this._trigger, this._menu, async () => {
			const result = await computePosition(this._trigger, this._menu, {
				placement: 'bottom-end',
				middleware: [offset(8), flip(), shift()],
			});

			Object.assign(this._menu.style, {
				left: `${result.x}px`,
				top: `${result.y}px`,
			});
		});
	}

	#stopPositioning() {
		if (this.#unsubscribeFromAutoUpdate) {
			this.#unsubscribeFromAutoUpdate();
			this.#unsubscribeFromAutoUpdate = undefined;
		}
	}
}
