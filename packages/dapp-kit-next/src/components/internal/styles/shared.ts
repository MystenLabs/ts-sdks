// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';

const resetStyles = css`
	* {
		box-sizing: border-box;
		font-family: var(--typography-font-family);
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
		margin: 0;
	}
`;

const themeStyles = css`
	:host {
		/** Colors */
		--dapp-kit-background: var(--background, oklch(1 0 0));
		--dapp-kit-primary: var(--primary, oklch(0.216 0.006 56.043));
		--dapp-kit-primary-foreground: var(--primary-foreground, oklch(0.985 0.001 106.423));
		--dapp-kit-secondary: var(--secondary, oklch(0.97 0.001 106.424));
		--dapp-kit-secondary-foreground: var(--secondary-foreground, oklch(0.216 0.006 56.043));
		--dapp-kit-accent: var(--accent, oklch(0.97 0.001 106.424));
		--dapp-kit-muted: var(--muted, oklch(0.97 0.001 106.424));
		--dapp-kit-muted-foreground: var(--muted-foreground, oklch(0.553 0.013 58.071));

		/** Radii */
		--dapp-kit-radius-xs: calc(var(--radius) - 4px);
		--dapp-kit-radius-sm: calc(var(--radius) - 4px);
		--dapp-kit-radius-md: calc(var(--radius) - 2px);
		--dapp-kit-radius-lg: var(--radius, 16px);
		--dapp-kit-radius-xl: calc(var(--radius) + 4px);

		/** Typography */
		--dapp-kit-font-weight-medium: var(--font-medium, 500);
		--dapp-kit-font-weight-semibold: var(--font-semibold, 600);
	}
`;

export const sharedStyles = [resetStyles, themeStyles];
