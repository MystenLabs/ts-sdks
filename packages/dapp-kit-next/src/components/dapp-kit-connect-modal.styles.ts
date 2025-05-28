// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { resetStyles } from './internal/styles/shared.js';

export const styles = [
	resetStyles,
	css`
		dialog {
			width: 360px;
			height: 480px;
			border: 0;
			padding: 0;
			background: var(--dapp-kit-background);
			border-radius: var(--dapp-kit-radius-lg);
		}

		.content {
			display: flex;
			flex-direction: column;
			height: 100%;
			gap: 48px;
			padding: 24px;
		}

		.connect-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			position: relative;
		}

		.title {
			position: absolute;
			left: 50%;
			transform: translateX(-50%);
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
