// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';

export const resetStyles = css`
	* {
		box-sizing: border-box;
		-webkit-font-smoothing: antialiased;
		font-family: var(--dapp-kit-font-sans);
		outline-color: color-mix(in oklab, var(--dapp-kit-ring) 50%, transparent);
	}

	button {
		appearance: none;
		background-color: transparent;
		font-size: inherit;
		font-family: inherit;
		line-height: inherit;
		letter-spacing: inherit;
		color: inherit;
		border: 0;
		padding: 0;
		margin: 0;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	p,
	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		font-size: inherit;
		font-weight: inherit;
		color: var(--dapp-kit-foreground);
		margin: 0;
	}
`;
