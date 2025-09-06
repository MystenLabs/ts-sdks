// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useState, useCallback, useEffect } from 'react';
import { useCurrentAccount, useSuiClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { parseStructTag } from '@mysten/sui/utils';
import { useTransactionExecution } from '../hooks/useTransactionExecution.js';
import { Alert } from '../components/Alert.js';
import { TESTNET_WALRUS_PACKAGE_CONFIG, WalrusFile } from '@mysten/walrus';

const WAL_COIN_TYPE =
	'0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';

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
	const currentNetwork = useCurrentNetwork();

	// Helper function to get network-specific URLs
	const getNetworkUrls = (network: string) => {
		const isMainnet = network === 'mainnet';
		return {
			walruscan: isMainnet ? 'https://walruscan.com/mainnet' : 'https://walruscan.com/testnet',
			aggregator: isMainnet
				? 'https://aggregator.walrus.space'
				: 'https://aggregator.walrus-testnet.walrus.space',
		};
	};
	const [files, setFiles] = useState<File[]>([]);
	const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
	const [walBalance, setWalBalance] = useState<string>('0');
	const [suiBalance, setSuiBalance] = useState<string>('0');
	const [isLoadingBalances, setIsLoadingBalances] = useState(false);
	const [swapAmount, setSwapAmount] = useState('0.1');
	const [uploadStep, setUploadStep] = useState<string>('');

	const uploadExecution = useTransactionExecution();
	const swapExecution = useTransactionExecution();

	const loadBalances = useCallback(async () => {
		if (!account?.address) return;

		setIsLoadingBalances(true);
		try {
			const [suiBalanceRes, walBalanceRes] = await Promise.all([
				suiClient.getBalance({ owner: account.address }),
				suiClient.getBalance({
					owner: account.address,
					coinType: WAL_COIN_TYPE,
				}),
			]);

			setSuiBalance(suiBalanceRes.totalBalance);
			setWalBalance(walBalanceRes.totalBalance);
		} catch (error) {
			console.error('Failed to load balances:', error);
		} finally {
			setIsLoadingBalances(false);
		}
	}, [account?.address, suiClient]);

	// Load balances on mount and when account changes
	useEffect(() => {
		loadBalances();
	}, [loadBalances]);

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
				files: filesInfo.map((fileInfo, index) => ({
					patchId: fileInfo.id,
					fileName: files[index]?.name || `File ${index + 1}`,
				})),
				blobId: firstFile.blobId,
				digest: certifyResult.digest,
				timestamp: Date.now(),
			});

			setUploadStep('Upload completed successfully!');

			// Refresh balances after upload
			loadBalances();
		} catch (error) {
			console.error('Upload failed:', error);
			setUploadStep('');
			// Let the transaction execution error handling display the error
		}
	};

	const handleSwap = async () => {
		if (!account?.address) return;

		try {
			const swapAmountMist = BigInt(parseFloat(swapAmount) * 1_000_000_000);

			const tx = new Transaction();

			// Get the exchange object to find the package ID
			const exchange = await suiClient.getObject({
				id: TESTNET_WALRUS_PACKAGE_CONFIG.exchangeIds[2],
				options: { showType: true },
			});

			const exchangePackageId = parseStructTag(exchange.data?.type!).address;

			// Exchange SUI for WAL
			const wal = tx.moveCall({
				package: exchangePackageId,
				module: 'wal_exchange',
				function: 'exchange_all_for_wal',
				arguments: [
					tx.object(TESTNET_WALRUS_PACKAGE_CONFIG.exchangeIds[2]),
					coinWithBalance({ balance: swapAmountMist }),
				],
			});

			tx.transferObjects([wal], account.address);

			const result = await swapExecution.executeTransaction(tx);
			if (result) {
				// Refresh balances after swap
				loadBalances();
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
		return (
			<div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
				Please connect your wallet to use Walrus
			</div>
		);
	}

	return (
		<div style={{ padding: '20px', maxWidth: '800px' }}>
			<h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: '600' }}>
				Walrus Storage Demo
			</h2>

			{/* Balance Display */}
			<div
				style={{
					backgroundColor: '#f9f9f9',
					border: '1px solid #e0e0e0',
					borderRadius: '8px',
					padding: '16px',
					marginBottom: '20px',
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '12px',
					}}
				>
					<h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>
						Balances{' '}
						{isLoadingBalances && (
							<span style={{ fontSize: '12px', color: '#999' }}>(Loading...)</span>
						)}
					</h3>
					<button
						onClick={loadBalances}
						disabled={isLoadingBalances}
						style={{
							padding: '4px 8px',
							backgroundColor: '#f0f0f0',
							border: '1px solid #ddd',
							borderRadius: '4px',
							fontSize: '12px',
							cursor: isLoadingBalances ? 'not-allowed' : 'pointer',
							transition: 'background-color 0.2s ease',
						}}
						onMouseEnter={(e) => {
							if (!isLoadingBalances) {
								e.currentTarget.style.backgroundColor = '#e0e0e0';
							}
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = '#f0f0f0';
						}}
					>
						🔄 Refresh
					</button>
				</div>
				<div style={{ display: 'flex', gap: '20px' }}>
					<div>
						<div style={{ fontSize: '12px', color: '#666' }}>SUI Balance</div>
						<div style={{ fontSize: '16px', fontWeight: '500', fontFamily: 'monospace' }}>
							{formatBalance(suiBalance)} SUI
						</div>
					</div>
					<div>
						<div style={{ fontSize: '12px', color: '#666' }}>WAL Balance</div>
						<div style={{ fontSize: '16px', fontWeight: '500', fontFamily: 'monospace' }}>
							{formatBalance(walBalance)} WAL
						</div>
					</div>
				</div>
			</div>

			{/* SUI to WAL Swap */}
			<div
				style={{
					backgroundColor: '#fff',
					border: '1px solid #e0e0e0',
					borderRadius: '8px',
					padding: '16px',
					marginBottom: '20px',
				}}
			>
				<h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
					Swap SUI for WAL
				</h3>
				<div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
					<div style={{ flex: 1 }}>
						<label
							style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}
						>
							SUI Amount
						</label>
						<input
							type="number"
							step="0.1"
							min="0.1"
							value={swapAmount}
							onChange={(e) => setSwapAmount(e.target.value)}
							style={{
								width: '100%',
								padding: '8px 12px',
								border: '1px solid #ddd',
								borderRadius: '4px',
								fontSize: '14px',
							}}
						/>
					</div>
					<button
						onClick={handleSwap}
						disabled={swapExecution.isExecuting || !parseFloat(swapAmount)}
						style={{
							padding: '8px 16px',
							backgroundColor: swapExecution.isExecuting ? '#ccc' : '#1976d2',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							fontSize: '14px',
							fontWeight: '500',
							cursor: swapExecution.isExecuting ? 'not-allowed' : 'pointer',
							transition: 'background-color 0.2s ease',
						}}
					>
						{swapExecution.isExecuting ? 'Swapping...' : 'Swap'}
					</button>
				</div>
				{swapExecution.error && (
					<div style={{ marginTop: '12px' }}>
						<Alert
							type="error"
							message={swapExecution.error}
							onClose={() => swapExecution.setError(null)}
						/>
					</div>
				)}
			</div>

			{/* File Upload */}
			<div
				style={{
					backgroundColor: '#fff',
					border: '1px solid #e0e0e0',
					borderRadius: '8px',
					padding: '16px',
					marginBottom: '20px',
				}}
			>
				<h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
					Upload File to Walrus
				</h3>

				<div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
					Using upload relay for faster uploads with tip rewards for storage nodes.
				</div>

				<div style={{ marginBottom: '16px' }}>
					<label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
						Select Files
					</label>
					<input
						type="file"
						multiple
						onChange={handleFileChange}
						style={{
							width: '100%',
							padding: '8px',
							border: '1px solid #ddd',
							borderRadius: '4px',
							fontSize: '14px',
						}}
					/>
					{files.length > 0 && (
						<div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
							{files.length === 1 ? (
								<>
									Selected: {files[0].name} ({Math.round(files[0].size / 1024)} KB)
								</>
							) : (
								<>
									Selected {files.length} files:{' '}
									{files.map((file, index) => (
										<span key={index}>
											{file.name} ({Math.round(file.size / 1024)} KB)
											{index < files.length - 1 ? ', ' : ''}
										</span>
									))}
								</>
							)}
						</div>
					)}
				</div>

				<button
					onClick={handleUpload}
					disabled={files.length === 0 || uploadExecution.isExecuting || uploadStep !== ''}
					style={{
						padding: '10px 20px',
						backgroundColor:
							files.length === 0 || uploadExecution.isExecuting || uploadStep !== ''
								? '#ccc'
								: '#2e7d32',
						color: 'white',
						border: 'none',
						borderRadius: '4px',
						fontSize: '14px',
						fontWeight: '500',
						cursor:
							files.length === 0 || uploadExecution.isExecuting || uploadStep !== ''
								? 'not-allowed'
								: 'pointer',
						transition: 'background-color 0.2s ease',
					}}
				>
					{uploadExecution.isExecuting || uploadStep ? 'Uploading...' : 'Upload to Walrus'}
				</button>

				{/* Upload Progress & Results */}
				{(uploadStep || uploadResult) && (
					<div
						style={{
							marginTop: '16px',
							padding: '12px',
							backgroundColor: uploadResult ? '#f0f8ff' : '#f0f8ff',
							borderRadius: '4px',
							border: uploadResult ? '1px solid #1976d2' : '1px solid #1976d2',
						}}
					>
						{/* Show progress during upload */}
						{uploadStep && (
							<div
								style={{
									fontSize: '14px',
									color: '#1976d2',
									fontWeight: '500',
									marginBottom: uploadResult ? '12px' : '0',
								}}
							>
								{uploadStep}
							</div>
						)}

						{/* Show results when complete */}
						{uploadResult && (
							<div>
								<div
									style={{
										fontSize: '16px',
										fontWeight: '600',
										color: '#1976d2',
										marginBottom: '12px',
									}}
								>
									Upload Successful! 🎉
								</div>

								<div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
									<strong>Files:</strong> {uploadResult.files.length} file
									{uploadResult.files.length > 1 ? 's' : ''}
								</div>

								{uploadResult.files.map((file, index) => {
									const networkUrls = getNetworkUrls(currentNetwork);
									const downloadUrl = `${networkUrls.aggregator}/v1/blobs/by-quilt-patch-id/${file.patchId}`;
									return (
										<div
											key={index}
											style={{
												marginBottom: '12px',
												padding: '12px',
												backgroundColor: 'rgba(255, 255, 255, 0.7)',
												borderRadius: '4px',
												border: '1px solid rgba(25, 118, 210, 0.2)',
											}}
										>
											<div style={{ fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>
												{file.fileName}
											</div>

											<div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
												<strong>Patch ID:</strong>{' '}
												<span
													style={{
														fontFamily: 'monospace',
														fontSize: '11px',
														wordBreak: 'break-all',
													}}
												>
													{file.patchId}
												</span>
											</div>

											<div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
												<strong>Download URL:</strong>{' '}
												<a
													href={downloadUrl}
													target="_blank"
													rel="noopener noreferrer"
													style={{ color: '#1976d2', fontSize: '11px', wordBreak: 'break-all' }}
												>
													{downloadUrl}
												</a>
											</div>

											<a
												href={downloadUrl}
												target="_blank"
												rel="noopener noreferrer"
												style={{
													display: 'inline-flex',
													alignItems: 'center',
													gap: '4px',
													padding: '6px 12px',
													backgroundColor: '#1976d2',
													color: 'white',
													textDecoration: 'none',
													borderRadius: '4px',
													fontSize: '12px',
													fontWeight: '500',
												}}
											>
												⬇️ Download {file.fileName}
											</a>
										</div>
									);
								})}

								{/* Summary Info */}
								<div
									style={{
										marginTop: '16px',
										paddingTop: '12px',
										borderTop: '1px solid rgba(25, 118, 210, 0.3)',
									}}
								>
									<div style={{ marginBottom: '8px' }}>
										<strong>Blob ID:</strong>{' '}
										<span
											style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}
										>
											{uploadResult.blobId}
										</span>
									</div>
									<div style={{ marginBottom: '12px' }}>
										<strong>Transaction:</strong>{' '}
										<span
											style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all' }}
										>
											{uploadResult.digest}
										</span>
									</div>
									<a
										href={`${getNetworkUrls(currentNetwork).walruscan}/blob/${uploadResult.blobId}`}
										target="_blank"
										rel="noopener noreferrer"
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											gap: '4px',
											padding: '6px 12px',
											backgroundColor: '#1976d2',
											color: 'white',
											textDecoration: 'none',
											borderRadius: '4px',
											fontSize: '12px',
											fontWeight: '500',
										}}
									>
										🔍 View on Walruscan
									</a>
								</div>

								<div style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
									Uploaded at {new Date(uploadResult.timestamp).toLocaleString()}
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{uploadExecution.error && (
				<div style={{ marginTop: '12px' }}>
					<Alert
						type="error"
						message={uploadExecution.error}
						onClose={() => uploadExecution.setError(null)}
					/>
				</div>
			)}
		</div>
	);
}
