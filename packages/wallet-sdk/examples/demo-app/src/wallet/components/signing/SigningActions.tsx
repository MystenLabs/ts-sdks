// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface SigningActionsProps {
	requestType: 'personalMessage' | 'transaction' | 'signAndExecute';
	onApprove: () => void;
	onReject: () => void;
	onEnableAutoApprovals?: () => void;
}

export function SigningActions({
	requestType,
	onApprove,
	onReject,
	onEnableAutoApprovals,
}: SigningActionsProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
			<button
				onClick={() => {
					onReject();
				}}
				className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
			>
				Cancel
			</button>

			<div className="flex flex-col sm:flex-row gap-3">
				{onEnableAutoApprovals && (
					<button
						onClick={() => {
							onEnableAutoApprovals();
						}}
						className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
					>
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
						Enable Auto Approvals
					</button>
				)}

				<button
					onClick={onApprove}
					className="px-8 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
				>
					{requestType === 'signAndExecute' ? 'Sign & Execute' : 'Sign'}
				</button>
			</div>
		</div>
	);
}
