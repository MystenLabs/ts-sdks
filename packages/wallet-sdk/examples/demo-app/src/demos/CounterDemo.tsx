// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useState, useCallback, useEffect } from 'react';
import type { SuiObjectData } from '@mysten/sui/client';
import { useTransactionExecution } from '../hooks/useTransactionExecution.js';
import { Alert } from '../components/Alert.js';
import { getNetworkConfig } from '../constants/networks.js';
import * as counterContract from '../contracts/counter/counter.js';

export function CounterDemo() {
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const currentNetwork = useCurrentNetwork();
	const { executeTransaction, isExecuting, error, setError } = useTransactionExecution();

	const networkConfig = getNetworkConfig(currentNetwork);
	const [counterId, setCounterId] = useState<string | null>(null);
	const [counterData, setCounterData] = useState<SuiObjectData | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const fetchCounterData = useCallback(async () => {
		if (!counterId) return;
		setIsLoading(true);
		try {
			const result = await suiClient.getObject({
				id: counterId,
				options: {
					showContent: true,
					showOwner: true,
				},
			});
			setCounterData(result.data || null);
		} catch (error) {
			console.error('Failed to fetch counter:', error);
		} finally {
			setIsLoading(false);
		}
	}, [counterId, suiClient]);

	useEffect(() => {
		fetchCounterData();
	}, [fetchCounterData]);

	const createCounter = async () => {
		if (!currentAccount) {
			setError('No wallet connected');
			return;
		}

		try {
			const tx = new Transaction();
			// Use the generated type-safe create function (package resolved via MVR overrides)
			tx.add(counterContract.create());

			const result = await executeTransaction(tx);
			const txResponse = await suiClient.waitForTransaction({
				digest: result.digest,
				options: { showEffects: true },
			});

			const createdId = txResponse.effects?.created?.[0]?.reference?.objectId;
			if (createdId) {
				setCounterId(createdId);
			}
		} catch (error) {
			console.error('Failed to create counter:', error);
		}
	};

	const incrementCounter = async () => {
		if (!currentAccount || !counterId) return;

		try {
			const tx = new Transaction();
			// Use the generated type-safe increment function (package resolved via MVR overrides)
			tx.add(
				counterContract.increment({
					arguments: {
						counter: counterId,
					},
				}),
			);

			await executeTransaction(tx);
			await fetchCounterData();
		} catch (error) {
			console.error('Failed to increment counter:', error);
		}
	};

	const resetCounter = async () => {
		if (!currentAccount || !counterId) return;

		try {
			const tx = new Transaction();
			// Use the generated type-safe setValue function (package resolved via MVR overrides)
			tx.add(
				counterContract.setValue({
					arguments: {
						counter: counterId,
						value: 0,
					},
				}),
			);

			await executeTransaction(tx);
			await fetchCounterData();
		} catch (error) {
			console.error('Failed to reset counter:', error);
		}
	};

	const getCounterValue = (data: SuiObjectData | null | undefined) => {
		if (!data || data.content?.dataType !== 'moveObject') {
			return 0;
		}
		return (data.content.fields as { value: number })?.value || 0;
	};

	if (!currentAccount) {
		return (
			<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
				<p>Please connect your wallet to use the counter demo</p>
			</div>
		);
	}

	if (!networkConfig.counterPackageId) {
		return (
			<div style={{ textAlign: 'center', padding: '60px 40px' }}>
				<div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>⚠️</div>
				<h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600', color: '#333' }}>
					Counter Not Available
				</h3>
				<p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
					The counter contract is not deployed on the {currentNetwork} network.
					<br />
					Please switch to testnet to use this demo.
				</p>
			</div>
		);
	}

	return (
		<div>
			{error && <Alert type="error" message={error} onClose={() => setError(null)} />}

			{!counterId ? (
				<div style={{ textAlign: 'center', padding: '60px 40px' }}>
					<div
						style={{
							fontSize: '64px',
							marginBottom: '24px',
							opacity: 0.2,
						}}
					>
						🔢
					</div>
					<h3 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '600', color: '#333' }}>
						No Counter Yet
					</h3>
					<p style={{ marginBottom: '24px', color: '#666', fontSize: '16px' }}>
						Create a counter to start incrementing values on-chain
					</p>
					<button
						onClick={createCounter}
						disabled={isExecuting}
						style={{
							backgroundColor: isExecuting ? '#81c784' : '#4caf50',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							padding: '12px 24px',
							cursor: isExecuting ? 'not-allowed' : 'pointer',
							fontSize: '14px',
							fontWeight: '500',
							opacity: isExecuting ? 0.7 : 1,
							transition: 'all 0.2s ease',
						}}
					>
						{isExecuting ? 'Creating...' : 'Create Counter'}
					</button>
				</div>
			) : (
				<div style={{ textAlign: 'center', padding: '40px' }}>
					<div
						style={{
							backgroundColor: '#fff',
							borderRadius: '12px',
							padding: '40px',
							boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
							maxWidth: '400px',
							margin: '0 auto',
						}}
					>
						<div style={{ marginBottom: '32px' }}>
							<div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Counter ID</div>
							<code
								style={{
									backgroundColor: '#f0f0f0',
									padding: '8px 12px',
									borderRadius: '6px',
									fontSize: '13px',
									display: 'inline-block',
									fontFamily: 'monospace',
									wordBreak: 'break-all',
								}}
							>
								{counterId}
							</code>
						</div>

						<div
							style={{
								fontSize: '72px',
								fontWeight: 'bold',
								marginBottom: '32px',
								color: '#333',
								lineHeight: 1,
							}}
						>
							{isLoading ? '...' : getCounterValue(counterData)}
						</div>

						<div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
							<button
								onClick={incrementCounter}
								disabled={isExecuting || isLoading}
								style={{
									backgroundColor: isExecuting || isLoading ? '#90caf9' : '#2196F3',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									padding: '10px 20px',
									cursor: isExecuting || isLoading ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									opacity: isExecuting || isLoading ? 0.7 : 1,
									transition: 'all 0.2s ease',
								}}
							>
								{isExecuting ? 'Incrementing...' : 'Increment'}
							</button>
							<button
								onClick={resetCounter}
								disabled={isExecuting || isLoading}
								style={{
									backgroundColor: isExecuting || isLoading ? '#ffcc80' : '#ff9800',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									padding: '10px 20px',
									cursor: isExecuting || isLoading ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: '500',
									opacity: isExecuting || isLoading ? 0.7 : 1,
									transition: 'all 0.2s ease',
								}}
							>
								{isExecuting ? 'Resetting...' : 'Reset'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
