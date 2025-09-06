// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';
import type { CoinFlows as CoinFlowsType } from '@mysten/wallet-sdk';
import { TransactionCommands } from './TransactionCommands.js';
import { TransactionInputs } from './TransactionInputs.js';
import { CoinFlows } from './CoinFlows.js';

interface TransactionDetailsProps {
	transaction: Transaction;
	coinFlows?: CoinFlowsType;
}

export function TransactionDetails({ transaction, coinFlows }: TransactionDetailsProps) {
	const [activeTab, setActiveTab] = useState<'summary' | 'inputs' | 'commands'>('summary');

	// Handle missing transaction
	if (!transaction) {
		return (
			<div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
				No transaction data available
			</div>
		);
	}

	// Extract transaction data - Transaction class may not have getData() method
	// Try to access the internal data structure or use available methods
	let inputs: any[] = [];
	let commands: any[] = [];

	try {
		// Try accessing internal structure (this is implementation-dependent)
		const transactionData = (transaction as any).blockData || (transaction as any);
		inputs = transactionData?.inputs || [];
		commands = transactionData?.commands || [];
	} catch (error) {
		console.warn('Unable to extract transaction details:', error);
	}

	const tabStyle = (isActive: boolean) => ({
		padding: '8px 16px',
		backgroundColor: isActive ? '#1976d2' : '#f5f5f5',
		color: isActive ? 'white' : '#333',
		border: 'none',
		cursor: 'pointer',
		fontSize: '12px',
		fontWeight: '500',
	});

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
			<div
				style={{
					display: 'flex',
					borderRadius: '6px',
					overflow: 'hidden',
					border: '1px solid #e0e0e0',
				}}
			>
				<button onClick={() => setActiveTab('summary')} style={tabStyle(activeTab === 'summary')}>
					Summary
				</button>
				<button onClick={() => setActiveTab('inputs')} style={tabStyle(activeTab === 'inputs')}>
					Inputs ({inputs.length})
				</button>
				<button onClick={() => setActiveTab('commands')} style={tabStyle(activeTab === 'commands')}>
					Commands ({commands.length})
				</button>
			</div>

			<div style={{ minHeight: '200px', overflowY: 'auto' }}>
				{activeTab === 'summary' && (
					<TransactionSummary
						inputs={inputs}
						commands={commands}
						transaction={transaction}
						coinFlows={coinFlows}
					/>
				)}
				{activeTab === 'inputs' && (
					<div>
						<p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
							By approving this transaction, you are giving permission to use the following inputs
							and transfer objects you own.
						</p>
						<TransactionInputs inputs={inputs} />
					</div>
				)}
				{activeTab === 'commands' && <TransactionCommands commands={commands} />}
			</div>
		</div>
	);
}

interface TransactionSummaryProps {
	inputs: any[];
	commands: any[];
	transaction: Transaction;
	coinFlows?: CoinFlowsType;
}

function TransactionSummary({ inputs, commands, transaction, coinFlows }: TransactionSummaryProps) {
	return (
		<div>
			<div style={{ marginBottom: '16px' }}>
				<h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600' }}>
					Transaction Summary
				</h4>
				<p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
					This transaction contains {commands.length} command{commands.length !== 1 ? 's' : ''} and{' '}
					{inputs.length} input{inputs.length !== 1 ? 's' : ''}.
				</p>
			</div>

			<div style={{ marginTop: '16px' }}>
				<h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600' }}>Balance Changes</h4>
				<CoinFlows transaction={transaction} coinFlows={coinFlows} />
			</div>
		</div>
	);
}
