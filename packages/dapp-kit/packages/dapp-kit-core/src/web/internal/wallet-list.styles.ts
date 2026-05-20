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
			flex-grow: 1;
		}

		ul {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.no-wallets-container {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
		}

		.no-wallets-content {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			flex-grow: 1;
			gap: 32px;
		}

		.title {
			font-weight: var(--dapp-kit-font-weight-semibold);
			text-align: center;
			font-size: 28px;
		}

		.wallet-cta {
			display: flex;
			flex-direction: column;
			width: 100%;
		}
	`,
];
