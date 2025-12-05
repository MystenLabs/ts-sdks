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

export const ConnectButtonExample = createClientOnlyExample(() =>
	import('./wallet-components').then((mod) => ({ default: mod.ConnectButtonExample })),
);

export const ControlledConnectModalExample = createClientOnlyExample(() =>
	import('./wallet-components').then((mod) => ({ default: mod.ControlledConnectModalExample })),
);

export const UncontrolledConnectModalExample = createClientOnlyExample(() =>
	import('./wallet-components').then((mod) => ({
		default: mod.UncontrolledConnectModalExample,
	})),
);
