// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';

import { formatWalletError } from './format-error.ts';

// Pre-compiled DevNFT module (a simple struct with name + description fields)
// Source: module dev_nft::dev_nft { struct DevNFT has key, store { id, name, description } }
const DEV_NFT_MODULES = [
	'oRzrCwYAAAAIAQAIAggQAxgKBSITBzVaCI8BYArvAQwM+wERAAUBCwIKAgwAAAwAAQEHAAIDBAADAgIAAAcAAQACCQMEAAMIAQgBBwgDAQgAAAEHCAMBCAIGRGV2TkZUBlN0cmluZwlUeENvbnRleHQDVUlEC2Rlc2NyaXB0aW9uB2Rldl9uZnQCaWQEbWludARuYW1lA25ldwZvYmplY3QGc3RyaW5nCnR4X2NvbnRleHQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAgMGCAIICAEECAEAAQAAAgYLAhEBCwALARIAAgA=',
];
const DEV_NFT_DEPENDENCIES = [
	'0x0000000000000000000000000000000000000000000000000000000000000001',
	'0x0000000000000000000000000000000000000000000000000000000000000002',
];

export function MintNFT() {
	const account = useCurrentAccount();
	const dAppKit = useDAppKit();
	const [packageId, setPackageId] = useState('');
	const [nftName, setNftName] = useState('My DevNFT #1');
	const [nftDescription, setNftDescription] = useState(
		'A test NFT minted from the dev wallet demo',
	);
	const [result, setResult] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [mintCount, setMintCount] = useState(1);

	async function handlePublish() {
		if (!account) return;
		setResult(null);
		setError(null);
		setPending(true);

		try {
			const tx = new Transaction();
			const cap = tx.publish({
				modules: DEV_NFT_MODULES,
				dependencies: DEV_NFT_DEPENDENCIES,
			});
			tx.transferObjects([cap], account.address);

			const res = await dAppKit.signAndExecuteTransaction({ transaction: tx });
			const txData = res.Transaction ?? res.FailedTransaction;
			if (txData) {
				if (!txData.status.success) {
					setError('Publish transaction failed');
					return;
				}
				// Find the published package ID from changed objects
				const published = txData.effects?.changedObjects?.find(
					(o: { outputState?: string }) => o.outputState === 'PackageWrite',
				);
				if (published) {
					setPackageId(published.objectId);
					setResult(`Package published!\nPackage ID: ${published.objectId}`);
				} else {
					setResult(
						`Transaction executed: ${txData.digest}\n(Could not extract package ID — enter it manually)`,
					);
				}
			}
		} catch (err) {
			setError(formatWalletError(err));
		} finally {
			setPending(false);
		}
	}

	async function handleMint() {
		if (!account || !packageId) return;
		setResult(null);
		setError(null);
		setPending(true);

		try {
			const tx = new Transaction();
			const nft = tx.moveCall({
				target: `${packageId}::dev_nft::mint`,
				arguments: [tx.pure.string(nftName), tx.pure.string(nftDescription)],
			});
			tx.transferObjects([nft], account.address);

			const res = await dAppKit.signAndExecuteTransaction({ transaction: tx });
			const txData = res.Transaction ?? res.FailedTransaction;
			if (txData) {
				if (txData.status.success) {
					setMintCount((c) => c + 1);
					setNftName(`My DevNFT #${mintCount + 1}`);
					const created = txData.effects?.changedObjects?.find(
						(o: { outputState?: string }) => o.outputState === 'ObjectWrite',
					);
					setResult(
						`NFT minted!\nDigest: ${txData.digest}${created ? `\nObject ID: ${created.objectId}` : ''}`,
					);
				} else {
					setError('Mint transaction failed');
				}
			}
		} catch (err) {
			setError(formatWalletError(err));
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold text-white mb-1">Mint NFT</h2>
				<p className="text-sm text-slate-400">
					Publish a simple NFT contract and mint objects. Minted NFTs appear in the wallet&apos;s
					Objects tab.
				</p>
			</div>

			{/* Step 1: Publish */}
			<div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
				<h3 className="text-sm font-semibold text-white">1. Publish Contract</h3>
				<p className="text-xs text-slate-400">
					Deploy a DevNFT module with a simple <code>mint(name, description)</code> function.
				</p>
				<div className="flex items-center gap-3">
					<button
						onClick={handlePublish}
						disabled={pending || !!packageId}
						className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
					>
						{pending && !packageId ? 'Publishing...' : packageId ? 'Published' : 'Publish'}
					</button>
					{packageId && (
						<span className="text-xs text-green-400 font-mono truncate" title={packageId}>
							{packageId.slice(0, 10)}...{packageId.slice(-6)}
						</span>
					)}
				</div>
				{!packageId && (
					<div>
						<label className="block text-xs text-slate-400 mb-1">
							Or enter an existing package ID
						</label>
						<input
							value={packageId}
							onChange={(e) => setPackageId(e.target.value)}
							className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm text-slate-200 font-mono"
							placeholder="0x..."
						/>
					</div>
				)}
			</div>

			{/* Step 2: Mint */}
			<div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
				<h3 className="text-sm font-semibold text-white">2. Mint NFT</h3>
				<div>
					<label className="block text-xs text-slate-400 mb-1">Name</label>
					<input
						value={nftName}
						onChange={(e) => setNftName(e.target.value)}
						className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm text-slate-200"
					/>
				</div>
				<div>
					<label className="block text-xs text-slate-400 mb-1">Description</label>
					<input
						value={nftDescription}
						onChange={(e) => setNftDescription(e.target.value)}
						className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm text-slate-200"
					/>
				</div>
				<button
					onClick={handleMint}
					disabled={pending || !packageId}
					className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
				>
					{pending && packageId ? 'Minting...' : 'Mint NFT'}
				</button>
			</div>

			{result && (
				<pre className="p-3 rounded bg-slate-950 text-green-400 text-xs font-mono whitespace-pre-wrap break-all">
					{result}
				</pre>
			)}
			{error && <div className="p-3 rounded bg-slate-950 text-red-400 text-xs">{error}</div>}
		</div>
	);
}
