// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { resetStyles } from './styles/shared.js';

export const styles = [
	resetStyles,
	css`
		button {
			transition: background-color 180ms;
			background-color: var(--dapp-kit-secondary);
			border-radius: var(--dapp-kit-radius-lg);
			display: flex;
			align-items: center;
			gap: 12px;
			width: 100%;
			padding-top: 12px;
			padding-bottom: 12px;
			padding-left: 16px;
			padding-right: 16px;
		}

		button:hover {
			background-color: color-mix(in oklab, var(--dapp-kit-secondary) 80%, transparent);
		}

		img {
			width: 32px;
			height: 32px;
			border-radius: var(--dapp-kit-radius-lg);
		}

		p {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
			font-weight: 500;
		}
	`,
];
