// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { BaseButton } from './base-button.js';

export class SecondaryButton extends BaseButton {
	static styles = [
		BaseButton.styles,
		css`
			button {
				background-color: var(--dapp-kit-secondary);
				color: var(--dapp-kit-secondary-foreground);
			}

			button:hover {
				background-color: color-mix(in oklab, var(--dapp-kit-secondary) 80%, transparent);
			}
		`,
	];
}
