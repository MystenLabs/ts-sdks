// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Input } from '../../../app/components/ui/Input.js';

interface PolicySettingsProps {
	remainingTransactions: string;
	usdBudget: string;
	suiBudget: string;
	onRemainingTransactionsChange: (value: string) => void;
	onUsdBudgetChange: (value: string) => void;
	onSuiBudgetChange: (value: string) => void;
}

export function PolicySettings({
	remainingTransactions,
	usdBudget,
	suiBudget,
	onRemainingTransactionsChange,
	onUsdBudgetChange,
	onSuiBudgetChange,
}: PolicySettingsProps) {
	return (
		<div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
			<div className="flex items-center space-x-3 mb-4">
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
								d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
							/>
						</svg>
					</div>
				</div>
				<div>
					<h3 className="text-lg font-semibold text-gray-900">Policy Settings</h3>
					<p className="text-sm text-gray-600">
						Set limits to control how much this policy can spend and how long it remains active
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Input
					label="Max Transactions"
					type="number"
					min="1"
					max="1000"
					value={remainingTransactions}
					onChange={(e) => onRemainingTransactionsChange(e.target.value)}
					placeholder="10"
					variant="compact"
				/>

				<Input
					label="USD Limit"
					type="number"
					min="0"
					step="0.01"
					value={usdBudget}
					onChange={(e) => onUsdBudgetChange(e.target.value)}
					placeholder="10"
					prefix="$"
					variant="compact"
				/>

				<Input
					label="SUI Budget"
					type="number"
					min="0"
					step="0.1"
					value={suiBudget}
					onChange={(e) => onSuiBudgetChange(e.target.value)}
					placeholder="1"
					suffix="SUI"
					variant="compact"
				/>
			</div>
		</div>
	);
}
