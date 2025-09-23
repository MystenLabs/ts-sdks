// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Card, CardContent } from './Card.js';

interface ConnectWalletPromptProps {
	icon?: string;
	title?: string;
	description?: string;
}

export function ConnectWalletPrompt({
	icon = '🔌',
	title = 'Connect Your Wallet',
	description = 'Please connect your wallet to use this demo',
}: ConnectWalletPromptProps) {
	return (
		<Card variant="elevated" className="max-w-md mx-auto text-center">
			<CardContent className="p-8">
				<div className="text-4xl mb-4">{icon}</div>
				<h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
				<p className="text-gray-600">{description}</p>
			</CardContent>
		</Card>
	);
}
