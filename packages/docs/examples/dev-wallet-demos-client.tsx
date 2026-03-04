// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

'use client';

import dynamic from 'next/dynamic';

function createClientOnlyExample(importFn: () => Promise<{ default: React.ComponentType }>) {
	return dynamic(importFn, {
		ssr: false,
		loading: () => <div style={{ padding: 20, color: '#666' }}>Loading demo...</div>,
	});
}

export const InMemoryAdapterDemo = createClientOnlyExample(() =>
	import('./dev-wallet-demos').then((mod) => ({ default: mod.InMemoryAdapterDemo })),
);

export const SigningFlowDemo = createClientOnlyExample(() =>
	import('./dev-wallet-demos').then((mod) => ({ default: mod.SigningFlowDemo })),
);

export const AutoApprovalDemo = createClientOnlyExample(() =>
	import('./dev-wallet-demos').then((mod) => ({ default: mod.AutoApprovalDemo })),
);
