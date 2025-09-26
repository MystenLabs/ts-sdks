// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react';
import { useConnection, useCurrentAccount } from '@mysten/dapp-kit-react';
import type { WalletAccount } from '../types/wallet.js';

interface UseWalletAccountsReturn {
	walletAccounts: WalletAccount[];
	loading: boolean;
	error: string | null;
}

export function useWalletAccounts(): UseWalletAccountsReturn {
	const connection = useConnection();
	const currentAccount = useCurrentAccount();
	const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadWalletAccounts = async () => {
			if (!connection.wallet || !currentAccount) {
				setWalletAccounts([]);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const accounts = connection.wallet.accounts;
				const accountsWithLabels = accounts.map((account, index: number) => ({
					address: account.address,
					label: account.label || `Account ${index + 1}`,
				}));

				setWalletAccounts(accountsWithLabels);
			} catch (err) {
				console.error('Failed to load wallet accounts:', err);
				setError(err instanceof Error ? err.message : 'Failed to load wallet accounts');
			} finally {
				setLoading(false);
			}
		};

		loadWalletAccounts();
	}, [connection.wallet, currentAccount]);

	return {
		walletAccounts,
		loading,
		error,
	};
}
