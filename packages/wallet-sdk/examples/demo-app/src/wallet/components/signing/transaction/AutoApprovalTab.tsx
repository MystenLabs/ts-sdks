// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalAnalysis, AutoApprovalIssue } from '@mysten/wallet-sdk';
import type { AutoApprovalState } from '../../../hooks/useAutoApproval.js';

interface AutoApprovalTabProps {
	analysis: AutoApprovalAnalysis;
	autoApprovalState: AutoApprovalState;
}

export function AutoApprovalTab({ analysis, autoApprovalState }: AutoApprovalTabProps) {
	const { results } = analysis;
	const { operationType } = results;
	const {
		matchesPolicy,
		canAutoApprove,
		policyIssues,
		settingsIssues,
		analysisIssues,
		manager,
		hasPolicy,
		hasSettings,
	} = autoApprovalState;

	// Get policy and settings from manager
	const managerState = manager?.getState();
	const policy = managerState?.policy;
	const settings = manager?.getSettings();
	const operation = policy?.operations.find((op: { id: string }) => op.id === operationType);

	return (
		<div className="space-y-6">
			{/* Status Overview */}
			<div
				className={`rounded-lg p-4 ${
					canAutoApprove
						? 'bg-green-50 border border-green-200'
						: matchesPolicy
							? 'bg-yellow-50 border border-yellow-200'
							: 'bg-red-50 border border-red-200'
				}`}
			>
				<h3 className="text-sm font-semibold mb-2">Auto-Approval Status</h3>
				<div className="text-sm">
					{canAutoApprove ? (
						<div className="text-green-700">
							<span className="font-medium">✓ Ready for auto-approval</span>
							<p className="mt-1 text-xs">This transaction can be automatically approved.</p>
						</div>
					) : matchesPolicy ? (
						<div className="text-yellow-700">
							<span className="font-medium">⚠ Policy matches but settings prevent approval</span>
							<p className="mt-1 text-xs">Adjust your settings to enable auto-approval.</p>
						</div>
					) : !hasPolicy ? (
						<div className="text-red-700">
							<span className="font-medium">✗ No policy available</span>
							<p className="mt-1 text-xs">
								This application hasn't defined an auto-approval policy.
							</p>
						</div>
					) : !hasSettings ? (
						<div className="text-yellow-700">
							<span className="font-medium">⚠ No settings configured</span>
							<p className="mt-1 text-xs">
								Configure settings to enable auto-approval for this application.
							</p>
						</div>
					) : (
						<div className="text-red-700">
							<span className="font-medium">✗ Not eligible for auto-approval</span>
							<p className="mt-1 text-xs">
								This transaction doesn't match the application's policy.
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Manager State Summary */}
			{managerState && (
				<div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
					<h3 className="text-sm font-semibold text-gray-900 mb-3">Manager State</h3>
					<div className="grid grid-cols-2 gap-4 text-xs">
						<div>
							<span className="text-gray-600">Has Policy:</span>
							<span className="ml-2 font-medium">{hasPolicy ? 'Yes' : 'No'}</span>
						</div>
						<div>
							<span className="text-gray-600">Has Settings:</span>
							<span className="ml-2 font-medium">{hasSettings ? 'Yes' : 'No'}</span>
						</div>
						<div>
							<span className="text-gray-600">Matches Policy:</span>
							<span className="ml-2 font-medium">{matchesPolicy ? 'Yes' : 'No'}</span>
						</div>
						<div>
							<span className="text-gray-600">Can Auto-Approve:</span>
							<span className="ml-2 font-medium">{canAutoApprove ? 'Yes' : 'No'}</span>
						</div>
					</div>
				</div>
			)}

			{/* Issues */}
			{(policyIssues.length > 0 || settingsIssues.length > 0 || analysisIssues.length > 0) && (
				<div>
					<h3 className="text-sm font-semibold text-gray-900 mb-3">
						Issues Preventing Auto-Approval
					</h3>

					{analysisIssues.length > 0 && (
						<div className="mb-3">
							<h4 className="text-xs font-medium text-gray-700 mb-1">Analysis Issues</h4>
							<ul className="space-y-1">
								{analysisIssues.map((issue: AutoApprovalIssue, index: number) => (
									<li key={index} className="text-xs text-red-600 flex items-start">
										<span className="mr-2">•</span>
										<span>{issue.message}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{policyIssues.length > 0 && (
						<div className="mb-3">
							<h4 className="text-xs font-medium text-gray-700 mb-1">Policy Issues</h4>
							<ul className="space-y-1">
								{policyIssues.map((issue: AutoApprovalIssue, index: number) => (
									<li key={index} className="text-xs text-orange-600 flex items-start">
										<span className="mr-2">•</span>
										<span>{issue.message}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{settingsIssues.length > 0 && (
						<div className="mb-3">
							<h4 className="text-xs font-medium text-gray-700 mb-1">Settings Issues</h4>
							<ul className="space-y-1">
								{settingsIssues.map((issue: AutoApprovalIssue, index: number) => (
									<li key={index} className="text-xs text-yellow-600 flex items-start">
										<span className="mr-2">•</span>
										<span>{issue.message}</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{/* Operation Details */}
			{operation && (
				<div>
					<h3 className="text-sm font-semibold text-gray-900 mb-3">Operation Details</h3>
					<div className="bg-white border border-gray-200 rounded-lg p-3">
						<div className="mb-3">
							<div className="text-xs text-gray-600">Operation ID</div>
							<div className="font-medium text-sm">{operation.id}</div>
						</div>
						<div className="mb-3">
							<div className="text-xs text-gray-600">Description</div>
							<div className="text-sm">{operation.description}</div>
						</div>
						{operation.permissions && (
							<div>
								<div className="text-xs text-gray-600 mb-2">Required Permissions</div>
								<div className="space-y-1">
									{operation.permissions.ownedObjects?.map(
										(perm: { objectType: string; accessLevel: string }, index: number) => (
											<div key={`owned-${index}`} className="text-xs bg-gray-50 rounded p-2">
												<span className="font-medium">Object: </span>
												{perm.objectType} ({perm.accessLevel})
											</div>
										),
									)}
									{operation.permissions.balances?.map(
										(perm: { coinType: string }, index: number) => (
											<div key={`balance-${index}`} className="text-xs bg-gray-50 rounded p-2">
												<span className="font-medium">Coin: </span>
												{perm.coinType}
											</div>
										),
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Current Settings */}
			{settings && (
				<div>
					<h3 className="text-sm font-semibold text-gray-900 mb-3">Current Settings</h3>
					<div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
						<div className="flex justify-between text-xs">
							<span className="text-gray-600">Approved Operations</span>
							<span className="font-medium">
								{settings.approvedOperations.join(', ') || 'None'}
							</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-gray-600">Remaining Transactions</span>
							<span className="font-medium">{settings.remainingTransactions ?? 'Unlimited'}</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-gray-600">Shared Budget (USD)</span>
							<span className="font-medium">
								{settings.sharedBudget ? `$${settings.sharedBudget}` : 'Not configured'}
							</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-gray-600">Expires</span>
							<span className="font-medium">{new Date(settings.expiration).toLocaleString()}</span>
						</div>
						{Object.entries(settings.coinBudgets).length > 0 && (
							<div className="pt-2 border-t border-gray-100">
								<div className="text-xs text-gray-600 mb-1">Coin Budgets</div>
								{Object.entries(settings.coinBudgets).map(([coin, budget]) => (
									<div key={coin} className="flex justify-between text-xs">
										<span className="text-gray-500">{formatCoinType(coin)}</span>
										<span className="font-medium">
											{(Number(budget) / 1_000_000_000).toFixed(2)} {formatCoinType(coin)}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* No Policy */}
			{!policy && (
				<div className="text-center py-8 text-gray-500">
					<p className="text-sm">No auto-approval policy available for this application</p>
				</div>
			)}
		</div>
	);
}

function formatCoinType(type: string): string {
	const parts = type.split('::');
	return parts[parts.length - 1];
}
