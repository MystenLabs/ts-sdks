// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useDAppKit } from '@mysten/dapp-kit-react';
import { useState } from 'react';

import { formatWalletError } from './format-error.ts';

export function SignMessage() {
	const dAppKit = useDAppKit();
	const [message, setMessage] = useState('Hello from dev-wallet demo!');
	const [result, setResult] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSign() {
		setResult(null);
		setError(null);
		setPending(true);

		try {
			const encoded = new TextEncoder().encode(message);
			const { signature, bytes } = await dAppKit.signPersonalMessage({ message: encoded });
			setResult(
				`Signed!\nSignature: ${signature.slice(0, 60)}...\nBytes: ${bytes.slice(0, 60)}...`,
			);
		} catch (err) {
			setError(formatWalletError(err));
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold text-white mb-1">Sign Personal Message</h2>
				<p className="text-sm text-slate-400">
					Sign an arbitrary message with the connected wallet account.
				</p>
			</div>

			<div className="space-y-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
				<div>
					<label className="block text-xs text-slate-400 mb-1">Message</label>
					<input
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm text-slate-200"
						placeholder="Enter a message to sign"
					/>
				</div>
				<button
					onClick={handleSign}
					disabled={pending}
					className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
				>
					{pending ? 'Signing...' : 'Sign Message'}
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
