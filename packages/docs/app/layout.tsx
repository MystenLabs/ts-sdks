// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import './global.css';

import { Banner } from 'fumadocs-ui/components/banner';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import CloudFlareAnalytics from '@/components/CloudFlareAnalytics';
import { KapaSidebar } from '@/components/KapaWidget';

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
				<Script
					src="https://plausible.io/js/pa-T9dmzJpMQ4mBp3o0cRu9L.js"
					strategy="afterInteractive"
				/>
				<Script id="plausible-init" strategy="afterInteractive">
					{`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
				</Script>
			</head>
			<body className="flex flex-col min-h-screen">
				<a
					href="/llms.txt"
					style={{
						position: 'absolute',
						width: '1px',
						height: '1px',
						overflow: 'hidden',
						clip: 'rect(0,0,0,0)',
						whiteSpace: 'nowrap',
					}}
				>
					llms.txt
				</a>
				<Banner id="sdk-2-migration">
					@mysten/sui v2.0 and a new dApp Kit are here!&nbsp;
					<Link href="/sui/migrations/sui-2.0" className="underline">
						Check out the migration guide
					</Link>
				</Banner>
				<RootProvider>{children}</RootProvider>
				<CloudFlareAnalytics />
				<KapaSidebar />
				<Script
					src="https://widget.kapa.ai/kapa-widget.bundle.js"
					data-website-id="f40e82ec-5fe9-4776-a287-f889da70eaaa"
					data-project-name="Sui SDK Knowledge"
					data-project-color="#298DFF"
					data-button-hide="true"
					data-view-mode="sidebar"
					data-modal-title="Ask SDK AI"
					data-modal-ask-ai-input-placeholder="Ask me anything about the Sui SDKs!"
					data-modal-example-questions="How do I create a transaction in TypeScript?,How do I connect a wallet with dApp Kit?,How do I query objects with the Sui SDK?,How do I use BCS encoding?"
					data-modal-overlay-hidden="true"
					data-modal-lock-scroll="false"
					strategy="afterInteractive"
				/>
			</body>
		</html>
	);
}
