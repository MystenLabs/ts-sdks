// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { sharedStyles } from '../styles/index.js';

export const styles = [
	sharedStyles,
	css`
		ul {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.no-wallets-container {
			display: flex;
			gap: 16px;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}

		.title {
			font-weight: var(--dapp-kit-font-weight-medium);
		}

		.copy-text {
			color: var(--dapp-kit-muted-foreground);
		}

		.wallet-cta {
			display: flex;
			flex-direction: column;
			width: 100%;
		}
	`,
];
