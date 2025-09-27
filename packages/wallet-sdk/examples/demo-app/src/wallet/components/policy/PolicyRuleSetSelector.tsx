// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import type { AutoApprovalOperation } from '@mysten/wallet-sdk';
import { PolicyOperation } from './PolicyOperation.js';

interface PolicyOperationSelectorProps {
	requestedOperation: AutoApprovalOperation | null | undefined;
	otherOperations: AutoApprovalOperation[];
	selectedOperations: string[];
	onOperationToggle: (operationId: string) => void;
}

export function PolicyOperationSelector({
	requestedOperation,
	otherOperations,
	selectedOperations,
	onOperationToggle,
}: PolicyOperationSelectorProps) {
	const [showOtherOperations, setShowOtherOperations] = useState(false);

	const enabledOtherOperationsCount = otherOperations.filter((rs) =>
		selectedOperations.includes(rs.id),
	).length;

	return (
		<div className="space-y-6">
			{requestedOperation ? (
				<>
					<div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
						{/* Requested Permission Section */}
						<div className="bg-indigo-50 border-b border-indigo-200 p-4">
							<div className="flex items-center space-x-3 mb-3">
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
							<PolicyOperation
								operation={requestedOperation}
								isHighlighted={true}
								isSelected={selectedOperations.includes(requestedOperation.id)}
								onToggle={() => onOperationToggle(requestedOperation.id)}
							/>
						</div>

						{/* Other Permissions Section - Grouped in same card */}
						{otherOperations.length > 0 && (
							<div>
								<button
									type="button"
									className="w-full px-6 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors border-t border-gray-200"
									onClick={() => setShowOtherOperations(!showOtherOperations)}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-3">
											<div className="flex-shrink-0">
												<div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
													<svg
														className="w-3 h-3 text-gray-600"
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
												<span className="text-sm font-medium text-gray-900">
													Other Available Permissions
												</span>
												<span className="text-sm text-gray-500 ml-2">
													({enabledOtherOperationsCount} of {otherOperations.length} enabled)
												</span>
											</div>
										</div>
										<svg
											className={`${showOtherOperations ? 'rotate-90' : ''} h-5 w-5 text-gray-400 transform transition-transform duration-200`}
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

								{showOtherOperations && (
									<div className="px-6 pb-6 pt-4">
										<div className="space-y-3">
											{otherOperations.map((operations) => (
												<PolicyOperation
													key={operations.id}
													operation={operations}
													isHighlighted={false}
													isSelected={selectedOperations.includes(operations.id)}
													onToggle={() => onOperationToggle(operations.id)}
												/>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>
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
						{otherOperations.map((operation) => (
							<PolicyOperation
								key={operation.id}
								operation={operation}
								isHighlighted={false}
								isSelected={selectedOperations.includes(operation.id)}
								onToggle={() => onOperationToggle(operation.id)}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
