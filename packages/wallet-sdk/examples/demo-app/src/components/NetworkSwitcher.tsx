// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentNetwork } from '@mysten/dapp-kit-react';
import { dAppKit } from '../dApp-kit.js';
import { useState, useRef, useEffect } from 'react';
import type { NetworkName } from '../constants/networks.js';

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
		<div style={{ position: 'relative' }} ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				style={{
					padding: '8px 12px',
					backgroundColor: '#fff',
					border: '1px solid #e0e0e0',
					borderRadius: '6px',
					fontSize: '13px',
					fontWeight: '500',
					color: '#333',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					gap: '6px',
					minWidth: '110px',
					justifyContent: 'space-between',
					transition: 'all 0.2s ease',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderColor = '#1976d2';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = '#e0e0e0';
				}}
			>
				<span
					style={{
						width: '8px',
						height: '8px',
						borderRadius: '50%',
						backgroundColor: '#4caf50',
						flexShrink: 0,
					}}
				/>
				<span>{currentNetworkLabel}</span>
				<span
					style={{
						fontSize: '10px',
						transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
						transition: 'transform 0.2s ease',
					}}
				>
					▼
				</span>
			</button>

			{isOpen && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						right: 0,
						marginTop: '4px',
						backgroundColor: '#fff',
						border: '1px solid #e0e0e0',
						borderRadius: '6px',
						boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
						zIndex: 1000,
						minWidth: '110px',
						overflow: 'hidden',
					}}
				>
					{NETWORKS.map((network) => {
						const isSelected =
							network.value === currentNetwork || `sui:${network.value}` === currentNetwork;
						return (
							<button
								key={network.value}
								onClick={() => handleNetworkChange(network.value)}
								disabled={isSelected}
								style={{
									width: '100%',
									padding: '10px 12px',
									border: 'none',
									backgroundColor: isSelected ? '#f0f0f0' : '#fff',
									color: isSelected ? '#666' : '#333',
									fontSize: '13px',
									fontWeight: isSelected ? '600' : '400',
									cursor: isSelected ? 'default' : 'pointer',
									textAlign: 'left',
									transition: 'background-color 0.2s ease',
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
								}}
								onMouseEnter={(e) => {
									if (!isSelected) {
										e.currentTarget.style.backgroundColor = '#f5f5f5';
									}
								}}
								onMouseLeave={(e) => {
									if (!isSelected) {
										e.currentTarget.style.backgroundColor = '#fff';
									}
								}}
							>
								{isSelected && <span style={{ fontSize: '10px', color: '#1976d2' }}>✓</span>}
								{!isSelected && <span style={{ width: '10px' }} />}
								{network.label}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
