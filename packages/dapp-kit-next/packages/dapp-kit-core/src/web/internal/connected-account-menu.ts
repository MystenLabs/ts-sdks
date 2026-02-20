// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

import { html, LitElement } from 'lit';
import { Button } from './button.js';
import { formatAddress } from '@mysten/sui/utils';
import { property, query, state } from 'lit/decorators.js';
import { unlinkIcon } from './icons/unlink-icon.js';
import { styles } from './connected-account-menu.styles.js';
import type { DAppKitCompatibleClient } from '../../core/types.js';
import { autoPlacement, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { AccountMenuItem } from './connected-account-menu-item.js';
import { chevronDownIcon } from './icons/chevron-down-icon.js';
import type { WalletConnection } from '../../core/store.js';
import { plusIcon } from './icons/plus-icon.js';
import { SLUSH_WALLET_NAME } from '@mysten/slush-wallet';
import { when } from 'lit/directives/when.js';
import { Task } from '@lit/task';
import { resolveNameServiceName } from '../../utils/name.js';

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

	@state()
	private _open = false;

	#unsubscribeFromAutoUpdate?: () => void;

	#resolveNameTask = new Task(this, {
		args: () => [this.client, this.connection.account.address],
		task: async ([client, address]) => resolveNameServiceName(client, address),
	});

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
				exportparts="trigger"
				id="menu-button"
				aria-haspopup="true"
				aria-controls="menu"
				aria-expanded="${this._open}"
				@click=${this.#toggleMenu}
			>
				<div class="trigger-content">
					<img src=${this.connection.account.icon ?? this.connection.wallet.icon} alt="" />
					${this.#resolveNameTask.render({
						pending: this.#getAccountTitle,
						complete: this.#getAccountTitle,
						error: () => this.#getAccountTitle,
					})}
					<div class="chevron">${chevronDownIcon}</div>
				</div>
			</internal-button>
			<div class="menu" id="menu" tabindex="-1" aria-labelledby="menu-button">
				<div class="header-container">
					<h2 class="header-title">Connected accounts</h2>
					${when(
						// NOTE: No compatible wallets conform with the standard
						// in a way to allow selecting other accounts besides Slush
						// so we'll just hardcode this for now.
						this.connection.wallet.name.startsWith(SLUSH_WALLET_NAME),
						() =>
							html`<button
								class="icon-button"
								aria-label="Add more accounts"
								@click=${this.#onManageConnectionClick}
							>
								${plusIcon}
							</button>`,
					)}
				</div>
				<div class="accounts-container" role="radiogroup">
					<ul class="accounts-list">
						${this.connection.wallet.accounts.map(
							(account) => html`
								<li>
									<account-menu-item
										.account=${account}
										.client=${this.client}
										.selected=${account.address === this.connection.account.address}
									></account-menu-item>
								</li>
							`,
						)}
					</ul>
				</div>
				<button class="disconnect-button" @click=${this.#onDisconnectClick}>
					${unlinkIcon} Disconnect all
				</button>
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

	#getAccountTitle = (name?: string | null) => {
		return name || this.connection.account.label || formatAddress(this.connection.account.address);
	};

	#onDocumentClick = (event: MouseEvent) => {
		if (!this._open) return;

		const path = event.composedPath();
		if (!path.includes(this)) {
			this.#closeMenu();
		}
	};

	#toggleMenu() {
		if (this._open) {
			this.#closeMenu();
		} else {
			this.#openMenu();
		}
	}

	async #openMenu() {
		this._open = true;

		await this.updateComplete;
		this._menu.focus();
		this.#startPositioning();
	}

	#closeMenu() {
		this._open = false;
		this.#stopPositioning();
	}

	#startPositioning() {
		this.#unsubscribeFromAutoUpdate = autoUpdate(this._trigger, this._menu, async () => {
			const result = await computePosition(this._trigger, this._menu, {
				placement: 'bottom-end',
				middleware: [offset(12), flip(), shift({ padding: 16 }), autoPlacement()],
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
