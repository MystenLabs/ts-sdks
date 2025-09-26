// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentNetwork } from '@mysten/dapp-kit-react';
import { dAppKit } from '../../../dApp-kit.js';
import { useState, useRef, useEffect } from 'react';
import type { NetworkName } from '../../constants/networks.js';

const NETWORKS: { value: NetworkName; label: string }[] = [
	{ value: 'testnet', label: 'Testnet' },
	{ value: 'mainnet', label: 'Mainnet' },
	{ value: 'devnet', label: 'Devnet' },
];

export function NetworkSwitcher() {
	const currentNetwork = useCurrentNetwork();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleNetworkChange = (network: NetworkName) => {
		try {
			dAppKit.switchNetwork(network);
		} catch (error) {
			console.error('Error switching network:', error);
		}
		setIsOpen(false);
	};

	const currentNetworkLabel =
		NETWORKS.find((n) => n.value === currentNetwork || `sui:${n.value}` === currentNetwork)
			?.label || 'Unknown';

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 cursor-pointer flex items-center gap-1.5 min-w-28 justify-between transition-all duration-200 hover:border-blue-500"
			>
				<span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
				<span>{currentNetworkLabel}</span>
				<span
					className={`text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
				>
					▼
				</span>
			</button>

			{isOpen && (
				<div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-28 overflow-hidden">
					{NETWORKS.map((network) => {
						const isSelected =
							network.value === currentNetwork || `sui:${network.value}` === currentNetwork;
						return (
							<button
								key={network.value}
								onClick={() => handleNetworkChange(network.value)}
								disabled={isSelected}
								className={`w-full px-3 py-2.5 border-none text-xs text-left transition-colors duration-200 flex items-center gap-2 ${
									isSelected
										? 'bg-gray-100 text-gray-600 font-semibold cursor-default'
										: 'bg-white text-gray-700 font-normal cursor-pointer hover:bg-gray-50'
								}`}
							>
								{isSelected && <span className="text-xs text-blue-600">✓</span>}
								{!isSelected && <span className="w-2.5" />}
								{network.label}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
