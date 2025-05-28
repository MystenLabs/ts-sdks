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

		img {
			width: 120px;
			height: 120px;
		}

		div {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			gap: 12px;
		}

		h2 {
			font-size: 24px;
			font-weight: var(--dapp-kit-font-weight-medium);
		}

		p {
			color: var(--dapp-kit-muted-foreground);
		}

		::slotted(*) {
			display: flex;
			flex-direction: column;
			width: 100%;
		}
	`,
];
