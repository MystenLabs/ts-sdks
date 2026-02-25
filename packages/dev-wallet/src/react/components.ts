// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createComponent, type EventName } from '@lit/react';
import * as React from 'react';

import { DevWalletAccounts as DevWalletAccountsElement } from '../ui/dev-wallet-accounts.js';
import { DevWalletBalances as DevWalletBalancesElement } from '../ui/dev-wallet-balances.js';
import { DevWalletNewAccount as DevWalletNewAccountElement } from '../ui/dev-wallet-new-account.js';
import { DevWalletPanel as DevWalletPanelElement } from '../ui/dev-wallet-panel.js';
import { DevWalletSigning as DevWalletSigningElement } from '../ui/dev-wallet-signing.js';

/**
 * React wrapper for the `<dev-wallet-panel>` Lit component.
 * Floating panel with trigger button for wallet management (accounts, balances)
 * and a modal overlay for signing approvals.
 */
export const DevWalletPanel = createComponent({
	react: React,
	tagName: 'dev-wallet-panel',
	elementClass: DevWalletPanelElement,
});

/** @deprecated Use `DevWalletPanel` instead. */
export const DevWalletDrawer = DevWalletPanel;

/**
 * React wrapper for the `<dev-wallet-accounts>` Lit component.
 * Displays a list of accounts with selection and creation support.
 */
export const DevWalletAccounts = createComponent({
	react: React,
	tagName: 'dev-wallet-accounts',
	elementClass: DevWalletAccountsElement,
	events: {
		onAccountSelected: 'account-selected' as EventName<CustomEvent>,
	},
});

/**
 * React wrapper for the `<dev-wallet-balances>` Lit component.
 * Displays coin balances for an account.
 */
export const DevWalletBalances = createComponent({
	react: React,
	tagName: 'dev-wallet-balances',
	elementClass: DevWalletBalancesElement,
});

/**
 * React wrapper for the `<dev-wallet-new-account>` Lit component.
 * Dialog for creating a new account with label input.
 */
export const DevWalletNewAccount = createComponent({
	react: React,
	tagName: 'dev-wallet-new-account',
	elementClass: DevWalletNewAccountElement,
	events: {
		onClose: 'close' as EventName<CustomEvent>,
		onAccountCreated: 'account-created' as EventName<CustomEvent>,
	},
});

/**
 * React wrapper for the `<dev-wallet-signing>` Lit component.
 * Shows pending signing request details with approve/reject buttons.
 */
export const DevWalletSigning = createComponent({
	react: React,
	tagName: 'dev-wallet-signing',
	elementClass: DevWalletSigningElement,
	events: {
		onApprove: 'approve' as EventName<CustomEvent>,
		onReject: 'reject' as EventName<CustomEvent>,
	},
});
