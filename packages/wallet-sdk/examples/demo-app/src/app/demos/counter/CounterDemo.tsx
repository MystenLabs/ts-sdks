// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { useState, useCallback, useEffect } from 'react';
import type { SuiObjectData } from '@mysten/sui/client';
import { useTransactionExecution } from '../../hooks/useTransactionExecution.js';
import { Alert } from '../../components/ui/Alert.js';
import { ConnectWalletPrompt } from '../../components/ui/ConnectWalletPrompt.js';
import { DemoLayout } from '../../components/ui/DemoLayout.js';
import { getNetworkConfig } from '../../constants/networks.js';
import {
	createCounterTransaction,
	incrementCounterTransaction,
	resetCounterTransaction,
} from './transactions.js';

export function CounterDemo() {
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const currentNetwork = useCurrentNetwork();
	const { executeTransaction, isExecuting, error, setError } = useTransactionExecution();

	const networkConfig = getNetworkConfig(currentNetwork);
	const [counterId, setCounterId] = useState<string | null>(null);
	const [counterData, setCounterData] = useState<SuiObjectData | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isIncrementing, setIsIncrementing] = useState(false);
	const [isResetting, setIsResetting] = useState(false);

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
			const tx = createCounterTransaction({
				senderAddress: currentAccount.address,
			});

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

		setIsIncrementing(true);
		try {
			const tx = incrementCounterTransaction({
				senderAddress: currentAccount.address,
				counterId,
			});

			await executeTransaction(tx);
			await fetchCounterData();
		} catch (error) {
			console.error('Failed to increment counter:', error);
		} finally {
			setIsIncrementing(false);
		}
	};

	const resetCounter = async () => {
		if (!currentAccount || !counterId) return;

		setIsResetting(true);
		try {
			const tx = resetCounterTransaction({
				senderAddress: currentAccount.address,
				counterId,
				newValue: 0,
			});

			await executeTransaction(tx);
			await fetchCounterData();
		} catch (error) {
			console.error('Failed to reset counter:', error);
		} finally {
			setIsResetting(false);
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
			<ConnectWalletPrompt
				icon="🔢"
				description="Please connect your wallet to use the counter demo"
			/>
		);
	}

	if (!networkConfig.counterPackageId) {
		return (
			<div className="max-w-md mx-auto text-center p-8 bg-white rounded-xl shadow-sm">
				<div className="text-4xl mb-4">⚠️</div>
				<h3 className="text-xl font-semibold text-gray-800 mb-3">Counter Not Available</h3>
				<p className="text-gray-600">
					The counter contract is not deployed on the {currentNetwork} network.
					<br />
					Please switch to testnet to use this demo.
				</p>
			</div>
		);
	}

	return (
		<DemoLayout>
			{error && <Alert type="error" message={error} onClose={() => setError(null)} />}

			{!counterId ? (
				<div className="text-center p-8 bg-white rounded-xl shadow-sm">
					<div className="text-6xl mb-6">🔢</div>
					<h3 className="text-xl font-semibold text-gray-800 mb-3">Create Your Counter</h3>
					<p className="text-gray-600 mb-6">
						Start by creating a counter to increment values on-chain
					</p>
					<button
						onClick={createCounter}
						disabled={isExecuting}
						className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isExecuting ? 'Creating...' : 'Create Counter'}
					</button>
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm p-8">
					<div className="mb-6">
						<h3 className="text-lg font-semibold text-gray-800 mb-2">Counter</h3>
						<div className="text-sm text-gray-500 mb-4">
							Counter ID:
							<code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono">
								{counterId}
							</code>
						</div>
					</div>

					<div className="text-center mb-8">
						<div className="text-6xl font-bold text-blue-600 mb-2">
							{isLoading ? '...' : getCounterValue(counterData)}
						</div>
						<div className="text-gray-500">Current Value</div>
					</div>

					<div className="flex gap-3 justify-center">
						<button
							onClick={incrementCounter}
							disabled={isIncrementing || isResetting || isLoading}
							className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isIncrementing ? 'Incrementing...' : '+ Increment'}
						</button>
						<button
							onClick={resetCounter}
							disabled={isIncrementing || isResetting || isLoading}
							className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isResetting ? 'Resetting...' : '↻ Reset'}
						</button>
					</div>
				</div>
			)}
		</DemoLayout>
	);
}
