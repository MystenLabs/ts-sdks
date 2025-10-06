// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AutoApprovalIssue } from '@mysten/wallet-sdk';

interface PolicyStatusMessageProps {
	settingsIssues?: AutoApprovalIssue[];
	onEditPolicy: () => void;
	onRemovePolicy: () => void;
}

export function PolicyStatusMessage({
	settingsIssues,
	onEditPolicy,
	onRemovePolicy,
}: PolicyStatusMessageProps) {
	// Blue box for renewable issues with both options
	return (
		<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
			<div className="flex items-start space-x-3">
				<div className="flex-shrink-0">
					<div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
						<svg
							className="w-4 h-4 text-blue-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
							/>
						</svg>
					</div>
				</div>
				<div className="flex-1">
					<h3 className="text-sm font-medium text-blue-800 mb-1">Auto-approval not available</h3>
					{settingsIssues && settingsIssues.length > 0 && (
						<ul className="text-sm text-blue-700 mb-3">
							{settingsIssues.map((issue, i) => (
								<li key={i}>{issue.message}</li>
							))}
						</ul>
					)}
					<div className="flex flex-wrap gap-2">
						<button
							onClick={onEditPolicy}
							className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-orange-800 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
						>
							Edit Policy
						</button>
						<button
							onClick={onRemovePolicy}
							className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
						>
							Remove Policy
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	// 	// Orange/red box for non-renewable issues
	// 	return (
	// 		<div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
	// 			<div className="flex items-start space-x-3">
	// 				<div className="flex-shrink-0">
	// 					<div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
	// 						<svg
	// 							className="w-4 h-4 text-orange-600"
	// 							fill="none"
	// 							viewBox="0 0 24 24"
	// 							stroke="currentColor"
	// 						>
	// 							<path
	// 								strokeLinecap="round"
	// 								strokeLinejoin="round"
	// 								strokeWidth="2"
	// 								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z"
	// 							/>
	// 						</svg>
	// 					</div>
	// 				</div>
	// 				<div className="flex-1">
	// 					<h3 className="text-sm font-medium text-orange-800 mb-1">Policy Not Applied</h3>
	// 					<p className="text-sm text-orange-700 mb-3">{reason}</p>
	// 					<div className="flex flex-wrap gap-2">
	// 						{onEditPolicy && (
	// 							<button
	// 								onClick={onEditPolicy}
	// 								className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-orange-800 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
	// 							>
	// 								Edit Policy
	// 							</button>
	// 						)}
	// 						{onRemovePolicy && (
	// 							<button
	// 								onClick={onRemovePolicy}
	// 								className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
	// 							>
	// 								Remove Policy
	// 							</button>
	// 						)}
	// 					</div>
	// 				</div>
	// 			</div>
	// 		</div>
	// 	);
	// }
}
