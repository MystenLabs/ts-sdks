// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClient } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';
import type { PolicyManager } from '@mysten/wallet-sdk';
import type { AutoApprovalPolicyData } from '@mysten/wallet-sdk';
import type { ReadonlyWalletAccount } from '@mysten/wallet-standard';
import { useApprovalFlow } from '../hooks/useApprovalFlow.js';
import { PolicyApprovalModal } from './PolicyApprovalModal.js';
import { SigningModal } from './SigningModal.js';
import { useEffect } from 'react';

interface TransactionApprovalModalProps {
	transactionJson: string;
	suiClient: SuiClient;
	policyManager: PolicyManager;
	account: ReadonlyWalletAccount;
	onApprove: (transaction: Transaction) => Promise<void>;
	onReject: (error: string) => void;
	onClose: () => void;
	origin: string;
	isOpen: boolean;
}

export function TransactionApprovalModal({
	transactionJson,
	suiClient,
	policyManager,
	account,
	onApprove,
	onReject,
	onClose: _onClose,
	origin,
	isOpen,
}: TransactionApprovalModalProps) {
	const [flowState, flowActions] = useApprovalFlow(
		isOpen ? transactionJson : null,
		suiClient,
		policyManager,
		origin,
	);

	// All analysis is now handled in the hook

	const handlePolicyApprove = async (policy: AutoApprovalPolicyData) => {
		console.log('🟢 TransactionApprovalModal: handlePolicyApprove called', policy);
		try {
			await policyManager.createPolicyState(policy);
			flowActions.approvePolicy(policy);
		} catch (error) {
			console.error('❌ Error creating policy:', error);
			flowActions.rejectPolicy();
		}
	};

	const handlePolicyRenew = async () => {
		console.log('🔄 TransactionApprovalModal: handlePolicyRenew called');
		try {
			await policyManager.removePolicy(origin);
			flowActions.renewPolicy();
		} catch (error) {
			console.error('❌ Error removing policy for renewal:', error);
			flowActions.rejectPolicy();
		}
	};

	const handlePolicyRemove = async () => {
		try {
			await policyManager.removePolicy(origin);
			flowActions.removePolicy();
		} catch (error) {
			console.error('❌ Error removing policy:', error);
			flowActions.rejectPolicy();
		}
	};

	const handleTransactionApprove = async () => {
		console.log('🟢 TransactionApprovalModal: handleTransactionApprove called');
		flowActions.approveTransaction();
		console.log(
			'🟢 TransactionApprovalModal: calling parent onApprove() with resolved transaction',
		);
		if (flowState.transaction) {
			await onApprove(flowState.transaction);
		} else {
			console.error('❌ No transaction available to approve');
		}
		console.log('🟢 TransactionApprovalModal: parent onApprove() completed');
	};

	// Handle auto-approval when flag is set
	useEffect(() => {
		if (flowState.shouldAutoApprove && flowState.transaction) {
			console.log('🤖 TransactionApprovalModal: Auto-approval triggered, executing transaction');
			handleTransactionApprove();
		}
	}, [flowState.shouldAutoApprove, flowState.transaction, handleTransactionApprove]);

	const handleTransactionReject = () => {
		console.log('🔴 TransactionApprovalModal: handleTransactionReject called');
		flowActions.rejectTransaction();
		onReject('Transaction rejected by user');
	};

	if (!isOpen) return null;

	// Show analysis loading state
	if (flowState.isAnalyzing) {
		return (
			<div className="modal-overlay">
				<div className="modal-content">
					<div className="loading-spinner">
						<div>🔍 Analyzing transaction...</div>
						<div className="spinner" />
					</div>
				</div>
			</div>
		);
	}

	// Show analysis error
	if (flowState.analysisError) {
		return (
			<SigningModal
				isOpen={true}
				account={account}
				requestType="signAndExecute"
				transaction={flowState.transaction || null}
				onApprove={handleTransactionApprove}
				onReject={handleTransactionReject}
			/>
		);
	}

	// Show policy approval modal if we have collected policies to approve
	const hasPendingPolicies = flowState.collectedPolicies && flowState.collectedPolicies.length > 0;
	if (hasPendingPolicies && !flowState.policyContext?.exists) {
		const policyToApprove = flowState.collectedPolicies![0];
		return (
			<PolicyApprovalModal
				policy={policyToApprove}
				onApprove={() => handlePolicyApprove(policyToApprove)}
				onReject={() => {
					console.log('🔴 TransactionApprovalModal: Policy rejected');
					flowActions.rejectPolicy();
				}}
				isOpen={true}
			/>
		);
	}

	// Policy renewal logic is now handled inline in the SigningModal

	// Show countdown modal if policy is valid and counting down
	if (flowState.isCountingDown && flowState.policyContext?.valid) {
		return (
			<SigningModal
				isOpen={true}
				account={account}
				requestType="signAndExecute"
				transaction={flowState.transaction || null}
				onApprove={handleTransactionApprove}
				onReject={handleTransactionReject}
				autoApprove={{
					enabled: true,
					reason: `Auto-approved by policy: ${flowState.policyContext.policy?.policy.name || 'Active Policy'}`,
					countdownSeconds: flowState.countdownSeconds,
					policyInfo: flowState.policyContext.remainingBudget
						? {
								remainingBudget: flowState.policyContext.remainingBudget,
								totalBudget: flowState.policyContext.totalBudget || '0',
								remainingTransactions: flowState.policyContext.remainingTransactions || 0,
								totalTransactions: flowState.policyContext.totalTransactions || 0,
							}
						: undefined,
				}}
				onRemovePolicy={handlePolicyRemove}
			/>
		);
	}

	// Default: show regular signing modal (including when policy exists but is invalid)
	return (
		<SigningModal
			isOpen={true}
			account={account}
			requestType="signAndExecute"
			transaction={flowState.transaction || null}
			onApprove={handleTransactionApprove}
			onReject={handleTransactionReject}
			autoApprove={
				flowState.policyContext?.exists
					? {
							enabled: flowState.policyContext.valid,
							reason: flowState.policyContext.validationReason || 'Policy validation result',
							countdownSeconds: flowState.countdownSeconds,
							policyInfo: flowState.policyContext.remainingBudget
								? {
										remainingBudget: flowState.policyContext.remainingBudget,
										totalBudget: flowState.policyContext.totalBudget || '0',
										remainingTransactions: flowState.policyContext.remainingTransactions || 0,
										totalTransactions: flowState.policyContext.totalTransactions || 0,
									}
								: undefined,
						}
					: undefined
			}
			onRemovePolicy={handlePolicyRemove}
			onCancelCountdown={flowActions.cancelCountdown}
			onRenewPolicy={handlePolicyRenew}
		/>
	);
}
