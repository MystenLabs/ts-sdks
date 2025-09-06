// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ConnectButton } from '@mysten/dapp-kit-react';
import { useState, useEffect } from 'react';
import { CounterDemo } from './demos/CounterDemo.js';
import { TransferDemo } from './demos/TransferDemo.js';
import { WalletDemo } from './demos/WalletDemo.js';
import { NFTMintDemo } from './demos/NFTMintDemo.js';
import { WalrusDemo } from './demos/WalrusDemo.js';
import { NetworkSwitcher } from './components/NetworkSwitcher.js';

type DemoTab = 'counter' | 'transfer' | 'wallet' | 'nft-mint' | 'walrus';

interface Demo {
	id: DemoTab;
	name: string;
	description: string;
	icon: string;
	component: React.ComponentType;
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
		<div
			style={{
				backgroundColor: '#ffffff',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
			}}
		>
			{/* Header */}
			<div
				style={{
					padding: '20px 32px',
					borderBottom: '1px solid #e0e0e0',
					backgroundColor: '#fafafa',
					flexShrink: 0,
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '16px',
					}}
				>
					<div>
						<h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#333' }}>
							Sui Demo Suite
						</h1>
						<p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>
							Interactive demos showcasing Sui blockchain capabilities
						</p>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
						<NetworkSwitcher />
						<ConnectButton />
					</div>
				</div>
			</div>

			{/* Tab Navigation */}
			<div
				style={{
					padding: '0 32px',
					backgroundColor: '#fff',
					borderBottom: '1px solid #e0e0e0',
					display: 'flex',
					gap: '4px',
					overflowX: 'auto',
					flexShrink: 0,
				}}
			>
				{DEMOS.map((demo) => (
					<button
						key={demo.id}
						onClick={() => handleTabChange(demo.id)}
						style={{
							padding: '12px 20px',
							border: 'none',
							backgroundColor: 'transparent',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: '500',
							color: activeTab === demo.id ? '#1976d2' : '#666',
							borderBottom: activeTab === demo.id ? '2px solid #1976d2' : '2px solid transparent',
							transition: 'all 0.2s ease',
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							whiteSpace: 'nowrap',
						}}
						onMouseEnter={(e) => {
							if (activeTab !== demo.id) {
								e.currentTarget.style.backgroundColor = '#f5f5f5';
							}
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = 'transparent';
						}}
					>
						<span style={{ fontSize: '16px' }}>{demo.icon}</span>
						{demo.name}
					</button>
				))}
			</div>

			{/* Demo Content */}
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						padding: '24px 32px',
						borderBottom: '1px solid #e0e0e0',
						backgroundColor: '#fff',
						flexShrink: 0,
					}}
				>
					<h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600', color: '#333' }}>
						{activeDemo.icon} {activeDemo.name}
					</h2>
					<p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{activeDemo.description}</p>
				</div>

				<div
					style={{
						flex: 1,
						padding: '32px',
						backgroundColor: '#fafafa',
						overflow: 'auto',
					}}
				>
					<div
						style={{
							maxWidth: '800px',
							margin: '0 auto',
						}}
					>
						<ActiveComponent />
					</div>
				</div>
			</div>
		</div>
	);
}
