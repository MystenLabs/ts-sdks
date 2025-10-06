// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { useState } from 'react';
import { useTransactionExecution } from '../../hooks/useTransactionExecution.js';
import { Alert } from '../../components/ui/Alert.js';
import { Input } from '../../components/ui/Input.js';
import { ConnectWalletPrompt } from '../../components/ui/ConnectWalletPrompt.js';
import { DemoLayout } from '../../components/ui/DemoLayout.js';
import { WalrusFile } from '@mysten/walrus';
import { createMintNFTTransaction } from './transactions.js';
import { operationType } from '@mysten/wallet-sdk';
import type { DemoProps } from '../../../DemoApp.js';

export function NFTMintDemo({ onNavigate }: DemoProps = {}) {
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

			// Add operation type for auto-approval
			registerTx.add(operationType('nft-operations', 'Register NFT image'));

			const result = await uploadExecution.executeTransaction(registerTx);
			if (!result) {
				throw new Error('Failed to register file on-chain');
			}

			setUploadStep('Uploading to storage nodes...');
			await flow.upload({ digest: result.digest });

			setUploadStep('Finalizing...');
			const certifyTx = flow.certify();

			// Add operation type for auto-approval
			certifyTx.add(operationType('nft-operations', 'Certify NFT image'));

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

			// Now mint the NFT with the final image URL using transaction builder
			const tx = createMintNFTTransaction({
				name: nftName,
				description: nftDescription,
				imageUrl: finalImageUrl,
				senderAddress: currentAccount.address,
			});

			const result = await executeTransaction(tx);
			if (result) {
				setSuccessMessage(`Successfully minted NFT: ${nftName}! Switching to wallet...`);
				setNftName('');
				setNftDescription('');
				setNftImageUrl('');
				setSelectedFile(null);

				// Switch to wallet demo immediately
				onNavigate?.('wallet');
			}
		} catch (err) {
			console.error('NFT minting failed:', err);
			setError('Failed to mint NFT. Please try again.');
		}
	};

	if (!currentAccount) {
		return <ConnectWalletPrompt icon="🎨" description="Please connect your wallet to mint NFTs" />;
	}

	return (
		<DemoLayout>
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

			<div className="bg-white rounded-xl shadow-sm p-8">
				<div className="space-y-6">
					<Input
						label="NFT Name"
						id="nft-name"
						type="text"
						value={nftName}
						onChange={(e) => setNftName(e.target.value)}
						placeholder="My Awesome NFT"
					/>

					<div>
						<label
							htmlFor="nft-description"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Description
						</label>
						<textarea
							id="nft-description"
							value={nftDescription}
							onChange={(e) => setNftDescription(e.target.value)}
							placeholder="Describe your NFT..."
							rows={3}
							className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">NFT Image</label>

						{/* Image Input Method Selector */}
						<div className="mb-4 space-y-2">
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="radio"
									value="url"
									checked={imageInputMethod === 'url'}
									onChange={() => {
										setImageInputMethod('url');
										setSelectedFile(null);
									}}
									className="text-blue-600"
								/>
								<span className="text-sm text-gray-700">Use existing image URL</span>
							</label>
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="radio"
									value="file"
									checked={imageInputMethod === 'file'}
									onChange={() => {
										setImageInputMethod('file');
										setNftImageUrl('');
									}}
									className="text-blue-600"
								/>
								<span className="text-sm text-gray-700">Upload image to Walrus</span>
							</label>
						</div>

						{/* URL Input */}
						{imageInputMethod === 'url' && (
							<Input
								type="text"
								value={nftImageUrl}
								onChange={(e) => setNftImageUrl(e.target.value)}
								placeholder="https://example.com/image.png"
							/>
						)}

						{/* File Upload */}
						{imageInputMethod === 'file' && (
							<div className="space-y-3">
								<input
									type="file"
									accept="image/*"
									onChange={handleFileChange}
									className="w-full px-3 py-2.5 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
								/>
								{selectedFile && (
									<div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
										<strong>Selected:</strong> {selectedFile.name} (
										{(selectedFile.size / 1024).toFixed(1)} KB)
									</div>
								)}
								<div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
									💾 Image will be uploaded to Walrus for decentralized storage
								</div>
							</div>
						)}
					</div>

					{/* Upload Progress */}
					{uploadStep && (
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<div className="flex items-center gap-3">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
								<div className="text-sm text-blue-600 font-medium">{uploadStep}</div>
							</div>
						</div>
					)}

					{/* Preview */}
					{(nftImageUrl || selectedFile) && (
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
							<div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
								{nftImageUrl ? (
									<img
										src={nftImageUrl}
										alt="NFT Preview"
										className="w-full h-48 object-cover"
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
								) : selectedFile ? (
									<img
										src={URL.createObjectURL(selectedFile)}
										alt="NFT Preview"
										className="w-full h-48 object-cover"
										onError={(e) => {
											e.currentTarget.style.display = 'none';
										}}
									/>
								) : null}
							</div>
						</div>
					)}

					<div className="pt-4">
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
							className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{uploadStep ? 'Uploading Image...' : isExecuting ? 'Minting NFT...' : '🎨 Mint NFT'}
						</button>
					</div>
				</div>
			</div>
		</DemoLayout>
	);
}
