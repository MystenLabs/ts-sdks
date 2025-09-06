// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';
import { useTransactionExecution } from '../hooks/useTransactionExecution.js';
import { Alert } from '../components/Alert.js';
import { WalrusFile } from '@mysten/walrus';
import * as demoNftContract from '../contracts/demo_nft/demo_nft.js';

export function NFTMintDemo() {
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const currentNetwork = useCurrentNetwork();
	const { executeTransaction, isExecuting, error, setError } = useTransactionExecution();
	const uploadExecution = useTransactionExecution();

	const [nftName, setNftName] = useState('');
	const [nftDescription, setNftDescription] = useState('');
	const [nftImageUrl, setNftImageUrl] = useState('');
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Image input method: 'file' or 'url'
	const [imageInputMethod, setImageInputMethod] = useState<'file' | 'url'>('url');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploadStep, setUploadStep] = useState<string>('');

	// Helper function to get network-specific URLs (copied from WalrusDemo)
	const getNetworkUrls = (network: string) => {
		const isMainnet = network === 'mainnet';
		return {
			aggregator: isMainnet
				? 'https://aggregator.walrus.space'
				: 'https://aggregator.walrus-testnet.walrus.space',
		};
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setSelectedFile(file);
			// Clear any existing URL when file is selected
			setNftImageUrl('');
		}
	};

	const uploadFileToWalrus = async (): Promise<string | null> => {
		if (!selectedFile || !currentAccount) return null;

		try {
			setUploadStep('Uploading image to Walrus...');

			// Create WalrusFile from selected file
			const fileArrayBuffer = await selectedFile.arrayBuffer();
			const fileBytes = new Uint8Array(fileArrayBuffer);

			const walrusFile = WalrusFile.from({
				contents: fileBytes,
				identifier: selectedFile.name,
				tags: {
					'content-type': selectedFile.type || 'image/*',
					'original-name': selectedFile.name,
				},
			});

			const walrusClient = suiClient.walrus;
			const flow = walrusClient.writeFilesFlow({ files: [walrusFile] });

			// Upload process
			setUploadStep('Encoding file...');
			await flow.encode();

			setUploadStep('Registering on-chain...');
			const registerTx = flow.register({
				epochs: 5,
				deletable: true,
				owner: currentAccount.address,
			});

			const result = await uploadExecution.executeTransaction(registerTx);
			if (!result) {
				throw new Error('Failed to register file on-chain');
			}

			setUploadStep('Uploading to storage nodes...');
			await flow.upload({ digest: result.digest });

			setUploadStep('Finalizing...');
			const certifyTx = flow.certify();
			const certifyResult = await uploadExecution.executeTransaction(certifyTx);
			if (!certifyResult) {
				throw new Error('Failed to certify file on-chain');
			}

			// Get file info and generate aggregator URL
			const filesInfo = await flow.listFiles();
			if (filesInfo.length === 0) {
				throw new Error('No file info found after upload');
			}

			const fileInfo = filesInfo[0];
			const networkUrls = getNetworkUrls(currentNetwork);
			const imageUrl = `${networkUrls.aggregator}/v1/blobs/by-quilt-patch-id/${fileInfo.id}`;

			setUploadStep('');
			return imageUrl;
		} catch (error) {
			console.error('Walrus upload failed:', error);
			setUploadStep('');
			throw error;
		}
	};

	const handleMintNFT = async () => {
		if (!currentAccount) return;

		// Validation
		if (!nftName || !nftDescription) {
			setError('Please fill in name and description');
			return;
		}

		if (imageInputMethod === 'url' && !nftImageUrl) {
			setError('Please provide an image URL');
			return;
		}

		if (imageInputMethod === 'file' && !selectedFile) {
			setError('Please select an image file to upload');
			return;
		}

		try {
			let finalImageUrl = nftImageUrl;

			// If using file upload, upload to Walrus first
			if (imageInputMethod === 'file' && selectedFile) {
				const uploadedUrl = await uploadFileToWalrus();
				if (!uploadedUrl) {
					setError('Failed to upload image to Walrus');
					return;
				}
				finalImageUrl = uploadedUrl;
			}

			// Now mint the NFT with the final image URL using generated type-safe bindings
			const tx = new Transaction();

			// Use the generated type-safe mint function (package resolved via MVR overrides)
			tx.add(
				demoNftContract.mint({
					arguments: {
						name: nftName,
						description: nftDescription,
						imageUrl: finalImageUrl,
					},
				}),
			);

			const result = await executeTransaction(tx);
			if (result) {
				setSuccessMessage(`Successfully minted NFT: ${nftName}! Check your wallet to see it.`);
				setNftName('');
				setNftDescription('');
				setNftImageUrl('');
				setSelectedFile(null);
			}
		} catch (err) {
			console.error('NFT minting failed:', err);
			setError('Failed to mint NFT. Please try again.');
		}
	};

	if (!currentAccount) {
		return (
			<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
				<p>Please connect your wallet to mint NFTs</p>
			</div>
		);
	}

	return (
		<div>
			<div
				style={{
					backgroundColor: '#fff',
					borderRadius: '12px',
					padding: '32px',
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
					maxWidth: '600px',
					margin: '0 auto',
				}}
			>
				<h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600', color: '#333' }}>
					Mint Your NFT
				</h3>
				<p style={{ margin: '0 0 24px', color: '#666', fontSize: '14px' }}>
					Create your own NFT on the Sui blockchain with proper Display configuration. Gas fees
					apply.
				</p>

				{error && <Alert type="error" message={error} onClose={() => setError(null)} />}
				{uploadExecution.error && (
					<Alert
						type="error"
						message={uploadExecution.error}
						onClose={() => uploadExecution.setError(null)}
					/>
				)}
				{successMessage && (
					<Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
				)}

				<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					<div>
						<label
							htmlFor="nft-name"
							style={{
								display: 'block',
								marginBottom: '8px',
								fontSize: '14px',
								fontWeight: '500',
								color: '#333',
							}}
						>
							NFT Name
						</label>
						<input
							id="nft-name"
							type="text"
							value={nftName}
							onChange={(e) => setNftName(e.target.value)}
							placeholder="My Awesome NFT"
							style={{
								width: '100%',
								padding: '10px 12px',
								border: '1px solid #ddd',
								borderRadius: '6px',
								fontSize: '14px',
								boxSizing: 'border-box',
							}}
						/>
					</div>

					<div>
						<label
							htmlFor="nft-description"
							style={{
								display: 'block',
								marginBottom: '8px',
								fontSize: '14px',
								fontWeight: '500',
								color: '#333',
							}}
						>
							Description
						</label>
						<textarea
							id="nft-description"
							value={nftDescription}
							onChange={(e) => setNftDescription(e.target.value)}
							placeholder="Describe your NFT..."
							rows={3}
							style={{
								width: '100%',
								padding: '10px 12px',
								border: '1px solid #ddd',
								borderRadius: '6px',
								fontSize: '14px',
								boxSizing: 'border-box',
								resize: 'vertical',
							}}
						/>
					</div>

					<div>
						<label
							style={{
								display: 'block',
								marginBottom: '8px',
								fontSize: '14px',
								fontWeight: '500',
								color: '#333',
							}}
						>
							NFT Image
						</label>

						{/* Image Input Method Selector */}
						<div style={{ marginBottom: '12px' }}>
							<label
								style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
							>
								<input
									type="radio"
									value="url"
									checked={imageInputMethod === 'url'}
									onChange={() => {
										setImageInputMethod('url');
										setSelectedFile(null);
									}}
								/>
								<span style={{ fontSize: '14px' }}>Use existing image URL</span>
							</label>
							<label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
								<input
									type="radio"
									value="file"
									checked={imageInputMethod === 'file'}
									onChange={() => {
										setImageInputMethod('file');
										setNftImageUrl('');
									}}
								/>
								<span style={{ fontSize: '14px' }}>Upload image to Walrus</span>
							</label>
						</div>

						{/* URL Input */}
						{imageInputMethod === 'url' && (
							<input
								type="text"
								value={nftImageUrl}
								onChange={(e) => setNftImageUrl(e.target.value)}
								placeholder="https://example.com/image.png"
								style={{
									width: '100%',
									padding: '10px 12px',
									border: '1px solid #ddd',
									borderRadius: '6px',
									fontSize: '14px',
									boxSizing: 'border-box',
								}}
							/>
						)}

						{/* File Upload */}
						{imageInputMethod === 'file' && (
							<div>
								<input
									type="file"
									accept="image/*"
									onChange={handleFileChange}
									style={{
										width: '100%',
										padding: '8px',
										border: '1px solid #ddd',
										borderRadius: '6px',
										fontSize: '14px',
										boxSizing: 'border-box',
									}}
								/>
								{selectedFile && (
									<div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
										Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
									</div>
								)}
								<div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
									Image will be uploaded to Walrus for decentralized storage
								</div>
							</div>
						)}
					</div>

					{/* Upload Progress */}
					{uploadStep && (
						<div
							style={{
								marginTop: '16px',
								padding: '12px',
								backgroundColor: '#f0f8ff',
								borderRadius: '4px',
								border: '1px solid #1976d2',
							}}
						>
							<div
								style={{
									fontSize: '14px',
									color: '#1976d2',
									fontWeight: '500',
								}}
							>
								{uploadStep}
							</div>
						</div>
					)}

					{/* Preview */}
					{(nftImageUrl || selectedFile) && (
						<div style={{ marginTop: '16px' }}>
							<p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Preview:</p>
							{nftImageUrl ? (
								<img
									src={nftImageUrl}
									alt="NFT Preview"
									style={{
										maxWidth: '200px',
										maxHeight: '200px',
										borderRadius: '8px',
										border: '1px solid #e0e0e0',
									}}
									onError={(e) => {
										e.currentTarget.style.display = 'none';
									}}
								/>
							) : selectedFile ? (
								<img
									src={URL.createObjectURL(selectedFile)}
									alt="NFT Preview"
									style={{
										maxWidth: '200px',
										maxHeight: '200px',
										borderRadius: '8px',
										border: '1px solid #e0e0e0',
									}}
									onError={(e) => {
										e.currentTarget.style.display = 'none';
									}}
								/>
							) : null}
						</div>
					)}

					<button
						onClick={handleMintNFT}
						disabled={
							isExecuting ||
							uploadExecution.isExecuting ||
							!nftName ||
							!nftDescription ||
							(imageInputMethod === 'url' && !nftImageUrl) ||
							(imageInputMethod === 'file' && !selectedFile) ||
							!!uploadStep
						}
						style={{
							backgroundColor:
								isExecuting ||
								uploadExecution.isExecuting ||
								!nftName ||
								!nftDescription ||
								(imageInputMethod === 'url' && !nftImageUrl) ||
								(imageInputMethod === 'file' && !selectedFile) ||
								!!uploadStep
									? '#ce93d8'
									: '#9c27b0',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							padding: '12px 24px',
							cursor:
								isExecuting ||
								uploadExecution.isExecuting ||
								!nftName ||
								!nftDescription ||
								(imageInputMethod === 'url' && !nftImageUrl) ||
								(imageInputMethod === 'file' && !selectedFile) ||
								!!uploadStep
									? 'not-allowed'
									: 'pointer',
							fontSize: '14px',
							fontWeight: '500',
							opacity:
								isExecuting ||
								uploadExecution.isExecuting ||
								!nftName ||
								!nftDescription ||
								(imageInputMethod === 'url' && !nftImageUrl) ||
								(imageInputMethod === 'file' && !selectedFile) ||
								!!uploadStep
									? 0.7
									: 1,
							transition: 'all 0.2s ease',
						}}
					>
						{uploadStep ? 'Uploading Image...' : isExecuting ? 'Minting NFT...' : 'Mint NFT'}
					</button>
				</div>
			</div>
		</div>
	);
}
