// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';

export const iconButtonStyles = css`
	.icon-button {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: inherit;
		color: var(--dapp-kit-foreground);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			background-color 200ms,
			transform 100ms;
	}

	.icon-button:hover {
		background-color: var(--dapp-kit-accent);
	}

	.icon-button:active {
		transform: scale(0.9);
	}
`;
