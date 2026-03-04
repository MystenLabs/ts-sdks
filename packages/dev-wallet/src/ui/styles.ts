// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { css } from 'lit';

const resetStyles = css`
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

	:focus-visible {
		outline: 2px solid var(--dev-wallet-ring);
		outline-offset: 2px;
	}
`;

const themeStyles = css`
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
		--dev-wallet-status-connected: #22c55e;
		--dev-wallet-status-disconnected: #6b7280;

		/* Radius scale — derived from base */
		--dev-wallet-radius: 12px;
		--dev-wallet-radius-xs: calc(var(--dev-wallet-radius) - 6px);
		--dev-wallet-radius-sm: calc(var(--dev-wallet-radius) - 4px);
		--dev-wallet-radius-md: calc(var(--dev-wallet-radius) - 2px);
		--dev-wallet-radius-xl: calc(var(--dev-wallet-radius) + 4px);
		--dev-wallet-radius-2xs: 3px;

		/* Shadows */
		--dev-wallet-shadow-sm: 0 1px 3px color-mix(in oklab, oklch(0 0 0) 10%, transparent);
		--dev-wallet-shadow-md: 0 4px 12px color-mix(in oklab, oklch(0 0 0) 30%, transparent);

		/* Typography */
		--dev-wallet-font-sans:
			ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
			'Helvetica Neue', Arial, sans-serif;
		--dev-wallet-font-weight-medium: 500;
		--dev-wallet-font-weight-semibold: 600;
		--dev-wallet-font-mono:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
		--dev-wallet-shadow-lg: 0 8px 32px color-mix(in oklab, oklch(0 0 0) 40%, transparent);
	}
`;

export const dropdownItemStyles = css`
	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		font-size: 12px;
		color: var(--dev-wallet-foreground);
		text-align: left;
	}

	.dropdown-item:hover {
		background: var(--dev-wallet-secondary);
	}

	.dropdown-item[aria-selected='true'] {
		font-weight: var(--dev-wallet-font-weight-semibold);
	}
`;

export const connectDialogStyles = css`
	.connect-dialog {
		width: 360px;
		max-height: min(600px, 80vh);
		border-radius: var(--dev-wallet-radius-xl);
		background: var(--dev-wallet-background);
		border: 1px solid var(--dev-wallet-border);
		box-shadow: var(--dev-wallet-shadow-lg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		padding: 0;
		color: inherit;
	}

	.connect-dialog::backdrop {
		background: color-mix(in oklab, oklch(0 0 0) 50%, transparent);
	}

	.connect-dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 16px;
		border-bottom: 1px solid var(--dev-wallet-border);
	}

	.connect-dialog-title {
		font-size: 15px;
		font-weight: var(--dev-wallet-font-weight-semibold);
		color: var(--dev-wallet-foreground);
	}
`;

export const actionButtonStyles = css`
	.actions {
		display: flex;
		gap: 8px;
	}

	.btn {
		flex: 1;
		padding: 10px 16px;
		border-radius: var(--dev-wallet-radius-md);
		font-size: 13px;
		font-weight: var(--dev-wallet-font-weight-semibold);
		transition: background-color 0.15s;
	}

	.btn-approve {
		background: var(--dev-wallet-positive);
		color: var(--dev-wallet-primary-foreground);
	}

	.btn-approve:hover {
		background: oklab(from var(--dev-wallet-positive) calc(l - 0.03) a b);
	}

	.btn-reject {
		background: var(--dev-wallet-destructive);
		color: var(--dev-wallet-primary-foreground);
	}

	.btn-reject:hover {
		background: oklab(from var(--dev-wallet-destructive) calc(l - 0.05) a b);
	}

	.btn-cancel {
		background: var(--dev-wallet-secondary);
		color: var(--dev-wallet-foreground);
		border: 1px solid var(--dev-wallet-border);
	}

	.btn-cancel:hover {
		background: oklab(from var(--dev-wallet-secondary) calc(l - 0.02) a b);
	}

	.btn-create {
		background: var(--dev-wallet-primary);
		color: var(--dev-wallet-primary-foreground);
	}

	.btn-create:hover {
		background: oklab(from var(--dev-wallet-primary) calc(l - 0.03) a b);
	}

	.btn-create:disabled,
	.btn-approve:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
`;

export const stateStyles = css`
	.loading,
	.empty-state,
	.error-state {
		text-align: center;
		padding: 16px;
		font-size: 13px;
	}

	.loading {
		color: var(--dev-wallet-muted-foreground);
	}

	.empty-state {
		color: var(--dev-wallet-muted-foreground);
	}

	.error-state {
		color: var(--dev-wallet-destructive);
	}
`;

export const sectionHeaderStyles = css`
	.section-header {
		font-size: 13px;
		font-weight: var(--dev-wallet-font-weight-semibold);
		color: var(--dev-wallet-muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 12px;
	}
`;

export const dialogBackdropStyles = css`
	dialog::backdrop {
		background: color-mix(in oklab, oklch(0 0 0) 50%, transparent);
	}
`;

export const cardBaseStyles = css`
	.card-base {
		width: 360px;
		max-height: min(600px, 80vh);
		border-radius: var(--dev-wallet-radius-xl);
		background: var(--dev-wallet-background);
		border: 1px solid var(--dev-wallet-border);
		box-shadow: var(--dev-wallet-shadow-lg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		padding: 0;
		color: inherit;
	}
`;

export const panelHeaderStyles = css`
	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 16px;
		border-bottom: 1px solid var(--dev-wallet-border);
	}

	.panel-title {
		font-size: 15px;
		font-weight: var(--dev-wallet-font-weight-semibold);
		color: var(--dev-wallet-foreground);
	}

	.panel-close-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--dev-wallet-radius-xs);
		font-size: 14px;
		color: var(--dev-wallet-muted-foreground);
		transition: background 0.15s;
	}

	.panel-close-btn:hover {
		background: var(--dev-wallet-secondary);
	}
`;

export const listItemStyles = css`
	.item-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.item-card {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: var(--dev-wallet-radius-sm);
		background: var(--dev-wallet-secondary);
		transition: background 0.15s;
	}

	.item-card:hover {
		background: oklab(from var(--dev-wallet-secondary) calc(l + 0.02) a b);
	}
`;

export const badgeStyles = css`
	.badge-pill {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: var(--dev-wallet-radius-2xs);
		background: var(--dev-wallet-muted);
		color: var(--dev-wallet-muted-foreground);
	}
`;

export const copyableAddressStyles = css`
	.copyable-addr {
		cursor: pointer;
		border-radius: var(--dev-wallet-radius-2xs);
		padding: 1px 3px;
		transition: background 0.15s;
		font-family: var(--dev-wallet-font-mono);
	}

	.copyable-addr:hover {
		background: color-mix(in oklab, var(--dev-wallet-primary) 15%, transparent);
	}

	.copyable-addr.copied {
		color: var(--dev-wallet-positive);
	}
`;

const reducedMotionStyles = css`
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
`;

export const sharedStyles = [resetStyles, themeStyles, reducedMotionStyles];
