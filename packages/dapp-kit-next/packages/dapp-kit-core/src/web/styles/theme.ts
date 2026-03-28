// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';

export const themeStyles = css`
	:host {
		/** Colors */
		--dapp-kit-background: var(--background, oklch(1 0 0));
		--dapp-kit-foreground: var(--foreground, oklch(0.145 0 0));
		--dapp-kit-primary: var(--primary, oklch(0.216 0.006 56.043));
		--dapp-kit-primary-foreground: var(--primary-foreground, oklch(0.985 0.001 106.423));
		--dapp-kit-secondary: var(--secondary, oklch(0.97 0.001 106.424));
		--dapp-kit-secondary-foreground: var(--secondary-foreground, oklch(0.216 0.006 56.043));
		--dapp-kit-border: var(--border, oklch(0.922 0 0));
		--dapp-kit-accent: var(--accent, oklch(0.97 0.001 106.424));
		--dapp-kit-accent-foreground: var(--accent-foreground, oklch(0.205 0 0));
		--dapp-kit-muted: var(--muted, oklch(0.97 0.001 106.424));
		--dapp-kit-muted-foreground: var(--muted-foreground, oklch(0.553 0.013 58.071));
		--dapp-kit-popover: var(--popover, oklch(1 0 0));
		--dapp-kit-popover-foreground: var(--popover-foreground, oklch(0.145 0 0));
		--dapp-kit-destructive: var(--destructive, oklch(0.577 0.245 27.325));
		--dapp-kit-positive: var(--positive, oklch(0.862 0.127 146.2));
		--dapp-kit-ring: var(--ring, oklch(0.708 0 0));
		--dapp-kit-input: var(--input, oklch(0.922 0 0));

		/** Radii */
		--dapp-kit-radius: var(--radius, 12px);
		--dapp-kit-radius-xs: calc(var(--dapp-kit-radius) - 4px);
		--dapp-kit-radius-sm: calc(var(--dapp-kit-radius) - 4px);
		--dapp-kit-radius-md: calc(var(--dapp-kit-radius) - 2px);
		--dapp-kit-radius-lg: var(--dapp-kit-radius);
		--dapp-kit-radius-xl: calc(var(--dapp-kit-radius) + 4px);

		/** Width and Height */
		--dapp-kit-button-height: 40px;
		--dapp-kit-button-min-width: 120px;

		/** Padding */
		--dapp-kit-button-padding-x: 16px;
		--dapp-kit-button-padding-y: 8px;

		/** Typography */
		--dapp-kit-font-sans: var(
			--font-sans,
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial,
			'Noto Sans',
			sans-serif,
			'Apple Color Emoji',
			'Segoe UI Emoji',
			'Segoe UI Symbol',
			'Noto Color Emoji'
		);
		--dapp-kit-font-weight-medium: var(--font-medium, 500);
		--dapp-kit-font-weight-semibold: var(--font-semibold, 600);
	}
`;
