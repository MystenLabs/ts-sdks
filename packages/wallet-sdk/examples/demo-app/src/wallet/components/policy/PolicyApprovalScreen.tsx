// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import type { AutoApprovalPolicy, AutoApprovalSettings } from '@mysten/wallet-sdk';
import { PolicyRuleErrorBoundary } from './PolicyRuleErrorBoundary.js';
import { PolicyOperationSelector } from './PolicyRuleSetSelector.js';
import { PolicySettings } from './PolicySettings.js';
import { Button } from '../../../app/components/ui/Button.js';
import { Modal, ModalFooter } from '../../../app/components/ui/Modal.js';

interface PolicyApprovalScreenProps {
	policy: AutoApprovalPolicy;
	settings: AutoApprovalSettings | null;
	onApprove: (settings: AutoApprovalSettings) => void;
	onReject: () => void;
	onClose: () => void;
	requestedOperation?: string | null;
}

export function PolicyApprovalScreen({
	policy,
	settings,
	onApprove,
	onReject,
	onClose,
	requestedOperation,
}: PolicyApprovalScreenProps) {
	const [selectedOperations, setSelectedRuleSets] = useState<string[]>(() => {
		if (requestedOperation && !settings?.approvedOperations?.length) {
			return [requestedOperation];
		}
		return settings?.approvedOperations || [];
	});

	const [remainingTransactions, setRemainingTransactions] = useState<number | null>(
		settings?.remainingTransactions ?? policy.suggestedSettings?.remainingTransactions ?? 10,
	);

	const [sharedBudget, setSharedBudget] = useState<number | null>(
		settings?.sharedBudget ?? policy.suggestedSettings?.sharedBudget ?? null,
	);

	const [coinBudgets, setCoinBudgets] = useState<Record<string, string>>(
		settings?.coinBudgets ?? policy.suggestedSettings?.coinBudgets ?? {},
	);

	const [expirationHours, setExpirationHours] = useState(24);

	const requestedRuleSet = requestedOperation
		? policy.operations.find((rs) => rs.id === requestedOperation)
		: null;
	const otherRuleSets = requestedOperation
		? policy.operations.filter((rs) => rs.id !== requestedOperation)
		: policy.operations;

	const handleRuleSetToggle = (ruleSetId: string) => {
		setSelectedRuleSets((prev) =>
			prev.includes(ruleSetId) ? prev.filter((id) => id !== ruleSetId) : [...prev, ruleSetId],
		);
	};

	// Check if all required coin types have budgets configured
	const validateCoinBudgets = () => {
		// Get all coin types from selected operations
		const requiredCoinTypes = new Set<string>();
		selectedOperations.forEach((opId) => {
			const operation = policy.operations.find((op) => op.id === opId);
			if (operation?.permissions?.balances) {
				operation.permissions.balances.forEach((balance) => {
					if (balance.coinType) {
						requiredCoinTypes.add(balance.coinType);
					}
				});
			}
		});

		// Check if each required coin type has a budget
		for (const coinType of requiredCoinTypes) {
			const hasCustomBudget = coinBudgets[coinType];
			const hasSharedBudget = sharedBudget !== null && sharedBudget > 0;

			// Coin must have either a custom budget or shared budget must be configured
			if (!hasCustomBudget && !hasSharedBudget) {
				return false;
			}
		}

		return true;
	};

	const handleApprove = () => {
		onApprove({
			remainingTransactions,
			sharedBudget,
			expiration: new Date(Date.now() + expirationHours * 60 * 60 * 1000).getTime(),
			approvedOperations: selectedOperations,
			coinBudgets,
		});
	};

	return (
		<PolicyRuleErrorBoundary onClose={onClose}>
			<Modal isOpen onClose={onClose} title="Auto-Approval Policy" size="lg">
				<PolicyOperationSelector
					requestedOperation={requestedRuleSet || null}
					otherOperations={otherRuleSets}
					selectedOperations={selectedOperations}
					onOperationToggle={handleRuleSetToggle}
				/>

				<PolicySettings
					policy={policy}
					selectedOperations={selectedOperations}
					remainingTransactions={remainingTransactions}
					sharedBudget={sharedBudget}
					coinBudgets={coinBudgets}
					expirationHours={expirationHours}
					onRemainingTransactionsChange={setRemainingTransactions}
					onSharedBudgetChange={setSharedBudget}
					onCoinBudgetsChange={setCoinBudgets}
					onExpirationHoursChange={setExpirationHours}
				/>

				<ModalFooter>
					{settings ? (
						// Editing existing policy - show 3 buttons
						<>
							<Button variant="danger" onClick={onReject}>
								Remove Policy
							</Button>
							<Button variant="secondary" onClick={onClose}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleApprove}
								disabled={
									// For existing policies: check budget validation
									!validateCoinBudgets()
								}
							>
								Update Policy
							</Button>
						</>
					) : (
						// First-time approval - show 2 buttons
						<>
							<Button variant="secondary" onClick={onReject}>
								Reject
							</Button>
							<Button
								variant="primary"
								onClick={handleApprove}
								disabled={
									selectedOperations.length === 0 ||
									// For new policies: require requested ruleset and budget validation
									!requestedOperation ||
									!selectedOperations.includes(requestedOperation) ||
									!validateCoinBudgets()
								}
							>
								Approve Policy
							</Button>
						</>
					)}
				</ModalFooter>
			</Modal>
		</PolicyRuleErrorBoundary>
	);
}
