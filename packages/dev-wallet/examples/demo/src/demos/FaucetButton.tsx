// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { useState } from 'react';

export function FaucetButton({ onSuccess }: { onSuccess?: () => void } = {}) {
	const account = useCurrentAccount();
	const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

	if (!account) return null;

	async function handleRequest() {
		if (!account) return;
		setStatus('loading');
		try {
			await requestSuiFromFaucetV2({
				host: getFaucetHost('devnet'),
				recipient: account.address,
			});
			setStatus('success');
			onSuccess?.();
			setTimeout(() => setStatus('idle'), 3000);
		} catch {
			setStatus('error');
			setTimeout(() => setStatus('idle'), 3000);
		}
	}

	const label = {
		idle: 'Request Devnet SUI',
		loading: 'Requesting...',
		success: 'SUI Received!',
		error: 'Faucet Error',
	}[status];

	return (
		<button
			onClick={handleRequest}
			disabled={status === 'loading'}
			className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
				status === 'success'
					? 'bg-green-600 text-white'
					: status === 'error'
						? 'bg-red-600 text-white'
						: 'bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50'
			}`}
		>
			{label}
		</button>
	);
}
