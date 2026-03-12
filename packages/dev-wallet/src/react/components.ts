// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

if (typeof customElements === 'undefined') {
	throw new Error(
		'@mysten/dev-wallet/react components require a browser environment. ' +
			'Use dynamic imports with ssr:false in Next.js.',
	);
}

import { createComponent, type EventName } from '@lit/react';
import * as React from 'react';

import { DevWalletAccounts as DevWalletAccountsElement } from '../ui/dev-wallet-accounts.js';
import { DevWalletBalances as DevWalletBalancesElement } from '../ui/dev-wallet-balances.js';
import { DevWalletNewAccount as DevWalletNewAccountElement } from '../ui/dev-wallet-new-account.js';
import { DevWalletPanel as DevWalletPanelElement } from '../ui/dev-wallet-panel.js';
import { DevWalletSigning as DevWalletSigningElement } from '../ui/dev-wallet-signing.js';

export const DevWalletPanel = createComponent({
	react: React,
	tagName: 'dev-wallet-panel',
	elementClass: DevWalletPanelElement,
});

export const DevWalletAccounts = createComponent({
	react: React,
	tagName: 'dev-wallet-accounts',
	elementClass: DevWalletAccountsElement,
	events: {
		onAccountSelected: 'account-selected' as EventName<
			CustomEvent<{ account: import('@mysten/wallet-standard').ReadonlyWalletAccount }>
		>,
		onAccountRenamed: 'account-renamed' as EventName<
			CustomEvent<{ address: string; label: string }>
		>,
	},
});

export const DevWalletBalances = createComponent({
	react: React,
	tagName: 'dev-wallet-balances',
	elementClass: DevWalletBalancesElement,
});

export const DevWalletNewAccount = createComponent({
	react: React,
	tagName: 'dev-wallet-new-account',
	elementClass: DevWalletNewAccountElement,
	events: {
		onClose: 'close' as EventName<CustomEvent>,
		onAccountCreated: 'account-created' as EventName<CustomEvent>,
	},
});

export const DevWalletSigning = createComponent({
	react: React,
	tagName: 'dev-wallet-signing',
	elementClass: DevWalletSigningElement,
	events: {
		onApprove: 'approve' as EventName<CustomEvent>,
		onReject: 'reject' as EventName<CustomEvent>,
	},
});
