// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement } from 'lit';
import { resetStyles } from '../styles/shared.js';

export class IconButton extends LitElement {
	static styles = [
		resetStyles,
		css`
			button {
				width: 32px;
				height: 32px;
				border-radius: 50%;
				background: var(--dapp-kit-background);
				display: inline-flex;
				align-items: center;
				justify-content: center;
				transition:
					background-color 200ms,
					transform 100ms;
			}

			button:hover {
				background-color: var(--dapp-kit-accent);
			}

			button:active {
				transform: scale(0.9);
			}
		`,
	];

	override render() {
		return html`
			<button type="button">
				<slot></slot>
			</button>
		`;
	}
}
