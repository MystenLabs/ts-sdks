// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';

export const CSSReset = css`
	:host {
		/* Typography */
		--typography-font-family: var(
			--dapp-kit--typography-font-family,
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
		--typography-font-style: var(--dapp-kit--typography-font-style, normal);
		--typography-line-height: var(--dapp-kit--typography-line-height, 1.3);
		--typography-letter-spacing: var(--dapp-kit--typography-letter-spacing, 1);

		/* Colors */
		--body-color: var(--dapp-kit--body-color, #182435);
		--body-muted-color: var(--dapp-kit--body-muted-color, #767a81);
		--body-danger-color: var(--dapp-kit--body-danger-color, #ff794b);
		--primary-button-color: var(--dapp-kit--primary-button-color, #373737);
		--outline-button-color: var(--dapp-kit--outline-button-color, #373737);
		--icon-button-color: var(--dapp-kit--icon-button-color, #000000);

		/* Background Colors: */
		--modal-backdrop-background: var(--dapp-kit--modal-backdrop-background, rgba(24 36 53 / 20%));
		--primary-background-color: var(--dapp-kit--primary-background-color, #f6f7f9);
		--secondary-background-color: var(--dapp-kit--secondary-background-color, #f7f8f8);
		--icon-button-color: var(--dapp-kit--icon-button-color, transparent);
		--icon-button-hover-color: var(--dapp-kit--icon-button-hover-color, #f0f1f2);
		--dropdown-menu-color: var(--dapp-kit--dropdown-menu-color, #ffffff);
		--dropdown-menu-separator-color: var(--dapp-kit--dropdown-menu-separator-color, #f3f6f8);
		--wallet-item-selected-color: var(--dapp-kit--wallet-item-selected-color, white);
		--wallet-item-hover-color: var(--dapp-kit--wallet-item-hover-color, #3c424226);

		/* Border Colors: */
		--outline-button-color: var(--dapp-kit--outline-button-color, #e4e4e7);

		/* Font sizes: */
		--font-size-small: var(--dapp-kit--font-size-small, 14px);
		--font-size-medium: var(--dapp-kit--font-size-medium, 16px);
		--font-size-large: var(--dapp-kit--font-size-large, 18px);
		--font-size-xlarge: var(--dapp-kit--font-size-xlarge, 20px);

		/* Font weights: */
		--font-weight-normal: var(--dapp-kit--font-weight-normal, 400);
		--font-weight-medium: var(--dapp-kit--font-weight-medium, 500);
		--font-weight-bold: var(--dapp-kit--font-weight-bold, 600);

		/* Extra Modal Backdrop Config: */
		--modal-backdrop-filter: var(--dapp-kit--modal-backdrop-filter, blur(0));

		/* Radii: */
		--radii-small: var(--dapp-kit--radii-small, 6px);
		--radii-medium: var(--dapp-kit--radii-medium, 8px);
		--radii-large: var(--dapp-kit--radii-large, 12px);
		--radii-xlarge: var(--dapp-kit--radii-xlarge, 16px);

		/* Shadows: */
		--shadow-primary-button: var(
			--dapp-kit--shadow-primary-button,
			0px 4px 12px rgba(0, 0, 0, 0.1)
		);
		--shadow-wallet-item-selected: var(
			--dapp-kit--shadow-wallet-item-selected,
			0px 2px 6px rgba(0, 0, 0, 0.05)
		);
	}

	* {
		box-sizing: border-box;

		color: var(--body-color);
		font-family: var(--typography-font-family);
		font-size: var(--font-size-medium);
		font-style: var(--typography-font-style);
		font-weight: var(--font-weight-normal);
		line-height: var(--typography-line-height);
		letter-spacing: var(--typography-letter-spacing);
	}

	dialog {
		padding: 0;
		border: none;
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

	a {
		text-decoration: none;
		color: inherit;
		outline: none;
	}

	ol,
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

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
