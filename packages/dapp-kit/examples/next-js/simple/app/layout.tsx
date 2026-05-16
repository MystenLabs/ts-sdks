// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'DApp Next Kit - Next.js Simple Example',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
