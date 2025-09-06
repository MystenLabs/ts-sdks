// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { formatAddress } from '../../utils/format.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { SUI_DEVNET_CHAIN, SUI_TESTNET_CHAIN, SUI_MAINNET_CHAIN } from '@mysten/wallet-standard';
import type { SuiChain } from '@mysten/wallet-standard';

interface AccountInfoProps {
	accounts: ReadonlyWalletAccount[];
	activeAccountIndex: number;
	onSwitchAccount: (index: number) => void;
	onAddAccount: () => void;
	onRemoveAccount: (index: number) => void;
	onRenameAccount: (index: number, newLabel: string) => void;
	activeNetwork: SuiChain;
	onNetworkSwitch: (network: SuiChain) => void;
}

export function AccountInfo({
	accounts,
	activeAccountIndex,
	onSwitchAccount,
	onAddAccount,
	onRemoveAccount,
	onRenameAccount,
	activeNetwork,
	onNetworkSwitch,
}: AccountInfoProps) {
	const [copied, setCopied] = useState(false);
	const [showRemoveDialog, setShowRemoveDialog] = useState<number | null>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingValue, setEditingValue] = useState('');

	const activeAccount = accounts[activeAccountIndex];

	const handleCopy = () => {
		if (activeAccount) {
			navigator.clipboard.writeText(activeAccount.address);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleRemoveAccount = (index: number) => {
		onRemoveAccount(index);
		setShowRemoveDialog(null);
	};

	const startEditing = (index: number) => {
		setEditingIndex(index);
		setEditingValue(accounts[index].label || '');
	};

	const finishEditing = () => {
		if (editingIndex !== null && editingValue.trim()) {
			onRenameAccount(editingIndex, editingValue.trim());
		}
		setEditingIndex(null);
		setEditingValue('');
	};

	const cancelEditing = () => {
		setEditingIndex(null);
		setEditingValue('');
	};

	return (
		<div>
			{/* Wallet Header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '16px',
					borderBottom: '1px solid #e0e0e0',
					backgroundColor: '#fafafa',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
					<img
						src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHBhdGggZD0iTTI0IDJMNDIgMTJWMzZMMjQgNDZMNiAzNlYxMkwyNCAyWiIgZmlsbD0iIzRkYTJmZiIvPiA8cmVjdCB4PSIxMiIgeT0iMTYiIHdpZHRoPSIyNCIgaGVpZ2h0PSIxNiIgcng9IjMiIGZpbGw9IndoaXRlIi8+IDxyZWN0IHg9IjEyIiB5PSIxNiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjUiIHJ4PSIzIiBmaWxsPSIjMjE5NkYzIi8+IDxyZWN0IHg9IjI4IiB5PSIyMiIgd2lkdGg9IjYiIGhlaWdodD0iNCIgcng9IjEuNSIgZmlsbD0iIzRkYTJmZiIvPiA8Y2lyY2xlIGN4PSIzMSIgY3k9IjI0IiByPSIxIiBmaWxsPSJ3aGl0ZSIvPiA8L3N2Zz4="
						alt="Demo Wallet"
						width="32"
						height="32"
						style={{ display: 'block' }}
					/>
					<div>
						<div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>Demo Wallet</div>
						<div style={{ fontSize: '12px', color: '#666' }}>
							{activeAccount?.label} • {accounts.length} account{accounts.length !== 1 ? 's' : ''}
						</div>
					</div>
				</div>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					style={{
						padding: '4px',
						backgroundColor: 'transparent',
						border: 'none',
						cursor: 'pointer',
						fontSize: '12px',
						color: '#666',
						transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
						transition: 'transform 0.2s ease',
					}}
				>
					▼
				</button>
			</div>

			{/* Network Selector */}
			<div
				style={{
					padding: '12px 20px',
					borderBottom: '1px solid #e0e0e0',
					backgroundColor: '#fafafa',
				}}
			>
				<div style={{ fontSize: '12px', fontWeight: '500', color: '#666', marginBottom: '8px' }}>
					Network
				</div>
				<select
					value={activeNetwork}
					onChange={(e) => onNetworkSwitch(e.target.value as SuiChain)}
					style={{
						width: '100%',
						padding: '8px 12px',
						border: '1px solid #ddd',
						borderRadius: '6px',
						fontSize: '14px',
						backgroundColor: 'white',
						cursor: 'pointer',
					}}
				>
					<option value={SUI_MAINNET_CHAIN}>Mainnet</option>
					<option value={SUI_TESTNET_CHAIN}>Testnet</option>
					<option value={SUI_DEVNET_CHAIN}>Devnet</option>
				</select>
			</div>

			{/* Account List */}
			{isExpanded && (
				<div style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #e0e0e0' }}>
					{accounts.map((account, index) => (
						<div
							key={account.address}
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '12px 16px',
								backgroundColor: index === activeAccountIndex ? '#e3f2fd' : 'transparent',
								borderLeft:
									index === activeAccountIndex ? '3px solid #1976d2' : '3px solid transparent',
								cursor: 'pointer',
								transition: 'background-color 0.2s ease',
							}}
							onClick={() => onSwitchAccount(index)}
							onMouseEnter={(e) => {
								if (index !== activeAccountIndex) {
									e.currentTarget.style.backgroundColor = '#f0f0f0';
								}
							}}
							onMouseLeave={(e) => {
								if (index !== activeAccountIndex) {
									e.currentTarget.style.backgroundColor = 'transparent';
								}
							}}
						>
							<div style={{ flex: 1 }}>
								{editingIndex === index ? (
									<input
										type="text"
										value={editingValue}
										onChange={(e) => setEditingValue(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') finishEditing();
											if (e.key === 'Escape') cancelEditing();
										}}
										onBlur={finishEditing}
										autoFocus
										style={{
											fontSize: '13px',
											fontWeight: '500',
											color: '#333',
											marginBottom: '2px',
											border: '1px solid #1976d2',
											borderRadius: '2px',
											padding: '2px 4px',
											backgroundColor: '#fff',
											width: '100%',
										}}
									/>
								) : (
									<div
										style={{
											fontSize: '13px',
											fontWeight: '500',
											color: '#333',
											marginBottom: '2px',
											cursor: 'text',
											padding: '2px 4px',
											borderRadius: '2px',
											transition: 'background-color 0.2s ease',
										}}
										onClick={(e) => {
											e.stopPropagation();
											startEditing(index);
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.backgroundColor = '#f0f0f0';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.backgroundColor = 'transparent';
										}}
									>
										{account.label}
									</div>
								)}
								<div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
									{formatAddress(account.address)}
								</div>
							</div>
							{accounts.length > 1 && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										setShowRemoveDialog(index);
									}}
									style={{
										padding: '4px',
										backgroundColor: 'transparent',
										border: '1px solid #ddd',
										borderRadius: '4px',
										cursor: 'pointer',
										fontSize: '12px',
										color: '#666',
										marginLeft: '8px',
									}}
									onMouseEnter={(e) => {
										e.currentTarget.style.backgroundColor = '#ff5722';
										e.currentTarget.style.color = 'white';
										e.currentTarget.style.borderColor = '#ff5722';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.backgroundColor = 'transparent';
										e.currentTarget.style.color = '#666';
										e.currentTarget.style.borderColor = '#ddd';
									}}
								>
									×
								</button>
							)}
						</div>
					))}
					<div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0' }}>
						<button
							onClick={onAddAccount}
							style={{
								width: '100%',
								padding: '8px',
								backgroundColor: '#1976d2',
								border: 'none',
								borderRadius: '4px',
								color: 'white',
								fontSize: '13px',
								fontWeight: '500',
								cursor: 'pointer',
								transition: 'background-color 0.2s ease',
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = '#1565c0';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = '#1976d2';
							}}
						>
							+ Add Account
						</button>
					</div>
				</div>
			)}

			{/* Active Account Details */}
			{activeAccount && (
				<div
					style={{
						backgroundColor: '#f5f5f5',
						padding: '12px 16px',
					}}
				>
					<div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Active Account</div>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
						}}
					>
						<div
							style={{
								fontSize: '13px',
								fontFamily: 'monospace',
								color: '#333',
								flex: 1,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{formatAddress(activeAccount.address)}
						</div>
						<button
							onClick={handleCopy}
							style={{
								padding: '4px 8px',
								backgroundColor: copied ? '#4caf50' : '#fff',
								border: '1px solid #ddd',
								borderRadius: '4px',
								fontSize: '11px',
								cursor: 'pointer',
								color: copied ? '#fff' : '#666',
								transition: 'all 0.2s ease',
								whiteSpace: 'nowrap',
							}}
						>
							{copied ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>
			)}

			{/* Remove Account Dialog */}
			<ConfirmDialog
				isOpen={showRemoveDialog !== null}
				title="Remove Account"
				message={
					showRemoveDialog !== null
						? `Are you sure you want to remove "${accounts[showRemoveDialog]?.label}"? This action cannot be undone and you will lose access to this account.`
						: ''
				}
				confirmLabel="Remove"
				onConfirm={() => showRemoveDialog !== null && handleRemoveAccount(showRemoveDialog)}
				onCancel={() => setShowRemoveDialog(null)}
			/>
		</div>
	);
}
