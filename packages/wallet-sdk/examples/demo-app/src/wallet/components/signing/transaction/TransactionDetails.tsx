// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react';
import { TransactionCommands } from './TransactionCommands.js';
import { TransactionInputs } from './TransactionInputs.js';
import { CoinFlows } from './CoinFlows.js';
import type { AutoApprovalAnalysis } from '@mysten/wallet-sdk';
import { toBase64 } from '@mysten/bcs';

interface TransactionDetailsProps {
	analysis?: AutoApprovalAnalysis;
	autoApprovalState?: any;
}

export function TransactionDetails({ analysis, autoApprovalState }: TransactionDetailsProps) {
	const [activeTab, setActiveTab] = useState<
		'summary' | 'inputs' | 'commands' | 'raw' | 'analysis' | 'policy'
	>('summary');

	// Handle missing transaction
	if (!analysis) {
		return <div className="p-5 text-gray-500">No transaction data available</div>;
	}

	// Always use analyzed inputs and commands - they should always exist
	const inputs = analysis?.results.inputs ?? [];
	const commands = analysis?.results.commands ?? [];

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
					onClick={() => setActiveTab('summary')}
					className={tabStyle(activeTab === 'summary')}
				>
					Summary
				</button>
				<button onClick={() => setActiveTab('inputs')} className={tabStyle(activeTab === 'inputs')}>
					Inputs ({inputs.length})
				</button>
				<button
					onClick={() => setActiveTab('commands')}
					className={tabStyle(activeTab === 'commands')}
				>
					Commands ({commands.length})
				</button>
				<button onClick={() => setActiveTab('raw')} className={tabStyle(activeTab === 'raw')}>
					Raw Data
				</button>
				<button
					onClick={() => setActiveTab('analysis')}
					className={tabStyle(activeTab === 'analysis')}
				>
					Analysis
				</button>
				<button onClick={() => setActiveTab('policy')} className={tabStyle(activeTab === 'policy')}>
					Policy
				</button>
			</div>

			<div className="min-h-[200px]">
				{activeTab === 'summary' && <TransactionSummary analysis={analysis} />}
				{activeTab === 'inputs' && (
					<div>
						<p className="text-gray-500">
							By approving this transaction, you are giving permission to use the following inputs
							and transfer objects you own.
						</p>
						<TransactionInputs inputs={inputs} />
					</div>
				)}
				{activeTab === 'commands' && <TransactionCommands commands={commands} />}
				{activeTab === 'raw' && (
					<div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
						<pre className="text-sm text-gray-800 whitespace-pre-wrap">
							{JSON.stringify(analysis?.results.data, null, 2)}
						</pre>
					</div>
				)}
				{activeTab === 'analysis' && (
					<div className="space-y-4">
						<div className="bg-blue-50 rounded-lg p-4">
							<h4 className="font-medium text-blue-900 mb-2">Transaction Analysis Data</h4>
							<div className="bg-white rounded p-3 max-h-96 overflow-auto">
								<pre className="text-xs text-gray-800 whitespace-pre-wrap">
									{JSON.stringify(
										analysis,
										(_key, value) => {
											if (value instanceof Uint8Array) {
												return toBase64(value);
											}

											return typeof value === 'bigint' ? value.toString() : value;
										},
										2,
									)}
								</pre>
							</div>
						</div>
						{autoApprovalState?.analysisError && (
							<div className="bg-red-50 rounded-lg p-4">
								<h4 className="font-medium text-red-900 mb-2">Analysis Error</h4>
								<div className="text-sm text-red-700">{autoApprovalState.analysisError}</div>
							</div>
						)}
					</div>
				)}
				{activeTab === 'policy' && (
					<div className="space-y-4">
						<div className="bg-green-50 rounded-lg p-4">
							<h4 className="font-medium text-green-900 mb-2">Auto-Approval State</h4>
							<div className="bg-white rounded p-3 max-h-96 overflow-auto">
								<pre className="text-xs text-gray-800 whitespace-pre-wrap">
									{JSON.stringify(
										autoApprovalState,
										(_key, value) => {
											if (value instanceof Uint8Array) {
												return toBase64(value);
											}
											return typeof value === 'bigint' ? value.toString() : value;
										},
										2,
									)}
								</pre>
							</div>
						</div>
						{autoApprovalState?.policy && (
							<div className="bg-purple-50 rounded-lg p-4">
								<h4 className="font-medium text-purple-900 mb-2">Policy Data</h4>
								<div className="bg-white rounded p-3 max-h-96 overflow-auto">
									<pre className="text-xs text-gray-800 whitespace-pre-wrap">
										{JSON.stringify(autoApprovalState.policy, null, 2)}
									</pre>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

interface TransactionSummaryProps {
	analysis?: AutoApprovalAnalysis;
}

function TransactionSummary({ analysis }: TransactionSummaryProps) {
	const commands = analysis?.results.commands || [];
	const inputs = analysis?.results.inputs || [];

	return (
		<div className="space-y-4">
			{/* Coin Outflows - Primary Focus */}
			<CoinFlows analysis={analysis} />

			{/* Compact Transaction Details */}
			<div className="bg-gray-50 rounded-lg p-3">
				<div className="text-xs text-gray-600 mb-1">Transaction Details</div>
				<div className="text-sm text-gray-800">
					{commands.length} command{commands.length !== 1 ? 's' : ''}, {inputs.length} input
					{inputs.length !== 1 ? 's' : ''}
				</div>
			</div>
		</div>
	);
}
