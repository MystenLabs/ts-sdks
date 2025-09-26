// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit-react';
import { useTransactionExecution } from '../../hooks/useTransactionExecution.js';
import { useWalrusBalances } from '../../hooks/useWalrusBalances.js';
import { useNetworkConfig } from '../../hooks/useNetworkConfig.js';
import { createSwapSuiForWalTransaction } from './transactions.js';
import { Alert } from '../../components/ui/Alert.js';
import { Input } from '../../components/ui/Input.js';
import { Card, CardContent, CardHeader } from '../../components/ui/Card.js';
import { ConnectWalletPrompt } from '../../components/ui/ConnectWalletPrompt.js';
import { DemoLayout } from '../../components/ui/DemoLayout.js';
import { WalrusFile } from '@mysten/walrus';

interface UploadResult {
	files: Array<{
		patchId: string;
		fileName: string;
	}>;
	blobId: string;
	digest: string;
	timestamp: number;
}

export function WalrusDemo() {
	const account = useCurrentAccount();
	const suiClient = useSuiClient();
	const { networkUrls } = useNetworkConfig();
	const {
		walBalance,
		suiBalance,
		isLoading: isLoadingBalances,
		refetchBalances,
	} = useWalrusBalances(account?.address);
	const [files, setFiles] = useState<File[]>([]);
	const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
	const [swapAmount, setSwapAmount] = useState('0.1');
	const [uploadStep, setUploadStep] = useState<string>('');

	const uploadExecution = useTransactionExecution();
	const swapExecution = useTransactionExecution();

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = event.target.files;
		setFiles(selectedFiles ? Array.from(selectedFiles) : []);
	};

	const handleUpload = async () => {
		if (files.length === 0 || !account) return;

		// Reset previous results and progress
		setUploadResult(null);

		try {
			setUploadStep(`Preparing ${files.length} file${files.length > 1 ? 's' : ''}...`);

			// Create WalrusFiles from all selected files
			const walrusFiles = await Promise.all(
				files.map(async (file) => {
					const fileArrayBuffer = await file.arrayBuffer();
					const fileBytes = new Uint8Array(fileArrayBuffer);

					return WalrusFile.from({
						contents: fileBytes,
						identifier: file.name,
						tags: {
							'content-type': file.type || 'application/octet-stream',
							'original-name': file.name,
						},
					});
				}),
			);

			const walrusClient = suiClient.walrus;

			// Create upload flow for files (creates a quilt)
			const flow = walrusClient.writeFilesFlow({ files: walrusFiles });

			// Step 1: Encode
			setUploadStep('Encoding files for storage...');
			await flow.encode();

			// Step 2: Register on-chain
			setUploadStep('Registering blob on-chain...');
			const registerTx = flow.register({
				epochs: 5,
				deletable: true,
				owner: account.address,
			});

			const result = await uploadExecution.executeTransaction(registerTx);
			if (!result) {
				throw new Error('Failed to register blob on-chain');
			}

			// Step 3: Upload to storage nodes
			setUploadStep('Uploading to storage nodes...');
			await flow.upload({ digest: result.digest });

			// Step 4: Certify on-chain
			setUploadStep('Finalizing and certifying...');
			const certifyTx = flow.certify();
			const certifyResult = await uploadExecution.executeTransaction(certifyTx);
			if (!certifyResult) {
				throw new Error('Failed to certify blob on-chain');
			}

			// Now we can get files info after certification
			const filesInfo = await flow.listFiles();
			if (filesInfo.length === 0) {
				throw new Error('No file info found after certification');
			}

			// Set final result with all files
			const firstFile = filesInfo[0];
			setUploadResult({
				files: filesInfo.map((fileInfo: { id: string }, index: number) => ({
					patchId: fileInfo.id,
					fileName: files[index]?.name || `File ${index + 1}`,
				})),
				blobId: firstFile.blobId,
				digest: certifyResult.digest,
				timestamp: Date.now(),
			});

			setUploadStep('Upload completed successfully!');

			// Refresh balances after upload
			refetchBalances();
		} catch (error) {
			console.error('Upload failed:', error);
			setUploadStep('');
			// Let the transaction execution error handling display the error
		}
	};

	const handleSwap = async () => {
		if (!account?.address) return;

		try {
			const tx = await createSwapSuiForWalTransaction(
				{
					senderAddress: account.address,
					swapAmount: parseFloat(swapAmount),
				},
				suiClient,
			);

			const result = await swapExecution.executeTransaction(tx);
			if (result) {
				// Refresh balances after swap
				refetchBalances();
			}
		} catch (error) {
			console.error('Swap failed:', error);
		}
	};

	const formatBalance = (balance: string, decimals = 9) => {
		const num = BigInt(balance);
		const divisor = BigInt(10 ** decimals);
		const quotient = num / divisor;
		const remainder = num % divisor;

		if (remainder === 0n) {
			return quotient.toString();
		}

		const remainderStr = remainder.toString().padStart(decimals, '0');
		const trimmed = remainderStr.replace(/0+$/, '');
		return `${quotient}.${trimmed}`;
	};

	if (!account) {
		return <ConnectWalletPrompt icon="🐋" description="Please connect your wallet to use Walrus" />;
	}

	return (
		<DemoLayout>
			{/* Balance Display */}
			<Card variant="elevated">
				<CardContent>
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-lg font-semibold text-gray-800">
							Token Balances{' '}
							{isLoadingBalances && (
								<span className="text-sm text-gray-400 font-normal">(Loading...)</span>
							)}
						</h3>
						<button
							onClick={refetchBalances}
							disabled={isLoadingBalances}
							className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							🔄 Refresh
						</button>
					</div>
					<div className="grid grid-cols-2 gap-6">
						<div className="bg-blue-50 rounded-lg p-4">
							<div className="text-sm text-blue-600 font-medium mb-1">SUI Balance</div>
							<div className="text-2xl font-bold text-blue-800 font-mono">
								{formatBalance(suiBalance)} SUI
							</div>
						</div>
						<div className="bg-purple-50 rounded-lg p-4">
							<div className="text-sm text-purple-600 font-medium mb-1">WAL Balance</div>
							<div className="text-2xl font-bold text-purple-800 font-mono">
								{formatBalance(walBalance)} WAL
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* SUI to WAL Swap */}
			<Card variant="elevated">
				<CardHeader>
					<h3 className="text-lg font-semibold text-gray-800 mb-2">💱 Swap SUI for WAL</h3>
					<p className="text-sm text-gray-600">
						WAL tokens are required for Walrus storage operations. Exchange your SUI tokens to get
						WAL.
					</p>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4">
						<div className="flex-1">
							<Input
								label="SUI Amount"
								type="number"
								step="0.1"
								min="0.1"
								value={swapAmount}
								onChange={(e) => setSwapAmount(e.target.value)}
							/>
						</div>
						<div className="flex items-end">
							<button
								onClick={handleSwap}
								disabled={swapExecution.isExecuting || !parseFloat(swapAmount)}
								className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{swapExecution.isExecuting ? 'Swapping...' : 'Swap'}
							</button>
						</div>
					</div>
					{swapExecution.error && (
						<div className="mt-4">
							<Alert
								type="error"
								message={swapExecution.error}
								onClose={() => swapExecution.setError(null)}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{/* File Upload */}
			<Card variant="elevated">
				<CardHeader>
					<h3 className="text-lg font-semibold text-gray-800">📁 Upload Files to Walrus</h3>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg mb-4">
						Using upload relay for faster uploads with tip rewards for storage nodes.
					</div>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Select Files</label>
							<input
								type="file"
								multiple
								onChange={handleFileChange}
								className="w-full px-3 py-2.5 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
							/>
							{files.length > 0 && (
								<div className="mt-3 p-3 bg-gray-50 rounded-lg">
									{files.length === 1 ? (
										<div className="text-sm text-gray-600">
											<strong>Selected:</strong> {files[0].name} ({Math.round(files[0].size / 1024)}{' '}
											KB)
										</div>
									) : (
										<div className="text-sm text-gray-600">
											<strong>Selected {files.length} files:</strong>
											<div className="mt-1 space-y-1">
												{files.map((file, index) => (
													<div key={index} className="text-xs text-gray-500">
														• {file.name} ({Math.round(file.size / 1024)} KB)
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}
						</div>

						<button
							onClick={handleUpload}
							disabled={files.length === 0 || uploadExecution.isExecuting || uploadStep !== ''}
							className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{uploadExecution.isExecuting || uploadStep ? 'Uploading...' : '🐋 Upload to Walrus'}
						</button>
					</div>

					{/* Upload Progress & Results */}
					{(uploadStep || uploadResult) && (
						<div className="mt-6 space-y-4">
							{/* Show progress during upload */}
							{uploadStep && (
								<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
									<div className="flex items-center gap-3">
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
										<div className="text-sm text-blue-600 font-medium">{uploadStep}</div>
									</div>
								</div>
							)}

							{/* Show results when complete */}
							{uploadResult && (
								<div className="bg-green-50 border border-green-200 rounded-lg p-6">
									<div className="text-center mb-6">
										<div className="text-4xl mb-2">🎉</div>
										<h4 className="text-lg font-semibold text-green-800">Upload Successful!</h4>
										<p className="text-sm text-green-600">
											{uploadResult.files.length} file{uploadResult.files.length > 1 ? 's' : ''}{' '}
											uploaded to Walrus
										</p>
									</div>

									<div className="space-y-4">
										{uploadResult.files.map((file, index) => {
											const downloadUrl = `${networkUrls.aggregator}/v1/blobs/by-quilt-patch-id/${file.patchId}`;
											return (
												<div
													key={index}
													className="bg-white rounded-lg p-4 border border-green-200"
												>
													<div className="flex justify-between items-start mb-3">
														<h5 className="font-medium text-gray-800">{file.fileName}</h5>
														<a
															href={downloadUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="px-3 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
														>
															⬇️ Download
														</a>
													</div>

													<div className="space-y-2 text-sm">
														<div>
															<span className="text-gray-600 font-medium">Patch ID:</span>
															<code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono break-all">
																{file.patchId}
															</code>
														</div>

														<div>
															<span className="text-gray-600 font-medium">Download URL:</span>
															<a
																href={downloadUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="ml-2 text-blue-600 hover:text-blue-800 text-xs break-all"
															>
																{downloadUrl}
															</a>
														</div>
													</div>
												</div>
											);
										})}

										{/* Summary Info */}
										<div className="border-t border-green-200 pt-4 space-y-3">
											<div className="text-sm">
												<span className="text-gray-600 font-medium">Blob ID:</span>
												<code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono break-all">
													{uploadResult.blobId}
												</code>
											</div>
											<div className="text-sm">
												<span className="text-gray-600 font-medium">Transaction:</span>
												<code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono break-all">
													{uploadResult.digest}
												</code>
											</div>
											<div className="flex justify-between items-center">
												<div className="text-xs text-gray-500">
													Uploaded at {new Date(uploadResult.timestamp).toLocaleString()}
												</div>
												<a
													href={`${networkUrls.walruscan}/blob/${uploadResult.blobId}`}
													target="_blank"
													rel="noopener noreferrer"
													className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
												>
													🔍 View on Walruscan
												</a>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{uploadExecution.error && (
				<Alert
					type="error"
					message={uploadExecution.error}
					onClose={() => uploadExecution.setError(null)}
				/>
			)}
		</DemoLayout>
	);
}
