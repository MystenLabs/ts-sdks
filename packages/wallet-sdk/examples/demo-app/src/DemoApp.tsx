// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ConnectButton } from '@mysten/dapp-kit-react';
import { useState, useEffect } from 'react';
import { CounterDemo } from './app/demos/counter/CounterDemo.js';
import { TransferDemo } from './app/demos/transfer/TransferDemo.js';
import { WalletDemo } from './app/demos/wallet/WalletDemo.js';
import { NFTMintDemo } from './app/demos/nft/NFTMintDemo.js';
import { WalrusDemo } from './app/demos/walrus/WalrusDemo.js';
import { NetworkSwitcher } from './app/components/layout/NetworkSwitcher.js';

export type DemoTab = 'counter' | 'transfer' | 'wallet' | 'nft-mint' | 'walrus';

export interface DemoProps {
	onNavigate?: (tab: DemoTab) => void;
}

interface Demo {
	id: DemoTab;
	name: string;
	description: string;
	icon: string;
	component: React.ComponentType<DemoProps>;
}

const DEMOS: Demo[] = [
	{
		id: 'counter',
		name: 'Counter',
		description: 'On-chain counter with increment and reset',
		icon: '🔢',
		component: CounterDemo,
	},
	{
		id: 'transfer',
		name: 'Transfer',
		description: 'Send SUI tokens to other addresses',
		icon: '💸',
		component: TransferDemo,
	},
	{
		id: 'wallet',
		name: 'Wallet',
		description: 'View your balances and NFTs',
		icon: '👛',
		component: WalletDemo,
	},
	{
		id: 'nft-mint',
		name: 'Mint NFT',
		description: 'Create your own NFTs',
		icon: '🎨',
		component: NFTMintDemo,
	},
	{
		id: 'walrus',
		name: 'Walrus',
		description: 'Store files on Walrus and swap SUI for WAL tokens',
		icon: '🐋',
		component: WalrusDemo,
	},
];

export function DemoApp() {
	const [activeTab, setActiveTab] = useState<DemoTab>('counter');

	// Read initial tab from URL hash
	useEffect(() => {
		const hash = window.location.hash.slice(1); // Remove the # character
		const matchingDemo = DEMOS.find((demo) => demo.id === hash);
		if (matchingDemo) {
			setActiveTab(matchingDemo.id);
		}
	}, []);

	// Update URL hash when tab changes
	const handleTabChange = (tabId: DemoTab) => {
		setActiveTab(tabId);
		window.history.replaceState(null, '', `#${tabId}`);
	};

	const activeDemo = DEMOS.find((demo) => demo.id === activeTab) || DEMOS[0];
	const ActiveComponent = activeDemo.component;

	return (
		<div className="h-screen flex flex-col overflow-hidden">
			{/* Header */}
			<div className="px-8 py-5 border-b border-gray-200 bg-gray-50 shrink-0">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="m-0 text-gray-800 text-2xl font-semibold">Sui Demo Suite</h1>
						<p className="mt-2 mb-0 text-gray-600 text-sm">
							Interactive demos showcasing Sui blockchain capabilities
						</p>
					</div>
					<div className="flex gap-3">
						<NetworkSwitcher />
						<ConnectButton />
					</div>
				</div>
			</div>

			{/* Tab Navigation */}
			<div className="flex border-b border-gray-200 bg-white shrink-0">
				{DEMOS.map((demo) => (
					<button
						key={demo.id}
						onClick={() => handleTabChange(demo.id)}
						className={`px-5 py-3 border-0 cursor-pointer transition-all duration-200 flex items-center gap-2 text-sm border-b-2 ${
							activeTab === demo.id
								? 'bg-gray-100 text-gray-800 font-semibold border-blue-500'
								: 'bg-transparent text-gray-600 font-normal border-transparent hover:bg-gray-50'
						}`}
					>
						<span className="text-base">{demo.icon}</span>
						{demo.name}
					</button>
				))}
			</div>

			{/* Demo Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Demo Header */}
				<div className="px-8 py-6 border-b border-gray-200 bg-white shrink-0">
					<h2 className="m-0 text-gray-800 text-xl font-semibold">
						{activeDemo.icon} {activeDemo.name}
					</h2>
					<p className="mt-2 mb-0 text-gray-600 text-sm">{activeDemo.description}</p>
				</div>

				{/* Demo Component */}
				<div className="flex-1 overflow-auto">
					<div className="max-w-4xl mx-auto p-8">
						<ActiveComponent onNavigate={handleTabChange} />
					</div>
				</div>
			</div>
		</div>
	);
}
