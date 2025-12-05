// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

'use client';

import dynamic from 'next/dynamic';

// Simple client-only wrapper using Next.js dynamic imports
// This prevents SSR for wallet components which require browser APIs
function createClientOnlyExample(importFn: () => Promise<{ default: React.ComponentType }>) {
	return dynamic(importFn, {
		ssr: false,
		loading: () => <div>Loading...</div>,
	});
}

export const UseWalletsExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseWalletsExample })),
);

export const UseAccountsExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseAccountsExample })),
);

export const UseCurrentWalletExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseCurrentWalletExample })),
);

export const UseCurrentAccountExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseCurrentAccountExample })),
);

export const UseAutoConnectionStatusExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseAutoConnectionStatusExample })),
);

export const UseConnectWalletExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseConnectWalletExample })),
);

export const UseDisconnectWalletExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseDisconnectWalletExample })),
);

export const UseSwitchAccountExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseSwitchAccountExample })),
);

export const UseSignPersonalMessageExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseSignPersonalMessageExample })),
);

export const UseSignTransactionExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseSignTransactionExample })),
);

export const UseSignAndExecuteTransactionExample = createClientOnlyExample(() =>
	import('./wallet-hooks').then((mod) => ({ default: mod.UseSignAndExecuteTransactionExample })),
);
