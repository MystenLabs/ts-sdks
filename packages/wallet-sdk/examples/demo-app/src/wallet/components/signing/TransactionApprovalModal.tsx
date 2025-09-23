// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';
import { useAutoApproval } from '../../hooks/useAutoApproval.js';
import { SigningModal } from './SigningModal.js';
import { PolicyApprovalScreen } from '../policy/PolicyApprovalScreen.js';
import { getClientForNetwork } from '../../utils/suiClients.js';
import { useCallback, useState } from 'react';
import type { WalletRequest } from '../../core/DemoWalletImpl.js';

interface TransactionApprovalModalProps {
	walletRequest: WalletRequest;
	onApprove: (transaction: Transaction) => Promise<void>;
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
	// Extract data from walletRequest

	// walletRequest.data is now always a proper Transaction instance (converted in wallet impl)
	const transaction =
		typeof walletRequest.data === 'string'
			? null // Personal message case
			: (walletRequest.data as Transaction);
	const suiClient = getClientForNetwork(walletRequest.chain);
	const origin = walletRequest.origin;

	// UI state - which modal to show
	const [showPolicyApproval, setShowPolicyApproval] = useState(false);

	// Transaction auto-approval state - this drives the signing modal
	const [autoApprovalState, autoApprovalActions] = useAutoApproval(
		isOpen ? transaction : null,
		suiClient,
		origin,
		undefined, // ruleSetId is now extracted by AutoApprovalManager
	);

	const handleSignAndApprove = useCallback(async () => {
		try {
			if (autoApprovalState.transaction) {
				await onApprove(autoApprovalState.transaction);
			} else {
				throw new Error('No transaction to approve');
			}
		} catch (error) {
			console.error('❌ Failed to approve transaction:', error);
			onReject(`Transaction failed: ${error}`);
		}
	}, [autoApprovalState.transaction, onApprove, onReject]);

	const handleReject = () => {
		autoApprovalActions.rejectTransaction();
		onReject('Transaction rejected by user');
	};

	const handleCancelCountdown = () => {
		// Only cancel the countdown, don't reject the transaction
		autoApprovalActions.cancelCountdown();
	};

	// No auto-execution logic needed here anymore - AutoApprovalCountdown handles everything

	if (!isOpen) return null;

	// Always show the SigningModal, but pass the analyzing state to it
	// Remove the separate analyzing state rendering

	// Show analysis error - don't allow approval when transaction analysis fails
	if (autoApprovalState.analysisError) {
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
						<p className="text-sm text-red-700 mt-1">{autoApprovalState.analysisError}</p>
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

	// Show regular signing modal with auto-approval detection
	const hasAutoApprovalPolicy =
		autoApprovalState.policy &&
		autoApprovalState.hasExistingPolicy &&
		autoApprovalState.isApprovalEnabled;

	// Check if we should show "Enable Auto Approvals" button
	// Only show when: 1) No policy exists yet, OR 2) Policy exists but this specific ruleset needs approval
	// Do NOT show when: policy is disabled, OR transaction is cancelled, OR already showing "Auto-Approval Cancelled" message
	const hasAvailablePolicy =
		autoApprovalState.policy &&
		(autoApprovalState.analysis as any)?.autoApproved && // Transaction matches policy rules
		!autoApprovalState.cancelled && // Not cancelled
		(!autoApprovalState.hasExistingPolicy || // No policy exists yet, OR
			(autoApprovalState.hasExistingPolicy &&
				autoApprovalState.isApprovalEnabled &&
				!autoApprovalState.canAutoApprove)); // Policy exists and is enabled but this ruleset is not approved

	// Handler for committing policy changes - only called when user explicitly saves
	const handleCommitPolicyChanges = async (settings: any) => {
		try {
			// Cancel any existing countdown to avoid conflicts
			autoApprovalActions.cancelCountdown();

			if (!autoApprovalState.hasExistingPolicy) {
				await autoApprovalActions.enablePolicy(settings);
			} else {
				await autoApprovalActions.updatePolicy(settings);
			}
			setShowPolicyApproval(false);
		} catch (error) {
			console.error('Failed to update policy:', error);
			handleReject();
		}
	};

	// Show only one modal at a time to avoid overlapping backdrops
	if (showPolicyApproval && autoApprovalState.policy) {
		return (
			<PolicyApprovalScreen
				policy={autoApprovalState.policy}
				currentSettings={autoApprovalState.currentSettings}
				isOpen={true}
				requestedRuleSetId={autoApprovalState.ruleSetId}
				onApprove={handleCommitPolicyChanges}
				onReject={async () => {
					// Only disable policy if user explicitly rejects
					await autoApprovalActions.disablePolicy();
					setShowPolicyApproval(false);
				}}
				onClose={() => {
					// Cancel = just close, no state changes
					setShowPolicyApproval(false);
				}}
				onRemovePolicy={async () => {
					// Remove policy and close
					await autoApprovalActions.disablePolicy();
					setShowPolicyApproval(false);
				}}
			/>
		);
	}

	return (
		<SigningModal
			isOpen={isOpen}
			account={walletRequest.account}
			requestType="signAndExecute"
			transaction={autoApprovalState.transaction ?? null}
			analysis={autoApprovalState.isAnalyzing ? null : autoApprovalState.analysis}
			onApprove={handleSignAndApprove}
			onReject={handleReject}
			autoApprove={
				hasAutoApprovalPolicy && autoApprovalState.canAutoApprove
					? {
							enabled: true,
							reason: autoApprovalState.autoApprovalReason,
							countdownSeconds: autoApprovalState.countdownSeconds,
							cancelled: autoApprovalState.cancelled,
						}
					: hasAutoApprovalPolicy && autoApprovalState.autoApprovalReason
						? {
								enabled: false,
								reason: autoApprovalState.autoApprovalReason,
								cancelled: autoApprovalState.cancelled,
							}
						: undefined
			}
			onCancelCountdown={handleCancelCountdown}
			onRemovePolicy={
				hasAutoApprovalPolicy
					? async () => {
							await autoApprovalActions.disablePolicy();
						}
					: undefined
			}
			onEnableAutoApprovals={
				hasAvailablePolicy
					? () => {
							setShowPolicyApproval(true);
						}
					: undefined
			}
			onEditPolicy={
				hasAutoApprovalPolicy
					? () => {
							setShowPolicyApproval(true);
						}
					: undefined
			}
			autoApprovalState={autoApprovalState}
		/>
	);
}
