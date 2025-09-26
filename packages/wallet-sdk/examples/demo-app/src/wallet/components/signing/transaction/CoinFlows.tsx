// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import type { AutoApprovalAnalysis } from '@mysten/wallet-sdk';
import { CoinFlowEntry } from './CoinFlowEntry.js';
import type { CoinFlowEntryProps } from './CoinFlowEntry.js';

interface CoinFlowsProps {
	analysis?: AutoApprovalAnalysis;
}

function CoinFlowsCard({ title, flows }: { title: string; flows: CoinFlowEntryProps[] }) {
	// Outflows should always be visible (expanded by default)
	const isOutflow = title.toLowerCase().includes('outflow');
	const [isExpanded, setIsExpanded] = useState(isOutflow);

	if (flows.length === 0) {
		return null;
	}
	const cardColor = isOutflow ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50';
	const badgeColor = isOutflow ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';

	return (
		<div className={`border rounded-xl overflow-hidden shadow-sm ${cardColor} mb-4`}>
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full px-5 py-4 text-left hover:bg-opacity-80 focus:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all duration-200"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<span className="text-sm font-semibold text-gray-900">{title}</span>
						<span
							className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badgeColor}`}
						>
							{flows.length} {flows.length === 1 ? 'coin' : 'coins'}
						</span>
					</div>
					<svg
						className={`${isExpanded ? 'rotate-90' : ''} h-5 w-5 text-gray-500 transform transition-transform duration-200`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</button>
			{isExpanded && (
				<div className="px-5 pb-4 border-t border-gray-200 bg-white bg-opacity-60">
					<div className="space-y-3 mt-4">
						{flows.map((flow, index) => (
							<CoinFlowEntry key={`${flow.coinType}-${index}`} {...flow} />
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export function CoinFlows({ analysis }: CoinFlowsProps) {
	if (!analysis) {
		return (
			<div className="text-center py-6">
				<div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
				<div className="text-sm text-gray-600">Analyzing coin flows...</div>
			</div>
		);
	}

	return (
		<div>
			<CoinFlowsCard title="Potential coin outflow" flows={analysis.results.usdValue.coinTypes} />
		</div>
	);
}
