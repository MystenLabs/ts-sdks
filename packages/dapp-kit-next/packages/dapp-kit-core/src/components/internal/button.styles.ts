// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { sharedStyles } from '../styles/index.js';

export const styles = [
	sharedStyles,
	css`
		button {
			transition-property: background-color;
			transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
			transition-duration: 0.15s;
			border-radius: var(--dapp-kit-radius-md);
			font-weight: var(--dapp-kit-font-weight-semibold);
			outline-style: none;
			display: inline-flex;
			justify-content: center;
			align-items: center;
			padding-left: 16px;
			padding-right: 16px;
			padding-top: 8px;
			padding-bottom: 8px;
			height: 40px;
		}

		button:focus-visible {
			border-color: var(--dapp-kit-ring);
			box-shadow:
				0 0 0 3px color-mix(in oklab, var(--dapp-kit-ring) 50%, transparent),
				rgba(0, 0, 0, 0.05) 0px 1px 2px 0px;
		}

		button.primary {
			background-color: var(--dapp-kit-primary);
			color: var(--dapp-kit-primary-foreground);
		}

		button.primary:hover:not(:disabled) {
			background-color: color-mix(in oklab, var(--dapp-kit-primary) 90%, transparent);
		}

		button.secondary {
			background-color: var(--dapp-kit-secondary);
			color: var(--dapp-kit-secondary-foreground);
		}

		button.secondary:hover:not(:disabled) {
			background-color: color-mix(in oklab, var(--dapp-kit-secondary) 80%, transparent);
		}
	`,
];
