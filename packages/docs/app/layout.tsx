// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import './global.css';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import CloudFlareAnalytics from '@/components/CloudFlareAnalytics';

export const metadata: Metadata = {
	title: {
		template: '%s | Mysten Labs TypeScript SDK Docs',
		default: 'Mysten Labs TypeScript SDK Docs',
	},
	description:
		'Mysten Labs TypeScript SDK Docs. Discover the power of Sui and Walrus through examples, guides, and concepts.',
	openGraph: {
		title: 'Mysten Labs TypeScript SDK Docs',
		description:
			'Mysten Labs TypeScript SDK Docs. Discover the power of Sui and Walrus through examples, guides, and concepts.',
		siteName: 'Mysten Labs TypeScript SDK Docs',
	},
	appleWebApp: {
		title: 'Mysten Labs TypeScript SDK Docs',
	},
};

const inter = Inter({
	subsets: ['latin'],
});

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<head>
				<meta
					name="google-site-verification"
					content="T-2HWJAKh8s63o9KFxCFXg5MON_NGLJG76KJzr_Hp0A"
				/>
				<meta httpEquiv="Content-Language" content="en" />
				<meta name="algolia-site-verification" content="BCA21DA2879818D2" />
			</head>
			<body className="flex flex-col min-h-screen">
				<RootProvider>{children}</RootProvider>
				<CloudFlareAnalytics />
			</body>
		</html>
	);
}
