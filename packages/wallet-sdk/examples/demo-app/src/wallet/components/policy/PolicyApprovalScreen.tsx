// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import type { AutoApprovalPolicy, AutoApprovalPolicySettings } from '@mysten/wallet-sdk';
import { PolicyRuleErrorBoundary } from './PolicyRuleErrorBoundary.js';
import { PolicyRuleSetSelector } from './PolicyRuleSetSelector.js';
import { PolicySettings } from './PolicySettings.js';
import { Button } from '../../../app/components/ui/Button.js';
import { Modal, ModalFooter } from '../../../app/components/ui/Modal.js';

interface PolicyApprovalScreenProps {
	policy: AutoApprovalPolicy;
	currentSettings?: AutoApprovalPolicySettings;
	isOpen: boolean;
	onApprove: (settings: AutoApprovalPolicySettings) => void;
	onReject: () => void;
	onClose: () => void;
	onRemovePolicy?: () => void;
	requestedRuleSetId?: string | null;
}

export function PolicyApprovalScreen({
	policy,
	currentSettings,
	isOpen,
	onApprove,
	onReject,
	onClose,
	onRemovePolicy,
	requestedRuleSetId,
}: PolicyApprovalScreenProps) {
	const [selectedRuleSets, setSelectedRuleSets] = useState<string[]>(() => {
		// If we have a requested rule set and no existing settings, auto-select it
		if (requestedRuleSetId && !currentSettings?.approvedRuleSets?.length) {
			return [requestedRuleSetId];
		}
		return currentSettings?.approvedRuleSets || [];
	});
	const [remainingTransactions, setRemainingTransactions] = useState(
		currentSettings?.remainingTransactions?.toString() || '10',
	);
	const [usdBudget, setUsdBudget] = useState(currentSettings?.usdBudget?.toString() || '10');
	const [suiBudget, setSuiBudget] = useState('1');

	// Split rule sets into requested vs others
	const requestedRuleSet = requestedRuleSetId
		? policy.ruleSets.find((rs) => rs.id === requestedRuleSetId)
		: null;
	const otherRuleSets = requestedRuleSetId
		? policy.ruleSets.filter((rs) => rs.id !== requestedRuleSetId)
		: policy.ruleSets;

	const handleRuleSetToggle = (ruleSetId: string) => {
		setSelectedRuleSets((prev) =>
			prev.includes(ruleSetId) ? prev.filter((id) => id !== ruleSetId) : [...prev, ruleSetId],
		);
	};

	const handleApprove = () => {
		const settings: AutoApprovalPolicySettings = {
			remainingTransactions: remainingTransactions ? parseInt(remainingTransactions) : null,
			expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
			usdBudget: usdBudget ? parseFloat(usdBudget) : null,
			approvedRuleSets: selectedRuleSets,
			coinBudgets: {
				'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': BigInt(
					Math.floor(parseFloat(suiBudget) * 1_000_000_000),
				).toString(), // Convert SUI to MIST as string
			},
		};
		onApprove(settings);
	};

	if (!isOpen) return null;

	return (
		<PolicyRuleErrorBoundary onClose={onClose}>
			<Modal isOpen={isOpen} onClose={onClose} title="Auto-Approval Policy" size="lg">
				<p className="text-gray-500 mb-5">
					This app wants to enable auto-approval for certain transaction types. You can control
					which rule sets are enabled and set spending limits.
				</p>

				<PolicyRuleSetSelector
					requestedRuleSet={requestedRuleSet || null}
					otherRuleSets={otherRuleSets}
					selectedRuleSets={selectedRuleSets}
					onRuleSetToggle={handleRuleSetToggle}
				/>

				<PolicySettings
					remainingTransactions={remainingTransactions}
					usdBudget={usdBudget}
					suiBudget={suiBudget}
					onRemainingTransactionsChange={setRemainingTransactions}
					onUsdBudgetChange={setUsdBudget}
					onSuiBudgetChange={setSuiBudget}
				/>

				<ModalFooter>
					{currentSettings ? (
						// Editing existing policy - show 3 buttons
						<>
							<Button variant="danger" onClick={onRemovePolicy}>
								Remove Policy
							</Button>
							<Button variant="secondary" onClick={onClose}>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={handleApprove}
								disabled={
									// For new policies: require requested ruleset to be selected
									// For existing policies: allow updates even if requested ruleset is unchecked
									currentSettings
										? false
										: !requestedRuleSetId || !selectedRuleSets.includes(requestedRuleSetId)
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
								disabled={selectedRuleSets.length === 0}
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
