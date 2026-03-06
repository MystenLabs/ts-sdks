// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';

import { formatWalletError } from './format-error.ts';

export function TransactionDemo() {
	const account = useCurrentAccount();
	const dAppKit = useDAppKit();
	const [mode, setMode] = useState<'sign' | 'execute'>('sign');
	const [result, setResult] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit() {
		if (!account) return;
		setResult(null);
		setError(null);
		setPending(true);

		try {
			const tx = new Transaction();
			// Split 0.001 SUI (1_000_000 MIST) for a realistic demo transaction
			const [coin] = tx.splitCoins(tx.gas, [1_000_000]);
			tx.transferObjects([coin], account.address);

			if (mode === 'sign') {
				const { bytes, signature } = await dAppKit.signTransaction({ transaction: tx });
				setResult(
					`Signed (not executed)\nBytes: ${bytes.slice(0, 60)}...\nSignature: ${signature.slice(0, 60)}...`,
				);
			} else {
				const res = await dAppKit.signAndExecuteTransaction({ transaction: tx });
				const txData = res.Transaction ?? res.FailedTransaction;
				if (txData) {
					setResult(`${txData.status.success ? 'Executed' : 'Failed'}!\nDigest: ${txData.digest}`);
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
				<h2 className="text-lg font-semibold text-white mb-1">Transaction</h2>
				<p className="text-sm text-slate-400">
					Split 0.001 SUI and transfer to self to test the approval flow.
				</p>
			</div>

			<div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
				<div className="flex gap-4">
					<label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
						<input
							type="radio"
							checked={mode === 'sign'}
							onChange={() => setMode('sign')}
							className="accent-indigo-500"
						/>
						Sign Only
					</label>
					<label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
						<input
							type="radio"
							checked={mode === 'execute'}
							onChange={() => setMode('execute')}
							className="accent-indigo-500"
						/>
						Sign &amp; Execute
					</label>
				</div>
				<button
					onClick={handleSubmit}
					disabled={pending}
					className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
				>
					{pending ? 'Processing...' : mode === 'sign' ? 'Sign Transaction' : 'Sign & Execute'}
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
