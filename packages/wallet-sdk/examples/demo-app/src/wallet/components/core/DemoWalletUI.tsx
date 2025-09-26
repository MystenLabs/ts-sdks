// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';
import type { SuiChain } from '@mysten/wallet-standard';
import { useWallet } from '../../providers/WalletProvider.js';
import { useWalletAccount } from '../../hooks/useWalletAccount.js';
import { AccountInfo } from './AccountInfo.js';
import { BalancesList } from '../ui/BalancesList.js';
import { TransactionApprovalModal } from '../signing/TransactionApprovalModal.js';
import { NetworkSelector } from '../ui/NetworkSelector.js';
import { getClientForNetwork } from '../../utils/suiClients.js';
import { DEMO_WALLET_ICON } from '../../constants/icons.js';

export function DemoWalletUI() {
	const {
		accounts,
		activeAccount,
		activeKeypair,
		activeAccountIndex,
		addAccount,
		removeAccount,
		switchAccount,
		renameAccount,
	} = useWalletAccount();

	const { activeNetwork, setActiveNetwork, walletRequest, setWalletRequest } = useWallet();

	// Handle network change
	const handleNetworkChange = useCallback(
		(network: SuiChain) => {
			setActiveNetwork(network);
		},
		[setActiveNetwork],
	);

	const handleClose = useCallback(() => {
		setWalletRequest(null);
	}, [setWalletRequest]);

	if (!activeKeypair || !activeAccount) {
		return (
			<div className="fixed top-0 right-0 w-96 h-screen bg-white border-l border-gray-200 flex flex-col z-[1000]">
				<div className="p-5 border-b border-gray-200 bg-gray-50 shrink-0">
					<h3 className="m-0 mb-3 text-gray-800 font-semibold">Demo Wallet</h3>
					<p className="m-0 text-gray-600">Loading accounts...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed top-0 right-0 w-96 h-screen bg-white border-l border-gray-200 flex flex-col z-[1000]">
			{/* Header */}
			<div className="p-5 border-b border-gray-200 bg-gray-50 shrink-0">
				<div className="flex items-center gap-3">
					<img src={DEMO_WALLET_ICON} alt="Demo Wallet" className="w-8 h-8 shrink-0" />
					<h3 className="m-0 text-lg font-semibold text-gray-800 flex-1 min-w-0">Demo Wallet</h3>
					<NetworkSelector
						value={activeNetwork}
						onChange={handleNetworkChange}
						className="shrink-0"
					/>
				</div>
			</div>

			{/* Account Section */}
			<div className="shrink-0">
				<AccountInfo
					accounts={accounts}
					activeAccountIndex={activeAccountIndex}
					onSwitchAccount={switchAccount}
					onAddAccount={addAccount}
					onRemoveAccount={removeAccount}
					onRenameAccount={renameAccount}
				/>
			</div>

			{/* Balances Section */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="px-5 py-3 border-b border-gray-200 text-sm font-semibold text-gray-600 shrink-0">
					Balances
				</div>
				<div className="flex-1 overflow-auto">
					<BalancesList
						key={`${activeAccount.address}-${activeNetwork}`}
						account={activeAccount}
						suiClient={getClientForNetwork(activeNetwork)}
					/>
				</div>
			</div>

			{/* Transaction Approval Modal */}
			{walletRequest && (
				<TransactionApprovalModal
					isOpen={!!walletRequest}
					walletRequest={walletRequest}
					onApprove={async (transaction) => {
						if (walletRequest) {
							walletRequest.resolve(transaction);
							setWalletRequest(null);
						}
					}}
					onReject={(error) => {
						if (walletRequest) {
							walletRequest.reject(new Error(error));
							setWalletRequest(null);
						}
					}}
					onClose={handleClose}
				/>
			)}
		</div>
	);
}
