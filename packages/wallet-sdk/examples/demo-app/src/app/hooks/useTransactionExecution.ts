// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount, useSuiClient, useDAppKit } from '@mysten/dapp-kit-react';
import type { Transaction } from '@mysten/sui/transactions';
import { useState, useCallback } from 'react';

export function useTransactionExecution() {
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const dAppKit = useDAppKit();
	const [isExecuting, setIsExecuting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const executeTransaction = useCallback(
		async (transaction: Transaction) => {
			if (!currentAccount) {
				throw new Error('Wallet not connected');
			}

			setError(null);
			setIsExecuting(true);

			try {
				const result = await dAppKit.signAndExecuteTransaction({
					transaction: transaction,
				});

				await suiClient.waitForTransaction({
					digest: result.digest,
					options: {
						showEffects: true,
					},
				});

				return result;
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
				setError(errorMsg);
				throw err;
			} finally {
				setIsExecuting(false);
			}
		},
		[dAppKit, currentAccount, suiClient],
	);

	return {
		executeTransaction,
		isExecuting,
		error,
		setError,
	};
}
