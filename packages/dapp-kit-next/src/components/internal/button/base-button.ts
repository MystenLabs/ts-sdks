// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { CSSResultGroup } from 'lit';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { resetStyles } from '../styles/shared.js';

export class BaseButton extends LitElement {
	static styles: CSSResultGroup = [
		resetStyles,
		css`
			button {
				transition-property: background-color;
				transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
				transition-duration: 0.15s;
				border-radius: var(--dapp-kit-radius-md);
				font-weight: var(--dapp-kit-font-weight-medium);
				display: inline-flex;
				justify-content: center;
				align-items: center;
				padding-left: 16px;
				padding-right: 16px;
				padding-top: 8px;
				padding-bottom: 8px;
				height: 36px;
			}
		`,
	];

	@property({ type: Boolean, reflect: true })
	disabled = false;

	override render() {
		return html`
			<button type="button" ?disabled=${this.disabled}>
				<slot></slot>
			</button>
		`;
	}
}
