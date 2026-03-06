// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'dev-wallet:standalone-origin';

export function StandaloneSetup() {
	const [origin, setOrigin] = useState(
		() => localStorage.getItem(STORAGE_KEY) || 'http://localhost:5174',
	);
	const [registered, setRegistered] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const unregisterRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (!saved) return;

		let cancelled = false;
		import('@mysten/dev-wallet/client').then(({ DevWalletClient }) => {
			if (cancelled) return;
			// Clean up any previous registration (React Strict Mode runs effects twice)
			unregisterRef.current?.();
			unregisterRef.current = DevWalletClient.register({ origin: saved });
			setRegistered(true);
		});

		return () => {
			cancelled = true;
			unregisterRef.current?.();
			unregisterRef.current = null;
		};
	}, []);

	async function registerStandalone() {
		const { DevWalletClient } = await import('@mysten/dev-wallet/client');
		unregisterRef.current = DevWalletClient.register({ origin });
		localStorage.setItem(STORAGE_KEY, origin);
		setRegistered(true);
	}

	function unregisterStandalone() {
		unregisterRef.current?.();
		unregisterRef.current = null;
		localStorage.removeItem(STORAGE_KEY);
		setRegistered(false);
	}

	return (
		<div className="mt-8 border-t border-slate-800 pt-6">
			<button
				onClick={() => setExpanded(!expanded)}
				className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
			>
				{expanded ? '\u25BC' : '\u25B6'} Standalone Wallet Setup
			</button>
			{expanded && (
				<div className="mt-3 p-4 bg-slate-900 rounded-lg border border-slate-800">
					<p className="text-xs text-slate-400 mb-3">
						Register a DevWalletClient that connects to a wallet running at a separate origin. Start
						the wallet server first:{' '}
						<code className="text-slate-300">npx @mysten/dev-wallet serve --port=5174</code>
					</p>
					<div className="flex gap-2 items-center">
						<input
							value={origin}
							onChange={(e) => setOrigin(e.target.value)}
							disabled={registered}
							className="flex-1 px-3 py-2 rounded bg-slate-950 border border-slate-700 text-sm text-slate-200 disabled:opacity-50"
							placeholder="http://localhost:5174"
						/>
						{registered ? (
							<button
								onClick={unregisterStandalone}
								className="px-4 py-2 rounded bg-red-700 text-white text-sm font-medium hover:bg-red-600"
							>
								Unregister
							</button>
						) : (
							<button
								onClick={registerStandalone}
								className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
							>
								Register
							</button>
						)}
					</div>
					{registered && (
						<p className="text-xs text-green-400 mt-2">
							Standalone wallet registered at {origin}. It should now appear in the wallet selector.
						</p>
					)}
				</div>
			)}
		</div>
	);
}
