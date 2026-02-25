// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';

import { formatWalletError } from './format-error.ts';

/** Parse a SUI amount string (e.g. "0.123456789") to MIST as BigInt without floating-point loss. */
function suiToMist(sui: string): bigint {
	const [whole = '0', frac = ''] = sui.split('.');
	const padded = frac.padEnd(9, '0').slice(0, 9);
	return BigInt(whole) * 1_000_000_000n + BigInt(padded);
}

export function Transfer() {
	const account = useCurrentAccount();
	const dAppKit = useDAppKit();
	const [recipient, setRecipient] = useState('');
	const [amount, setAmount] = useState('0.01');
	const [result, setResult] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleTransfer() {
		if (!account) return;
		setResult(null);
		setError(null);
		setPending(true);

		try {
			const tx = new Transaction();
			const amountMist = suiToMist(amount);
			const [coin] = tx.splitCoins(tx.gas, [amountMist]);
			tx.transferObjects([coin], recipient || account.address);

			const res = await dAppKit.signAndExecuteTransaction({ transaction: tx });
			const txData = res.Transaction ?? res.FailedTransaction;
			if (txData) {
				setResult(
					`Transaction ${txData.status.success ? 'executed' : 'failed'}!\nDigest: ${txData.digest}`,
				);
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
				<h2 className="text-lg font-semibold text-white mb-1">Transfer SUI</h2>
				<p className="text-sm text-slate-400">
					Split SUI from gas and transfer to a recipient. Leave recipient empty to send to yourself.
				</p>
			</div>

			<div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
				<div>
					<label className="block text-xs text-slate-400 mb-1">Recipient (optional)</label>
					<input
						value={recipient}
						onChange={(e) => setRecipient(e.target.value)}
						className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm text-slate-200 font-mono"
						placeholder={account?.address ?? '0x...'}
					/>
				</div>
				<div>
					<label className="block text-xs text-slate-400 mb-1">Amount (SUI)</label>
					<input
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm text-slate-200"
						type="number"
						step="0.001"
						min="0"
					/>
				</div>
				<button
					onClick={handleTransfer}
					disabled={pending}
					className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
				>
					{pending ? 'Signing...' : 'Transfer'}
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
