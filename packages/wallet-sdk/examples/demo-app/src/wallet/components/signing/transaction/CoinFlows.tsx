// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit-react';
import type { Transaction } from '@mysten/sui/transactions';
import { extractCoinFlows } from '@mysten/wallet-sdk';
import type { CoinFlows as CoinFlowsType } from '@mysten/wallet-sdk';
import { CoinFlowEntry } from './CoinFlowEntry.js';
import type { CoinFlowEntryProps } from './CoinFlowEntry.js';

interface CoinFlowsProps {
	transaction?: Transaction;
	coinFlows?: CoinFlowsType;
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
							<CoinFlowEntry
								key={`${flow.coinType}-${index}`}
								coinType={flow.coinType}
								amount={flow.amount}
								decimals={flow.decimals}
								symbol={flow.symbol}
								isRecognized={flow.isRecognized}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export function CoinFlows({ transaction, coinFlows: propCoinFlows }: CoinFlowsProps) {
	const [coinFlows, setCoinFlows] = useState<CoinFlowsType | null>(propCoinFlows || null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const suiClient = useSuiClient();

	useEffect(() => {
		// If coinFlows are provided as props, use them directly
		if (propCoinFlows) {
			setCoinFlows(propCoinFlows);
			return;
		}

		// Only calculate coin flows if not provided and transaction is available
		if (!transaction) {
			setError('No transaction or coin flows provided');
			return;
		}

		const analyzeCoinFlows = async () => {
			setIsLoading(true);
			setError(null);

			try {
				// Perform dry run to get inflows
				let dryRun;
				try {
					// Convert transaction to bytes for dry run
					const transactionBytes = await transaction.build({ client: suiClient });
					dryRun = await suiClient.dryRunTransactionBlock({
						transactionBlock: transactionBytes,
					});
				} catch (dryRunError) {
					// If dry run fails, continue without inflows
					console.warn('Dry run failed, continuing without inflows:', dryRunError);
					dryRun = undefined;
				}

				const flows = await extractCoinFlows(transaction, suiClient, dryRun);
				setCoinFlows(flows);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to analyze coin flows');
			} finally {
				setIsLoading(false);
			}
		};

		analyzeCoinFlows();
	}, [transaction, suiClient, propCoinFlows]);

	if (isLoading) {
		return (
			<div className="text-center py-6">
				<div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
				<div className="text-sm text-gray-600">Analyzing coin flows...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<div className="flex items-start space-x-3">
					<div className="flex-shrink-0">
						<div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
							<svg className="w-4 h-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
								<path
									fillRule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-sm font-medium text-yellow-800 mb-1">Coin Flow Analysis Error</h3>
						<p className="text-sm text-yellow-700">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	if (!coinFlows || !coinFlows.outflows || coinFlows.outflows.length === 0) {
		return (
			<div className="text-center py-6 text-gray-500">
				<svg
					className="mx-auto h-12 w-12 text-gray-400"
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
				<p className="mt-2 text-sm">No coin flows detected in this transaction</p>
			</div>
		);
	}

	// Convert outflows to negative amounts for display
	const outflows = coinFlows.outflows.map((flow) => {
		try {
			const amount = BigInt(flow.amount) > 0n ? `-${flow.amount}` : flow.amount;
			return { ...flow, amount };
		} catch (error) {
			return { ...flow, amount: '0' };
		}
	});

	return (
		<div>
			<CoinFlowsCard title="Potential coin outflow" flows={outflows} />
		</div>
	);
}
