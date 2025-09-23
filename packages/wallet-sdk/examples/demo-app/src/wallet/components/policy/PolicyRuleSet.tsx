// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import type { AutoApprovalRuleSet } from '@mysten/wallet-sdk';
import { PolicyRule } from './PolicyRuleDisplay.js';
import { getRuleSetSummary } from '../../policies/ruleSets.js';
import type { RuleSetSummary } from '../../policies/ruleSets.js';

interface PolicyRuleSetProps {
	ruleSet: AutoApprovalRuleSet;
	isHighlighted: boolean;
	isSelected: boolean;
	onToggle: () => void;
}

interface RuleSetSummaryDisplayProps {
	summary: RuleSetSummary;
}

function RuleSetSummaryDisplay({ summary }: RuleSetSummaryDisplayProps) {
	const items = [];

	if (summary.balances?.length) {
		items.push(`${summary.balances.join(', ')} coins`);
	}

	if (summary.allBalances) {
		items.push('All coin balances');
	}

	if (summary.objectTypes?.length) {
		items.push(
			`${summary.objectTypes.length} object type${summary.objectTypes.length > 1 ? 's' : ''}`,
		);
	}

	if (items.length === 0) {
		return <span>No permissions</span>;
	}

	return <span>{items.join(', ')}</span>;
}

export function PolicyRuleSet({
	ruleSet,
	isHighlighted,
	isSelected,
	onToggle,
}: PolicyRuleSetProps) {
	const [showDetails, setShowDetails] = useState(false);
	const [showJson, setShowJson] = useState(false);

	const displayName = (ruleSet as any).name || ruleSet.description || ruleSet.id;
	const displayDescription = (ruleSet as any).name ? ruleSet.description : null;

	return (
		<div
			className={`
			border rounded-lg p-4 transition-all duration-200 
			${
				isHighlighted
					? 'bg-indigo-50 border-indigo-300 shadow-md'
					: 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
			}
			${isSelected ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''}
		`}
		>
			<label className="flex items-start space-x-3 cursor-pointer">
				<div className="flex-shrink-0 mt-1">
					<input
						type="checkbox"
						checked={isSelected}
						onChange={onToggle}
						className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
					/>
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center space-x-2">
							<span className="text-sm font-semibold text-gray-900">{displayName}</span>
							{isHighlighted && (
								<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
									Requested
								</span>
							)}
						</div>
						<button
							type="button"
							className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
							onClick={(e) => {
								e.preventDefault();
								setShowDetails(!showDetails);
							}}
						>
							{showDetails ? 'Hide Details' : 'Show Details'}
						</button>
					</div>

					{displayDescription && <p className="text-sm text-gray-600 mb-2">{displayDescription}</p>}

					{!showDetails && (
						<div className="text-sm text-gray-500">
							<RuleSetSummaryDisplay summary={getRuleSetSummary(ruleSet)} />
						</div>
					)}

					{showDetails && (
						<div className="mt-4 space-y-4">
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
								<div className="flex items-start">
									<div className="flex-shrink-0">
										<svg
											className="h-5 w-5 text-yellow-400"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<div className="ml-3">
										<div className="text-sm text-yellow-800 font-medium">
											This will grant the following permissions:
										</div>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								{/* Render balance rules */}
								{ruleSet.rules?.balances?.map((rule, i) => (
									<PolicyRule key={`balance-${i}`} rule={rule} />
								))}

								{/* Render all balances rule */}
								{ruleSet.rules?.allBalances && <PolicyRule rule={ruleSet.rules.allBalances} />}

								{/* Render owned object rules */}
								{ruleSet.rules?.ownedObjects?.map((rule, i) => (
									<PolicyRule key={`owned-${i}`} rule={rule} context="owned" />
								))}

								{/* Render session created object rules */}
								{ruleSet.rules?.sessionCreatedObjects?.map((rule, i) => (
									<PolicyRule key={`session-${i}`} rule={rule} context="sessionCreated" />
								))}

								{/* Check if there are no permissions */}
								{!ruleSet.rules?.balances?.length &&
									!ruleSet.rules?.allBalances &&
									!ruleSet.rules?.ownedObjects?.length &&
									!ruleSet.rules?.sessionCreatedObjects?.length && (
										<div className="bg-gray-100 rounded-lg p-3">
											<div className="text-sm text-gray-600 font-medium">
												• No permissions defined
											</div>
										</div>
									)}
							</div>

							<div className="border-t border-gray-200 pt-4">
								<button
									type="button"
									className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
									onClick={(e) => {
										e.preventDefault();
										setShowJson(!showJson);
									}}
								>
									{showJson ? 'Hide Technical Details' : 'Show Technical Details'}
								</button>
								{showJson && (
									<div className="mt-3 bg-gray-100 rounded-lg p-3">
										<pre className="text-xs text-gray-800 overflow-x-auto">
											{JSON.stringify(ruleSet, null, 2)}
										</pre>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</label>
		</div>
	);
}
