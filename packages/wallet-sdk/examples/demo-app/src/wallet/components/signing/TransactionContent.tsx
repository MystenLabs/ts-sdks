// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TransactionDetails } from './transaction/TransactionDetails.js';
import type { AutoApprovalAnalysis } from '@mysten/wallet-sdk';

interface TransactionContentProps {
	analysis?: AutoApprovalAnalysis;
	autoApprovalState?: any;
}

export function TransactionContent({ analysis, autoApprovalState }: TransactionContentProps) {
	if (!analysis) {
		return null;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center space-x-2">
				<h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
				<div className="h-px bg-gray-300 flex-1"></div>
			</div>

			<div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
				<div className="p-5">
					<TransactionDetails analysis={analysis} autoApprovalState={autoApprovalState} />
				</div>
			</div>
		</div>
	);
}
