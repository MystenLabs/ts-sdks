// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';

export const resetStyles = css`
	* {
		box-sizing: border-box;
		-webkit-font-smoothing: antialiased;
		font-family: var(--dev-wallet-font-sans);
	}

	button {
		appearance: none;
		background-color: transparent;
		font-size: inherit;
		font-family: inherit;
		color: inherit;
		border: 0;
		padding: 0;
		margin: 0;
		cursor: pointer;
		outline-color: color-mix(in oklab, var(--dev-wallet-ring) 50%, transparent);
	}

	p,
	h1,
	h2,
	h3 {
		margin: 0;
		color: var(--dev-wallet-foreground);
	}
`;

export const themeStyles = css`
	:host {
		/* Colors — OKLch dark theme */
		--dev-wallet-background: oklch(0.175 0.028 283);
		--dev-wallet-foreground: oklch(0.91 0 0);
		--dev-wallet-primary: oklch(0.55 0.24 265);
		--dev-wallet-primary-foreground: oklch(0.98 0 0);
		--dev-wallet-secondary: oklch(0.195 0.04 262);
		--dev-wallet-secondary-foreground: oklch(0.91 0 0);
		--dev-wallet-muted: oklch(0.25 0.035 280);
		--dev-wallet-muted-foreground: oklch(0.62 0.04 280);
		--dev-wallet-destructive: oklch(0.63 0.26 25);
		--dev-wallet-positive: oklch(0.72 0.19 145);
		--dev-wallet-warning: oklch(0.79 0.17 75);
		--dev-wallet-border: oklch(0.25 0.035 280);
		--dev-wallet-input: oklch(0.25 0.035 280);
		--dev-wallet-ring: oklch(0.55 0.24 265);
		--dev-wallet-popover: oklch(0.195 0.04 262);
		--dev-wallet-popover-foreground: oklch(0.91 0 0);

		/* Radius scale — derived from base */
		--dev-wallet-radius: 12px;
		--dev-wallet-radius-xs: calc(var(--dev-wallet-radius) - 6px);
		--dev-wallet-radius-sm: calc(var(--dev-wallet-radius) - 4px);
		--dev-wallet-radius-md: calc(var(--dev-wallet-radius) - 2px);
		--dev-wallet-radius-lg: var(--dev-wallet-radius);
		--dev-wallet-radius-xl: calc(var(--dev-wallet-radius) + 4px);

		/* Typography */
		--dev-wallet-font-sans:
			ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
			'Helvetica Neue', Arial, sans-serif;
		--dev-wallet-font-weight-medium: 500;
		--dev-wallet-font-weight-semibold: 600;
	}
`;

export const sharedStyles = [resetStyles, themeStyles];
