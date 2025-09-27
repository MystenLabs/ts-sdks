// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { SigningHeader } from './SigningHeader.js';
import { AccountDisplay } from './AccountDisplay.js';
import { PolicyStatusMessage } from './PolicyStatusMessage.js';
import { TransactionContent } from './TransactionContent.js';
import { AutoApprovalCountdown } from './AutoApprovalCountdown.js';
import { SigningActions } from './SigningActions.js';
import type { AutoApprovalAnalysis } from '@mysten/wallet-sdk';
import type { AutoApprovalState } from '../../hooks/useAutoApproval.js';
import { useState } from 'react';

interface SigningModalProps {
	account: ReadonlyWalletAccount;
	requestType: 'personalMessage' | 'transaction' | 'signAndExecute';
	analysis?: AutoApprovalAnalysis | null; // null = still analyzing
	autoApprovalState?: AutoApprovalState;
	onApprove: () => void;
	onAutoApprove: () => void;
	onReject: () => void;
	onRemovePolicy: () => void;
	onEditPolicy: () => void;
}

export function SigningModal({
	account,
	requestType,
	analysis,
	autoApprovalState,
	onApprove,
	onAutoApprove,
	onReject,
	onRemovePolicy,
	onEditPolicy,
}: SigningModalProps) {
	const [autoApprovalCancelled, setCancelled] = useState(false);

	function handleRemovePolicy() {
		onRemovePolicy();
		setCancelled(false);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col overflow-hidden">
				{/* Header */}
				<div className="px-6 py-4 border-b border-gray-200">
					<div className="flex items-center justify-between">
						<SigningHeader requestType={requestType} />
						<AccountDisplay account={account} />
					</div>
				</div>

				{/* Content Area */}
				<div className="flex-1 overflow-y-auto">
					{/* Policy Status Messages */}
					{autoApprovalState?.hasSettings &&
						autoApprovalState.matchesPolicy &&
						!autoApprovalState.canAutoApprove && (
							<div className="p-4 border-b border-gray-100">
								<PolicyStatusMessage
									settingsIssues={autoApprovalState.settingsIssues}
									onEditPolicy={onEditPolicy}
									onRemovePolicy={handleRemovePolicy}
								/>
							</div>
						)}

					{/* Transaction Content */}
					{requestType !== 'personalMessage' && (
						<div className="px-6 py-4">
							{analysis === null ? (
								<div className="text-center py-12">
									<div className="relative">
										<div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
										<div
											className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-300 rounded-full animate-spin mx-auto"
											style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
										/>
									</div>
									<div className="text-gray-700 font-medium text-lg mb-2">
										Analyzing transaction...
									</div>
									<div className="text-sm text-gray-500">
										Please wait while we verify the transaction details and check policy rules
									</div>
								</div>
							) : (
								<TransactionContent analysis={analysis} autoApprovalState={autoApprovalState} />
							)}
						</div>
					)}

					{/* Auto-Approval Management */}
					{autoApprovalCancelled && autoApprovalState?.canAutoApprove && (
						<div className="px-6 py-4 bg-orange-50 border-l-4 border-orange-400">
							<div className="flex items-start">
								<div className="flex-shrink-0">
									<svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
										<path
											fillRule="evenodd"
											d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-3 flex-1">
									<h3 className="text-sm font-medium text-orange-800">Auto-Approval Cancelled</h3>
									<div className="mt-1 text-sm text-orange-700">
										You cancelled the auto-approval countdown for this transaction. You can still
										modify your policy settings or remove the policy entirely.
									</div>
									<div className="mt-3 flex gap-2">
										<button
											onClick={onEditPolicy}
											className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-orange-800 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
										>
											Edit Policy Settings
										</button>

										<button
											onClick={handleRemovePolicy}
											className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
										>
											Remove Policy
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
					{autoApprovalState?.canAutoApprove && !autoApprovalCancelled ? (
						<AutoApprovalCountdown
							initialSeconds={3}
							onCancel={() => setCancelled(true)}
							onComplete={onAutoApprove}
						/>
					) : (
						<SigningActions
							requestType={requestType}
							onApprove={onApprove}
							onReject={onReject}
							onEnableAutoApprovals={
								!autoApprovalState?.hasSettings && autoApprovalState?.matchesPolicy
									? onEditPolicy
									: undefined
							}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
