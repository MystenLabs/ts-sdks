// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { sharedStyles } from '../styles/index.js';

export const styles = [
	sharedStyles,
	css`
		li {
			padding-top: 8px;
			padding-bottom: 8px;
			padding-left: 12px;
			padding-right: 12px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
			width: 100%;
			border-radius: var(--dapp-kit-radius-sm);
		}

		li:hover,
		li:focus {
			background-color: var(--dapp-kit-accent);
			outline: 2px solid transparent;
			outline-offset: 2px;
		}

		svg {
			width: 16px;
			height: 16px;
		}
	`,
];
