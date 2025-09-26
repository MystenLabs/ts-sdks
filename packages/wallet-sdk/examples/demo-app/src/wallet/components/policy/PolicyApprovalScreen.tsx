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
	const [remainingTransactions, setRemainingTransactions] = useState(
		settings?.remainingTransactions ?? 10,
	);

	const [usdBudget, setUsdBudget] = useState(settings?.usdBudget ?? 10);
	const [suiBudget, setSuiBudget] = useState('1');

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

	const handleApprove = () => {
		onApprove({
			remainingTransactions,
			usdBudget,
			expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).getTime(),
			approvedOperations: selectedOperations,
			coinBudgets: {
				'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': BigInt(
					Math.floor(parseFloat(suiBudget) * 1_000_000_000),
				).toString(),
			},
		});
	};

	return (
		<PolicyRuleErrorBoundary onClose={onClose}>
			<Modal isOpen onClose={onClose} title="Auto-Approval Policy" size="lg">
				<p className="text-gray-500 mb-5">
					This app wants to enable auto-approval for certain transaction types. You can control
					which rule sets are enabled and set spending limits.
				</p>

				<PolicyOperationSelector
					requestedOperation={requestedRuleSet || null}
					otherOperations={otherRuleSets}
					selectedOperations={selectedOperations}
					onOperationToggle={handleRuleSetToggle}
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
									// For new policies: require requested ruleset to be selected
									// For existing policies: allow updates even if requested ruleset is unchecked
									settings
										? false
										: !requestedOperation || !selectedOperations.includes(requestedOperation)
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
								disabled={selectedOperations.length === 0}
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
