// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react';
import type { AutoApprovalState } from '../../../hooks/useAutoApproval.js';
import { OverviewTab } from './OverviewTab.js';
import { InputsTab } from './InputsTab.js';
import { CommandsTab } from './CommandsTab.js';
import { AutoApprovalTab } from './AutoApprovalTab.js';
import { DebugTab } from './DebugTab.js';
import type { WalletTransactionAnalysis } from '../../../hooks/useAnalysis.js';

interface TransactionDetailsProps {
	analysis?: WalletTransactionAnalysis;
	autoApprovalState?: AutoApprovalState;
}

export function TransactionDetails({ analysis, autoApprovalState }: TransactionDetailsProps) {
	const [activeTab, setActiveTab] = useState<
		'overview' | 'inputs' | 'commands' | 'approval' | 'debug'
	>('overview');

	// Handle missing transaction
	if (!analysis) {
		return <div className="p-5 text-gray-500">No transaction data available</div>;
	}

	const hasPolicy = autoApprovalState?.hasPolicy;

	const tabStyle = (isActive: boolean) =>
		`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
			isActive
				? 'bg-indigo-600 text-white shadow-sm'
				: 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-sm'
		}`;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-1 bg-gray-50 p-2 rounded-xl border border-gray-200">
				<button
					onClick={() => setActiveTab('overview')}
					className={tabStyle(activeTab === 'overview')}
				>
					Overview
				</button>
				<button onClick={() => setActiveTab('inputs')} className={tabStyle(activeTab === 'inputs')}>
					Inputs
				</button>
				<button
					onClick={() => setActiveTab('commands')}
					className={tabStyle(activeTab === 'commands')}
				>
					Commands
				</button>
				{hasPolicy && (
					<button
						onClick={() => setActiveTab('approval')}
						className={tabStyle(activeTab === 'approval')}
					>
						Auto-Approval
					</button>
				)}
				<button onClick={() => setActiveTab('debug')} className={tabStyle(activeTab === 'debug')}>
					Debug
				</button>
			</div>

			<div className="min-h-[200px]">
				{activeTab === 'overview' && (
					<OverviewTab analysis={analysis} autoApprovalState={autoApprovalState} />
				)}
				{activeTab === 'inputs' && <InputsTab analysis={analysis} />}
				{activeTab === 'commands' && <CommandsTab analysis={analysis} />}
				{activeTab === 'approval' && autoApprovalState && (
					<AutoApprovalTab analysis={analysis} autoApprovalState={autoApprovalState} />
				)}
				{activeTab === 'debug' && (
					<DebugTab analysis={analysis} autoApprovalState={autoApprovalState} />
				)}
			</div>
		</div>
	);
}
