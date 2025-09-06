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
	const [isExpanded, setIsExpanded] = useState(true);

	if (flows.length === 0) {
		return null;
	}

	return (
		<div style={{ marginBottom: '16px' }}>
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				style={{
					background: 'none',
					border: 'none',
					padding: 0,
					fontSize: '13px',
					fontWeight: '600',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					gap: '4px',
					marginBottom: '8px',
				}}
			>
				<span style={{ fontSize: '11px' }}>{isExpanded ? '▼' : '▶'}</span>
				{title} ({flows.length})
			</button>
			{isExpanded && (
				<div
					style={{
						backgroundColor: '#f8f9fa',
						borderRadius: '6px',
						padding: '12px',
					}}
				>
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
			<div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
				Analyzing coin flows...
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					padding: '12px',
					backgroundColor: '#fee',
					color: '#c33',
					borderRadius: '4px',
					fontSize: '12px',
				}}
			>
				<strong>Coin Flow Analysis Error:</strong> {error}
			</div>
		);
	}

	if (!coinFlows || (coinFlows.outflows.length === 0 && coinFlows.inflows.length === 0)) {
		return (
			<div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
				No coin flows detected in this transaction.
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
			<CoinFlowsCard title="Expected coin inflow" flows={coinFlows.inflows} />
		</div>
	);
}
