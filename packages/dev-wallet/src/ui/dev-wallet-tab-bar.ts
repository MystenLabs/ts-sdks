// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { sharedStyles } from './styles.js';

export type TabId = 'assets' | 'objects' | 'settings';

@customElement('dev-wallet-tab-bar')
export class DevWalletTabBar extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				display: block;
				border-top: 1px solid var(--dev-wallet-border);
			}

			.tab-bar {
				display: flex;
				height: 40px;
			}

			.tab {
				flex: 1;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 4px;
				font-size: 11px;
				font-weight: var(--dev-wallet-font-weight-medium);
				color: var(--dev-wallet-muted-foreground);
				transition: color 0.15s;
				border-top: 2px solid transparent;
			}

			.tab:hover {
				color: var(--dev-wallet-foreground);
			}

			.tab[aria-selected='true'] {
				color: var(--dev-wallet-primary);
				border-top-color: var(--dev-wallet-primary);
			}

			.tab svg {
				width: 16px;
				height: 16px;
			}
		`,
	];

	@property({ type: String })
	active: TabId = 'assets';

	override render() {
		return html`
			<nav class="tab-bar" part="tab-bar" role="tablist" aria-label="Wallet navigation">
				<button
					class="tab"
					part="tab"
					role="tab"
					aria-selected=${this.active === 'assets'}
					tabindex=${this.active === 'assets' ? 0 : -1}
					@click=${() => this.#select('assets')}
					@keydown=${this.#handleKeydown}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="2" y="4" width="20" height="16" rx="2" />
						<path d="M16 12h.01" />
					</svg>
					Assets
				</button>
				<button
					class="tab"
					part="tab"
					role="tab"
					aria-selected=${this.active === 'objects'}
					tabindex=${this.active === 'objects' ? 0 : -1}
					@click=${() => this.#select('objects')}
					@keydown=${this.#handleKeydown}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="3" width="7" height="7" rx="1" />
						<rect x="3" y="14" width="7" height="7" rx="1" />
						<rect x="14" y="14" width="7" height="7" rx="1" />
					</svg>
					Objects
				</button>
				<button
					class="tab"
					part="tab"
					role="tab"
					aria-selected=${this.active === 'settings'}
					tabindex=${this.active === 'settings' ? 0 : -1}
					@click=${() => this.#select('settings')}
					@keydown=${this.#handleKeydown}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="3" />
						<path
							d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
						/>
					</svg>
					Settings
				</button>
			</nav>
		`;
	}

	#handleKeydown(e: KeyboardEvent) {
		const tabs: TabId[] = ['assets', 'objects', 'settings'];
		const currentIndex = tabs.indexOf(this.active);
		let newIndex = -1;

		if (e.key === 'ArrowRight') {
			e.preventDefault();
			newIndex = (currentIndex + 1) % tabs.length;
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
		}

		if (newIndex !== -1) {
			this.#select(tabs[newIndex]);
			// Focus the newly active tab
			const buttons = this.shadowRoot?.querySelectorAll<HTMLButtonElement>('.tab');
			buttons?.[newIndex]?.focus();
		}
	}

	#select(tab: TabId) {
		if (tab !== this.active) {
			this.dispatchEvent(
				new CustomEvent('tab-changed', {
					bubbles: true,
					composed: true,
					detail: { tab },
				}),
			);
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-tab-bar': DevWalletTabBar;
	}
}
