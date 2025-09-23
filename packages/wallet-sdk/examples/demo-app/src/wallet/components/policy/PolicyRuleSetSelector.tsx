// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import type { AutoApprovalRuleSet } from '@mysten/wallet-sdk';
import { PolicyRuleSet } from './PolicyRuleSet.js';

interface PolicyRuleSetSelectorProps {
	requestedRuleSet: AutoApprovalRuleSet | null | undefined;
	otherRuleSets: AutoApprovalRuleSet[];
	selectedRuleSets: string[];
	onRuleSetToggle: (ruleSetId: string) => void;
}

export function PolicyRuleSetSelector({
	requestedRuleSet,
	otherRuleSets,
	selectedRuleSets,
	onRuleSetToggle,
}: PolicyRuleSetSelectorProps) {
	const [showOtherRuleSets, setShowOtherRuleSets] = useState(false);

	const enabledOtherRuleSetsCount = otherRuleSets.filter((rs) =>
		selectedRuleSets.includes(rs.id),
	).length;

	return (
		<div className="space-y-6">
			{requestedRuleSet ? (
				<>
					<div className="bg-indigo-50 rounded-lg border border-indigo-200 p-6 shadow-sm">
						<div className="flex items-center space-x-3 mb-4">
							<div className="flex-shrink-0">
								<div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
									<svg
										className="w-4 h-4 text-indigo-600"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900">Requested Permission</h3>
								<p className="text-sm text-gray-600">
									The app is requesting access to this specific rule set
								</p>
							</div>
						</div>
						<PolicyRuleSet
							ruleSet={requestedRuleSet}
							isHighlighted={true}
							isSelected={selectedRuleSets.includes(requestedRuleSet.id)}
							onToggle={() => onRuleSetToggle(requestedRuleSet.id)}
						/>
					</div>

					{otherRuleSets.length > 0 && (
						<div className="bg-white rounded-lg border border-gray-200 shadow-sm">
							<button
								type="button"
								className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors"
								onClick={() => setShowOtherRuleSets(!showOtherRuleSets)}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-3">
										<div className="flex-shrink-0">
											<div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
												<svg
													className="w-4 h-4 text-gray-600"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
													/>
												</svg>
											</div>
										</div>
										<div>
											<span className="text-lg font-semibold text-gray-900">
												Other Available Permissions
											</span>
											<p className="text-sm text-gray-600 mt-1">
												{enabledOtherRuleSetsCount} of {otherRuleSets.length} enabled
											</p>
										</div>
									</div>
									<svg
										className={`${showOtherRuleSets ? 'rotate-90' : ''} h-5 w-5 text-gray-400 transform transition-transform duration-200`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</div>
							</button>

							{showOtherRuleSets && (
								<div className="px-6 pb-6 border-t border-gray-200">
									<div className="space-y-3 mt-4">
										{otherRuleSets.map((ruleSet) => (
											<PolicyRuleSet
												key={ruleSet.id}
												ruleSet={ruleSet}
												isHighlighted={false}
												isSelected={selectedRuleSets.includes(ruleSet.id)}
												onToggle={() => onRuleSetToggle(ruleSet.id)}
											/>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</>
			) : (
				<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
					<div className="flex items-center space-x-3 mb-4">
						<div className="flex-shrink-0">
							<div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
								<svg
									className="w-4 h-4 text-gray-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Available Rule Sets</h3>
							<p className="text-sm text-gray-600">Select which permissions you want to enable</p>
						</div>
					</div>
					<div className="space-y-3">
						{otherRuleSets.map((ruleSet) => (
							<PolicyRuleSet
								key={ruleSet.id}
								ruleSet={ruleSet}
								isHighlighted={false}
								isSelected={selectedRuleSets.includes(ruleSet.id)}
								onToggle={() => onRuleSetToggle(ruleSet.id)}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
