// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { useCallback, useEffect, useState } from 'react';

function isSuiCoinType(coinType: string): boolean {
	return coinType.endsWith('::sui::SUI');
}

function formatSui(balance: string): string {
	const value = BigInt(balance);
	const whole = value / 1_000_000_000n;
	const fraction = value % 1_000_000_000n;
	if (fraction === 0n) return whole.toString();
	const fractionStr = fraction.toString().padStart(9, '0').replace(/0+$/, '');
	return `${whole}.${fractionStr}`;
}

export function BalanceDisplay({
	address,
	client,
}: {
	address: string;
	client: ClientWithCoreApi;
}) {
	const [balance, setBalance] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchBalance = useCallback(async () => {
		setLoading(true);
		try {
			const { balances } = await client.core.listBalances({ owner: address });
			const sui = balances.find((b) => isSuiCoinType(b.coinType));
			setBalance(sui ? formatSui(sui.balance) : '0');
		} catch {
			setBalance(null);
		} finally {
			setLoading(false);
		}
	}, [address, client]);

	useEffect(() => {
		fetchBalance();
	}, [fetchBalance]);

	return (
		<div className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-lg border border-slate-800">
			<div className="flex-1">
				<div className="text-xs text-slate-400 mb-0.5">SUI Balance</div>
				<div className="text-lg font-semibold text-white font-mono">
					{loading ? '...' : balance !== null ? `${balance} SUI` : 'Error'}
				</div>
			</div>
			<button
				onClick={fetchBalance}
				disabled={loading}
				className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
				title="Refresh balance"
			>
				&#x21bb;
			</button>
		</div>
	);
}
