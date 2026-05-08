// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { sharedStyles } from './styles/index.js';

export const styles = [
	sharedStyles,
	css`
		dialog {
			width: 360px;
			height: 480px;
			border: 1px solid var(--dapp-kit-border);
			padding: 0;
			background: var(--dapp-kit-background);
			border-radius: var(--dapp-kit-radius-lg);
		}

		.content {
			display: flex;
			flex-direction: column;
			height: 100%;
			gap: 32px;
			padding: 24px;
		}

		.connect-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 8px;
		}

		.title {
			font-size: 18px;
			font-weight: var(--dapp-kit-font-weight-semibold);
			white-space: nowrap;
		}

		.close-button {
			margin-left: auto;
		}

		.cancel-button {
			margin-top: auto;
		}
	`,
];
