// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<DocsLayout
			{...baseOptions}
			tree={source.pageTree}
			sidebar={{
				tabs: [
					{
						title: 'Sui SDK',
						description: 'TypeScript interfaces for Sui',
						url: '/typescript',
					},
					{
						title: 'BCS',
						description: 'Encoding and decoding Sui objects',
						url: '/bcs',
					},
					{
						title: 'Dapp Kit',
						description: 'Build Sui dapps in React',
						url: '/dapp-kit',
					},
					{
						title: 'Kiosk',
						description: 'Interact with on-chain commerce applications',
						url: '/kiosk',
					},
					{
						title: 'Payment Kit',
						description: 'Typescript SDK to leverage the Payment Kit Standard',
						url: '/payment-kit',
					},
					{
						title: 'Walrus',
						description: 'Publish and Read blobs directly from walrus storage nodes',
						url: '/walrus',
					},
					{
						title: 'zkSend',
						description: 'Send Sui with a link',
						url: '/zksend',
					},
					{
						title: 'API Reference',
						url: '/typedoc/index.html',
					},
				],
			}}
		>
			{children}
		</DocsLayout>
	);
}
