// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { sharedStyles } from '../styles/index.js';

export const styles = [
	sharedStyles,
	css`
		:host {
			display: flex;
			flex-direction: column;
			align-items: center;
			text-align: center;
			flex-grow: 1;
			gap: 40px;
		}

		.logo {
			width: 120px;
			height: 120px;
			border-radius: var(--dapp-kit-radius-lg);
		}

		.container {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			gap: 12px;
		}

		.title {
			font-size: 24px;
			font-weight: var(--dapp-kit-font-weight-medium);
		}

		.copy {
			color: var(--dapp-kit-muted-foreground);
		}

		::slotted(*) {
			display: flex;
			flex-direction: column;
			width: 100%;
		}
	`,
];
