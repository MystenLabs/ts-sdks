// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';
import { sharedStyles } from '../styles/index.js';
import { iconButtonStyles } from '../styles/icon-button.js';

export const styles = [
	sharedStyles,
	iconButtonStyles,
	css`
		:host {
			display: block;
			width: fit-content;
		}

		[role='menu'] {
			display: none;
		}

		[aria-expanded='true'] + [role='menu'] {
			display: flex;
			flex-direction: column;
			max-width: fit-content;
			min-width: 240px;
			padding: 4px;
			position: absolute;
			outline: none;
			background-color: var(--dapp-kit-popover);
			color: var(--dapp-kit-popover-foreground);
			border-radius: var(--dapp-kit-radius-lg);
			border: 1px solid var(--dapp-kit-border);
			box-shadow:
				0 4px 6px -1px rgba(0, 0, 0, 0.1),
				0 2px 4px -2px rgba(0, 0, 0, 0.1);
		}

		[role='menuitem'],
		[role='menuitemradio'] {
			cursor: default;
		}

		[role='separator'] {
			height: 1px;
			margin-left: -4px;
			margin-right: -4px;
			margin-top: 4px;
			margin-bottom: 4px;
			background-color: var(--dapp-kit-border);
		}

		img {
			width: 24px;
			height: 24px;
			border-radius: 96px;
		}

		.current-account-container {
			display: flex;
			align-items: center;
			padding-left: 8px;
			padding-right: 8px;
			padding-top: 6px;
			padding-bottom: 6px;
			gap: 8px;
		}

		.connected-text {
			color: var(--dapp-kit-muted-foreground);
			font-size: 12px;
		}

		[aria-expanded='true'] .chevron {
			transition: transform 0.3s ease;
			transform: rotate(180deg);
		}

		.chevron {
			display: flex;
		}

		.chevron svg {
			width: 16px;
			height: 16px;
		}

		.copy-address-button {
			margin-left: auto;
		}

		.copy-address-success {
			width: 24px;
			height: 24px;
		}

		.trigger-content {
			display: flex;
			align-items: center;
			font-weight: var(--dapp-kit-font-weight-semibold);
			gap: 8px;
		}

		.accounts-container {
			padding-left: 8px;
			padding-right: 8px;
		}

		.accounts-label {
			color: var(--dapp-kit-muted-foreground);
			font-weight: var(--dapp-kit-font-weight-medium);
			padding-top: 4px;
			padding-bottom: 4px;
			font-size: 13px;
		}

		.accounts-list {
			display: flex;
			flex-direction: column;
			gap: 4px;
			max-height: 240px;
			overflow-y: auto;
		}

		.actions-container {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.action-menu-item {
			border-radius: var(--dapp-kit-radius-sm);
			display: flex;
			align-items: center;
			font-size: 14px;
			padding: 8px;
			gap: 8px;
			width: 100%;
		}

		.action-menu-item:hover,
		.action-menu-item:focus {
			background-color: var(--dapp-kit-accent);
			outline: 2px solid transparent;
			outline-offset: 2px;
		}

		.action-menu-item svg {
			color: var(--dapp-kit-muted-foreground);
			width: 16px;
			height: 16px;
		}
	`,
];
