// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useCallback } from 'react';

interface AutoApprovalCountdownProps {
	initialSeconds: number;
	reason?: string;
	policyInfo?: {
		remainingBudget: string;
		totalBudget: string;
		remainingTransactions: number;
		totalTransactions: number;
	};
	onCancel: () => void;
	onComplete: () => void;
}

export function AutoApprovalCountdown({
	initialSeconds,
	reason,
	policyInfo,
	onCancel,
	onComplete,
}: AutoApprovalCountdownProps) {
	const [countdownSeconds, setCountdownSeconds] = useState(initialSeconds);
	const [isActive, setIsActive] = useState(true);

	// Handle countdown logic - this is the ONLY place that manages the countdown
	useEffect(() => {
		if (!isActive || countdownSeconds <= 0) {
			if (countdownSeconds <= 0) {
				console.log('✅ AutoApprovalCountdown completed - executing transaction');
				onComplete();
			}
			return;
		}

		const timer = setInterval(() => {
			setCountdownSeconds((prev) => {
				const next = prev - 1;
				console.log(`⏰ Countdown: ${next}s remaining`);
				return next;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [countdownSeconds, isActive, onComplete]);

	const handleCancel = useCallback(() => {
		console.log('🚫 Auto-approval countdown cancelled by user');
		setIsActive(false);
		onCancel();
	}, [onCancel]);

	const progress = ((initialSeconds - countdownSeconds) / initialSeconds) * 100;

	return (
		<div className="text-center p-6">
			{/* Progress bar */}
			<div className="w-full bg-gray-200 rounded-full h-2 mb-6">
				<div
					className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-linear"
					style={{ width: `${progress}%` }}
				/>
			</div>

			{/* Main message */}
			<div className="mb-4">
				<div className="text-lg font-semibold text-green-700 mb-2">
					🤖 Auto-Approving in {countdownSeconds}s
				</div>
				<div className="text-sm text-green-800 mb-3">
					{reason || 'Transaction approved by policy'}
				</div>
				{policyInfo && (
					<div className="text-xs text-green-600 bg-green-50 rounded-lg p-2">
						<div>Budget: {policyInfo.remainingBudget} SUI remaining</div>
						<div>{policyInfo.remainingTransactions} transactions left</div>
					</div>
				)}
			</div>

			{/* Countdown display */}
			<div className="text-4xl font-bold text-green-600 mb-6">{countdownSeconds}</div>

			{/* Cancel button */}
			<button
				onClick={handleCancel}
				className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 font-medium"
			>
				Cancel Auto-Approval
			</button>
		</div>
	);
}
