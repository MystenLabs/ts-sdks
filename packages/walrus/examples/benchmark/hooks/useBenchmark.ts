// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit-react';
import { useState, useEffect, useCallback } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { BenchmarkSettings } from '../components/BenchmarkSettings.js';
import type { BenchmarkResult } from '../components/BenchmarkResults.js';
import '../dapp-kit.js';

export function useBenchmark() {
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const [isRunning, setIsRunning] = useState(false);
	const [results, setResults] = useState<BenchmarkResult[]>([]);
	const [currentStatus, setCurrentStatus] = useState('');

	// Load results from localStorage on component mount
	useEffect(() => {
		const savedResults = localStorage.getItem('walrus-benchmark-results');
		if (savedResults) {
			try {
				const parsedResults = JSON.parse(savedResults);
				setResults(parsedResults);
			} catch (error) {
				console.warn('Failed to load saved benchmark results:', error);
			}
		}
	}, []);

	const parseSize = (sizeStr: string): number => {
		const str = sizeStr.toUpperCase();
		if (str.endsWith('KB')) {
			return parseFloat(str.slice(0, -2)) * 1024;
		} else if (str.endsWith('MB')) {
			return parseFloat(str.slice(0, -2)) * 1024 * 1024;
		} else if (str.endsWith('B')) {
			return parseFloat(str.slice(0, -1));
		}
		return parseFloat(str);
	};

	const removeResult = (id: string) => {
		const newResults = results.filter((r) => r.id !== id);
		setResults(newResults);
		localStorage.setItem('walrus-benchmark-results', JSON.stringify(newResults));
	};

	const clearResults = () => {
		setResults([]);
		localStorage.removeItem('walrus-benchmark-results');
	};

	const runBenchmark = useCallback(
		async (settings: BenchmarkSettings, onError: (error: string) => void) => {
			if (!currentAccount || !settings.secretKey) {
				return;
			}

			const sizeInBytes = parseSize(settings.size);
			const runId = Date.now();

			// Initialize benchmark result that will be updated when completed
			const benchmarkResult: BenchmarkResult = {
				id: `${runId}-${Math.random().toString(36).substring(2, 11)}`,
				settings: { ...settings },
				iterations: settings.iterations,
				status: 'running',
				avgEncodeTime: 0,
				avgRegisterTime: 0,
				avgUploadTime: 0,
				avgCertifyTime: 0,
				avgTotalTime: 0,
				timestamp: runId,
			};

			setIsRunning(true);
			// Add initial result to table
			setResults((prevResults) => [...prevResults, benchmarkResult]);

			const iterationResults: {
				encodeTime: number;
				registerTime: number;
				uploadTime: number;
				certifyTime: number;
				totalTime: number;
			}[] = [];

			function addIteration(iterationResult: (typeof iterationResults)[number]) {
				iterationResults.push(iterationResult);

				setResults((prevResults) => {
					const updatedResults = prevResults.map((r) =>
						r.id === benchmarkResult.id
							? {
									...r,
									avgEncodeTime:
										iterationResults.reduce((sum, r) => sum + r.encodeTime, 0) /
										settings.iterations,
									avgRegisterTime:
										iterationResults.reduce((sum, r) => sum + r.registerTime, 0) /
										settings.iterations,
									avgUploadTime:
										iterationResults.reduce((sum, r) => sum + r.uploadTime, 0) /
										settings.iterations,
									avgCertifyTime:
										iterationResults.reduce((sum, r) => sum + r.certifyTime, 0) /
										settings.iterations,
									avgTotalTime:
										iterationResults.reduce((sum, r) => sum + r.totalTime, 0) / settings.iterations,
								}
							: r,
					);

					return updatedResults;
				});
			}

			try {
				// Create keypair from the secret key
				const keypair = Ed25519Keypair.fromSecretKey(settings.secretKey);

				for (let iteration = 1; iteration <= settings.iterations; iteration++) {
					setCurrentStatus(`Running iteration ${iteration} of ${settings.iterations}...`);

					const data = createBlob(sizeInBytes, iteration);

					const walrusClient = settings.useUploadRelay
						? suiClient.walrusWithRelay
						: suiClient.walrusWithoutRelay;
					const flow = walrusClient.writeBlobFlow({ blob: data });

					// Step 1: Encode
					setCurrentStatus(`Iteration ${iteration}: Encoding blob...`);
					const encodeStart = performance.now();
					await flow.encode();
					const encodeTime = performance.now() - encodeStart;

					// Step 2: Register
					setCurrentStatus(`Iteration ${iteration}: Registering blob on-chain...`);
					const registerTx = flow.register({
						epochs: settings.epochs,
						deletable: false,
						owner: keypair.toSuiAddress(),
					});
					registerTx.setSender(keypair.toSuiAddress());

					// Sign transaction
					const startRegisterTime = performance.now();
					const { digest: registerDigest } = await keypair.signAndExecuteTransaction({
						transaction: registerTx,
						client: suiClient,
					});
					const registerTime = performance.now() - startRegisterTime;

					// Step 3: Upload
					setCurrentStatus(
						`Iteration ${iteration}: Uploading to ${settings.useUploadRelay ? 'upload relay' : 'storage nodes'}...`,
					);
					const uploadStart = performance.now();
					await flow.upload({ digest: registerDigest });
					const uploadTime = performance.now() - uploadStart;

					// Step 4: Certify
					setCurrentStatus(`Iteration ${iteration}: Certifying blob on-chain...`);
					const certifyTx = flow.certify();
					certifyTx.setSender(keypair.toSuiAddress());

					// Sign transaction
					const startCertifyTime = performance.now();
					await keypair.signAndExecuteTransaction({
						transaction: certifyTx,
						client: suiClient,
					});
					const certifyTime = performance.now() - startCertifyTime;
					const totalTime = performance.now() - encodeStart;

					await flow.getBlob();

					addIteration({
						encodeTime,
						registerTime,
						uploadTime,
						certifyTime,
						totalTime,
					});
				}

				setResults((prevResults) => {
					const updatedResults = prevResults.map((r) =>
						r.id === benchmarkResult.id
							? {
									...r,
									status: 'completed' as const,
								}
							: r,
					);
					localStorage.setItem('walrus-benchmark-results', JSON.stringify(updatedResults));
					return updatedResults;
				});
				setCurrentStatus('Benchmark completed!');
			} catch (error) {
				console.error('Benchmark failed:', error);

				setResults((prevResults) => {
					const updatedResults = prevResults.map((r) =>
						r.id === benchmarkResult.id
							? {
									...r,
									status: 'failed' as const,
								}
							: r,
					);
					localStorage.setItem('walrus-benchmark-results', JSON.stringify(updatedResults));
					return updatedResults;
				});
				const errorMessage = `Benchmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
				setCurrentStatus(errorMessage);
				onError(errorMessage);
			} finally {
				setIsRunning(false);
			}
		},
		[currentAccount, suiClient],
	);

	return {
		isRunning,
		results,
		currentStatus,
		runBenchmark,
		removeResult,
		clearResults,
	};
}

function createBlob(size: number, iteration: number) {
	const data = new Uint8Array(size);
	// Add unique header to prevent caching
	const timestamp = Date.now();
	const runInfo = new TextEncoder().encode(`Benchmark at ${timestamp}, iteration ${iteration}\n`);
	data.set(runInfo, 0);
	return data;
}
