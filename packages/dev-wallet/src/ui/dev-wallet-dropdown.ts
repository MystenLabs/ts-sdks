// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { sharedStyles } from './styles.js';
import { emitEvent } from './utils.js';

/**
 * A reusable dropdown component that handles positioning and click-outside-to-close.
 *
 * Parent controls `open` state via property. The component emits `close` when the
 * user clicks outside.
 *
 * @slot trigger - The element that opens the dropdown (parent handles click to toggle)
 * @slot popover - The dropdown content (items, etc.)
 *
 * @example
 * ```html
 * <dev-wallet-dropdown .open=${this._open} @close=${() => this._open = false}>
 *   <button slot="trigger" @click=${() => this._open = !this._open}>Select</button>
 *   <div slot="popover">
 *     <button @click=${() => this.#select('a')}>Option A</button>
 *   </div>
 * </dev-wallet-dropdown>
 * ```
 */
@customElement('dev-wallet-dropdown')
export class DevWalletDropdown extends LitElement {
	static override styles = [
		sharedStyles,
		css`
			:host {
				position: relative;
				display: inline-block;
			}

			:host([full-width]) {
				display: block;
			}

			.popover {
				position: absolute;
				top: 100%;
				left: 0;
				margin-top: 4px;
				min-width: 100%;
				background: var(--dev-wallet-background);
				border: 1px solid var(--dev-wallet-border);
				border-radius: var(--dev-wallet-radius-md);
				box-shadow: var(--dev-wallet-shadow-md);
				z-index: 10;
				overflow: hidden;
				max-height: var(--dropdown-max-height, none);
				overflow-y: auto;
			}

			:host([full-width]) .popover {
				right: 0;
			}
		`,
	];

	@property({ type: Boolean, reflect: true })
	open = false;

	@property({ type: Boolean, reflect: true, attribute: 'full-width' })
	fullWidth = false;

	override render() {
		return html`
			<slot name="trigger"></slot>
			${this.open ? html`<div class="popover"><slot name="popover"></slot></div>` : nothing}
		`;
	}

	close() {
		if (this.open) {
			this.open = false;
			emitEvent(this, 'close');
		}
	}

	#handleDocClick = (e: Event) => {
		if (this.open && !e.composedPath().includes(this)) {
			this.close();
		}
	};

	#handleKeydown = (e: KeyboardEvent) => {
		if (!this.open) return;

		if (e.key === 'Escape') {
			e.preventDefault();
			this.close();
			// Return focus to the trigger
			const trigger = this.querySelector('[slot="trigger"]') as HTMLElement | null;
			trigger?.focus();
			return;
		}

		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const items = Array.from(
				this.querySelectorAll<HTMLElement>(
					'[slot="popover"] button, [slot="popover"] [role="option"]',
				),
			);
			if (items.length === 0) return;

			const focused = items.find((el) => el === document.activeElement);
			let index = focused ? items.indexOf(focused) : -1;

			if (e.key === 'ArrowDown') {
				index = index < items.length - 1 ? index + 1 : 0;
			} else {
				index = index > 0 ? index - 1 : items.length - 1;
			}

			items[index]?.focus();
		}
	};

	override connectedCallback() {
		super.connectedCallback();
		this.addEventListener('keydown', this.#handleKeydown);
		if (this.open) {
			document.addEventListener('click', this.#handleDocClick, true);
		}
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		document.removeEventListener('click', this.#handleDocClick, true);
		this.removeEventListener('keydown', this.#handleKeydown);
	}

	override willUpdate(changed: Map<string, unknown>) {
		if (changed.has('open')) {
			if (this.open) {
				document.addEventListener('click', this.#handleDocClick, true);
			} else {
				document.removeEventListener('click', this.#handleDocClick, true);
			}
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'dev-wallet-dropdown': DevWalletDropdown;
	}
}
