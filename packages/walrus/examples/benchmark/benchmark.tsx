// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit-react';
import { useState, useEffect } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ErrorDisplay } from './components/ErrorDisplay.js';
import { BenchmarkSettingsForm } from './components/BenchmarkSettings.js';
import type { BenchmarkSettings } from './components/BenchmarkSettings.js';
import { BenchmarkResults } from './components/BenchmarkResults.js';
import { useBenchmark } from './hooks/useBenchmark.js';

export function BenchmarkPage() {
	const currentAccount = useCurrentAccount();
	const [settings, setSettings] = useState<BenchmarkSettings>({
		size: '1MB',
		useUploadRelay: true,
		epochs: 1,
		iterations: 1,
		secretKey: '',
	});
	const [error, setError] = useState<string>('');
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const suiClient = useSuiClient();

	const { isRunning, results, currentStatus, runBenchmark, removeResult, clearResults } =
		useBenchmark();

	// Load settings from localStorage and generate keypair on first load
	useEffect(() => {
		const savedSettings = localStorage.getItem('walrus-benchmark-settings');
		if (savedSettings) {
			try {
				const parsedSettings = JSON.parse(savedSettings);
				setSettings(parsedSettings);
			} catch (error) {
				console.warn('Failed to load saved benchmark settings:', error);
			}
		} else {
			// Generate a new keypair on first load
			const keypair = Ed25519Keypair.generate();
			const newSettings = {
				...settings,
				secretKey: keypair.getSecretKey(),
			};
			setSettings(newSettings);
			localStorage.setItem('walrus-benchmark-settings', JSON.stringify(newSettings));
		}
	}, []);

	// Save settings to localStorage whenever they change
	useEffect(() => {
		if (settings.secretKey) {
			localStorage.setItem('walrus-benchmark-settings', JSON.stringify(settings));
		}
	}, [settings]);

	const handleRunBenchmark = async () => {
		await runBenchmark(settings, setError);
		// Trigger balance refresh after benchmark completes
		setRefreshTrigger((prev) => prev + 1);
	};

	async function handleTransaction(digest: string) {
		await suiClient.core.waitForTransaction({
			digest,
		});
		setRefreshTrigger((prev) => prev + 1);
	}

	if (!currentAccount) {
		return <div>Please connect your wallet to run benchmarks</div>;
	}

	return (
		<div>
			<h2>Walrus Benchmark</h2>

			<ErrorDisplay error={error} onClear={() => setError('')} />

			<BenchmarkSettingsForm
				settings={settings}
				onSettingsChange={setSettings}
				onRunBenchmark={handleRunBenchmark}
				onTransaction={handleTransaction}
				isRunning={isRunning}
				currentStatus={currentStatus}
				refreshTrigger={refreshTrigger}
				onError={setError}
			/>

			<BenchmarkResults
				results={results}
				onRemoveResult={removeResult}
				onClearResults={clearResults}
			/>
		</div>
	);
}
