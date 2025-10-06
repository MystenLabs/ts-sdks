// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useAutoApproval } from '../../hooks/useAutoApproval.js';
import { SigningModal } from './SigningModal.js';
import { PolicyApprovalScreen } from '../policy/PolicyApprovalScreen.js';
import { getClientForNetwork } from '../../utils/suiClients.js';
import { useCallback, useState } from 'react';
import type { WalletRequest } from '../../core/DemoWallet.js';
import { useAnalysis } from '../../hooks/useAnalysis.js';
import type { AutoApprovalSettings } from '@mysten/wallet-sdk';

interface TransactionApprovalModalProps {
	walletRequest: WalletRequest;
	onApprove: (txBytes: Uint8Array) => Promise<void>;
	onReject: (error: string) => void;
	onClose: () => void;
	isOpen: boolean;
}

export function TransactionApprovalModal({
	walletRequest,
	onApprove,
	onReject,
	onClose: _onClose,
	isOpen,
}: TransactionApprovalModalProps) {
	const suiClient = getClientForNetwork(walletRequest.chain);
	const origin = walletRequest.origin;

	const [showPolicyApproval, setShowPolicyApproval] = useState(false);

	const analysis = useAnalysis(suiClient, walletRequest);

	const [autoApprovalState, autoApprovalActions] = useAutoApproval(
		analysis?.autoApproval ?? null,
		origin,
		suiClient.network,
	);

	const handleSignAndApprove = useCallback(async () => {
		try {
			if (analysis?.autoApproval.result) {
				await onApprove(analysis.autoApproval.result.bytes);
			} else {
				throw new Error('No transaction to approve');
			}
		} catch (error) {
			console.error('❌ Failed to approve transaction:', error);
			onReject(`Transaction failed: ${error}`);
		}
	}, [analysis, onApprove, onReject]);

	const handleAutoApprove = useCallback(async () => {
		autoApprovalActions.onAutoApprove();
		handleSignAndApprove();
	}, [autoApprovalActions, handleSignAndApprove]);

	const handleReject = () => {
		onReject('Transaction rejected by user');
	};

	if (!isOpen) return null;

	if (analysis?.autoApproval.issues?.length) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
					<div className="flex items-center space-x-3 mb-4">
						<div className="flex-shrink-0">
							<div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
								<svg
									className="w-5 h-5 text-red-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
						</div>
						<div>
							<h2 className="text-lg font-semibold text-gray-900">Transaction Analysis Failed</h2>
							<p className="text-sm text-gray-600">Unable to analyze transaction for approval</p>
						</div>
					</div>

					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
						<p className="text-sm text-red-800 font-medium">Error Details:</p>
						<p className="text-sm text-red-700 mt-1">{analysis.autoApproval.issues.join(', ')}</p>
					</div>

					<div className="flex justify-end space-x-3">
						<button
							onClick={() => onReject('Transaction analysis failed')}
							className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		);
	}

	const handleCommitPolicyChanges = async (settings: AutoApprovalSettings) => {
		autoApprovalActions.updateSettings(settings);
		setShowPolicyApproval(false);
	};

	if (showPolicyApproval && autoApprovalState.manager) {
		return (
			<PolicyApprovalScreen
				policy={autoApprovalState.manager.getState().policy}
				settings={autoApprovalState.manager.getState().settings}
				requestedOperation={analysis?.autoApproval.result?.operationType}
				onApprove={handleCommitPolicyChanges}
				onReject={async () => {
					await autoApprovalActions.reset();
					setShowPolicyApproval(false);
				}}
				onClose={() => {
					setShowPolicyApproval(false);
				}}
			/>
		);
	}

	return (
		<SigningModal
			account={walletRequest.account}
			requestType="signAndExecute"
			analysis={analysis}
			onApprove={handleSignAndApprove}
			onAutoApprove={handleAutoApprove}
			onReject={handleReject}
			autoApprovalState={autoApprovalState}
			onRemovePolicy={() => {
				autoApprovalActions.reset();
			}}
			onEditPolicy={() => {
				setShowPolicyApproval(true);
			}}
		/>
	);
}
