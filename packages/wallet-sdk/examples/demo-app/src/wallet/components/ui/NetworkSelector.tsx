// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiChain } from '@mysten/wallet-standard';
import {
	SUI_DEVNET_CHAIN,
	SUI_TESTNET_CHAIN,
	SUI_LOCALNET_CHAIN,
	SUI_MAINNET_CHAIN,
} from '@mysten/wallet-standard';

interface NetworkSelectorProps {
	value: SuiChain;
	onChange: (network: SuiChain) => void;
	className?: string;
}

const networkLabels = {
	[SUI_TESTNET_CHAIN]: 'Testnet',
	[SUI_DEVNET_CHAIN]: 'Devnet',
	[SUI_MAINNET_CHAIN]: 'Mainnet',
	[SUI_LOCALNET_CHAIN]: 'Localnet',
};

export function NetworkSelector({ value, onChange, className = '' }: NetworkSelectorProps) {
	return (
		<div className={`relative ${className}`}>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value as SuiChain)}
				className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-w-0"
			>
				<option value={SUI_TESTNET_CHAIN}>{networkLabels[SUI_TESTNET_CHAIN]}</option>
				<option value={SUI_DEVNET_CHAIN}>{networkLabels[SUI_DEVNET_CHAIN]}</option>
				<option value={SUI_MAINNET_CHAIN}>{networkLabels[SUI_MAINNET_CHAIN]}</option>
				<option value={SUI_LOCALNET_CHAIN}>{networkLabels[SUI_LOCALNET_CHAIN]}</option>
			</select>
			{/* Custom dropdown arrow with proper spacing */}
			<div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
				<svg
					className="w-4 h-4 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</div>
		</div>
	);
}
