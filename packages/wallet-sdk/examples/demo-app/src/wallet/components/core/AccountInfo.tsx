// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { formatAddress } from '../../utils/format.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';

interface AccountInfoProps {
	accounts: ReadonlyWalletAccount[];
	activeAccountIndex: number;
	onSwitchAccount: (index: number) => void;
	onAddAccount: () => void;
	onRemoveAccount: (index: number) => void;
	onRenameAccount: (index: number, newLabel: string) => void;
}

export function AccountInfo({
	accounts,
	activeAccountIndex,
	onSwitchAccount,
	onAddAccount,
	onRemoveAccount,
	onRenameAccount,
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
		<div className="border-b border-gray-200">
			{/* Account Selector Header */}
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 border-none bg-white cursor-pointer"
			>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
						{activeAccount?.label?.charAt(0).toUpperCase() || 'A'}
					</div>
					<div className="text-left">
						<div className="text-gray-800 font-medium text-sm">{activeAccount?.label}</div>
						<div className="text-gray-500 text-xs">
							{formatAddress(activeAccount?.address || '')}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-gray-400 text-xs">
						{accounts.length} account{accounts.length !== 1 ? 's' : ''}
					</span>
					<svg
						className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</div>
			</button>

			{/* Account Dropdown */}
			{isExpanded && (
				<div className="bg-gray-50 border-t border-gray-200">
					{/* Account List */}
					<div className="max-h-48 overflow-y-auto">
						{accounts.map((account, index) => (
							<div
								key={account.address}
								className={`group flex items-center justify-between px-5 py-3 hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${
									index === activeAccountIndex ? 'bg-blue-50 border-l-4 border-blue-500' : ''
								}`}
								onClick={() => {
									onSwitchAccount(index);
									setIsExpanded(false);
								}}
							>
								<div className="flex items-center gap-3 flex-1 min-w-0">
									<div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0">
										{account.label?.charAt(0).toUpperCase() || 'A'}
									</div>
									<div className="min-w-0 flex-1">
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
												className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
												onClick={(e) => e.stopPropagation()}
											/>
										) : (
											<div className="flex items-center gap-1">
												<div className="text-sm font-medium text-gray-800 truncate">
													{account.label}
												</div>
												<button
													onClick={(e) => {
														e.stopPropagation();
														startEditing(index);
													}}
													className="w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors duration-200 border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100"
													title="Rename account"
												>
													<svg
														className="w-3 h-3"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
														/>
													</svg>
												</button>
											</div>
										)}
										<div className="text-xs text-gray-500 truncate">
											{formatAddress(account.address)}
										</div>
									</div>
								</div>
								{accounts.length > 1 && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											setShowRemoveDialog(index);
										}}
										className="ml-2 w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors duration-200 border-none bg-transparent cursor-pointer"
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								)}
							</div>
						))}
					</div>

					{/* Add Account Button */}
					<div className="p-3 border-t border-gray-200">
						<button
							onClick={() => {
								onAddAccount();
								setIsExpanded(false);
							}}
							className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors duration-200 border-none cursor-pointer flex items-center justify-center gap-2"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Add Account
						</button>
					</div>
				</div>
			)}

			{/* Active Account Details with Copy */}
			{activeAccount && (
				<div className="px-5 py-3 bg-white border-t border-gray-100">
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<div className="text-xs text-gray-500 mb-1">Active Address</div>
							<div className="text-sm font-mono text-gray-700 truncate">
								{activeAccount.address}
							</div>
						</div>
						<button
							onClick={handleCopy}
							className={`ml-3 px-3 py-1 text-xs font-medium rounded border transition-all duration-200 cursor-pointer ${
								copied
									? 'bg-green-50 border-green-200 text-green-700'
									: 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
							}`}
						>
							{copied ? (
								<div className="flex items-center gap-1">
									<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Copied!
								</div>
							) : (
								<div className="flex items-center gap-1">
									<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
									Copy
								</div>
							)}
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
