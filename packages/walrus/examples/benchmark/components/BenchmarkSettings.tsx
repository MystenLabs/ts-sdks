// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { WalletBalances } from './WalletBalances.js';
import { useMemo } from 'react';
import type { Signer } from '@mysten/sui/cryptography';

export interface BenchmarkSettings {
	size: string;
	useUploadRelay: boolean;
	epochs: number;
	iterations: number;
	secretKey: string;
}

interface BenchmarkSettingsProps {
	settings: BenchmarkSettings;
	onSettingsChange: (settings: BenchmarkSettings) => void;
	onTransaction: (digest: string) => void;
	onRunBenchmark: () => void;
	onError: (error: string) => void;
	isRunning: boolean;
	currentStatus: string;
	refreshTrigger: number;
}

export function BenchmarkSettingsForm({
	settings,
	onSettingsChange,
	onRunBenchmark,
	onTransaction,
	isRunning,
	currentStatus,
	onError,
	refreshTrigger,
}: BenchmarkSettingsProps) {
	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const generateNewKeypair = () => {
		const keypair = Ed25519Keypair.generate();
		const secretKeyString = keypair.getSecretKey();
		onSettingsChange({ ...settings, secretKey: secretKeyString });
	};

	const [keypair, address] = useMemo((): [Signer | null, string | null] => {
		if (!settings.secretKey) {
			return [null, null];
		}
		try {
			const keypair = Ed25519Keypair.fromSecretKey(settings.secretKey);
			return [keypair, keypair.toSuiAddress()] as const;
		} catch {
			return [null, null];
		}
	}, [settings.secretKey]);

	return (
		<form
			onSubmit={handleFormSubmit}
			style={{
				marginBottom: '30px',
				padding: '20px',
				backgroundColor: '#f5f5f5',
				borderRadius: '8px',
			}}
		>
			<h3>Benchmark Settings</h3>
			<div style={{ marginBottom: '15px' }}>
				<label style={{ display: 'block', marginBottom: '5px' }}>
					Blob Size:
					<select
						value={settings.size}
						onChange={(e) => onSettingsChange({ ...settings, size: e.target.value })}
						disabled={isRunning}
						style={{ marginLeft: '10px', padding: '5px' }}
					>
						<option value="100KB">100 KB</option>
						<option value="500KB">500 KB</option>
						<option value="1MB">1 MB</option>
						<option value="5MB">5 MB</option>
						<option value="10MB">10 MB</option>
						<option value="25MB">25 MB</option>
						<option value="50MB">50 MB</option>
						<option value="100MB">100 MB</option>
						<option value="250MB">250 MB</option>
						<option value="500MB">500 MB</option>
					</select>
				</label>
			</div>

			<div style={{ marginBottom: '15px' }}>
				<label style={{ display: 'block', marginBottom: '5px' }}>
					Upload Method:
					<select
						value={settings.useUploadRelay ? 'relay' : 'direct'}
						onChange={(e) =>
							onSettingsChange({ ...settings, useUploadRelay: e.target.value === 'relay' })
						}
						disabled={isRunning}
						style={{ marginLeft: '10px', padding: '5px' }}
					>
						<option value="relay">Upload Relay</option>
						<option value="direct">Direct to Nodes</option>
					</select>
				</label>
			</div>

			<div style={{ marginBottom: '15px' }}>
				<label style={{ display: 'block', marginBottom: '5px' }}>
					Storage Epochs:
					<input
						type="number"
						value={settings.epochs}
						onChange={(e) =>
							onSettingsChange({ ...settings, epochs: parseInt(e.target.value) || 5 })
						}
						disabled={isRunning}
						style={{ marginLeft: '10px', padding: '5px', width: '60px' }}
					/>
				</label>
			</div>

			<div style={{ marginBottom: '15px' }}>
				<label style={{ display: 'block', marginBottom: '5px' }}>
					Iterations:
					<input
						type="number"
						value={settings.iterations}
						onChange={(e) =>
							onSettingsChange({ ...settings, iterations: parseInt(e.target.value) || 1 })
						}
						disabled={isRunning}
						style={{ marginLeft: '10px', padding: '5px', width: '60px' }}
					/>
				</label>
			</div>

			<div style={{ marginBottom: '15px' }}>
				<label style={{ display: 'block', marginBottom: '5px' }}>
					Secret Key (for automatic transaction signing):
				</label>
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
					<input
						type="text"
						value={settings.secretKey}
						onChange={(e) => onSettingsChange({ ...settings, secretKey: e.target.value })}
						disabled={isRunning}
						placeholder="Enter secret key or generate new one"
						style={{ flex: 1, padding: '5px', fontFamily: 'monospace' }}
					/>
					<button
						type="button"
						onClick={generateNewKeypair}
						disabled={isRunning}
						style={{
							padding: '5px 10px',
							backgroundColor: '#28a745',
							color: 'white',
							border: 'none',
							borderRadius: '3px',
							cursor: isRunning ? 'not-allowed' : 'pointer',
						}}
					>
						Generate New
					</button>
				</div>
				{settings.secretKey && (
					<div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
						Address: {address}
					</div>
				)}
			</div>

			<WalletBalances
				onError={onError}
				onTransaction={onTransaction}
				isDisabled={isRunning}
				signer={keypair}
				refreshTrigger={refreshTrigger}
			/>

			<button
				type="button"
				onClick={onRunBenchmark}
				disabled={isRunning}
				style={{
					padding: '10px 20px',
					backgroundColor: isRunning ? '#ccc' : '#0070f3',
					color: 'white',
					border: 'none',
					borderRadius: '4px',
					cursor: isRunning ? 'not-allowed' : 'pointer',
				}}
			>
				{isRunning ? 'Running Benchmark...' : 'Run Benchmark'}
			</button>

			{isRunning && <div style={{ marginTop: '10px', color: '#666' }}>Status: {currentStatus}</div>}
		</form>
	);
}
