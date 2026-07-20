// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionDataBuilder } from '../transactions/TransactionData.js';
import type { TransactionData } from '../transactions/data/internal.js';
import type { ClientWithCoreApi } from './core.js';

export async function setAddressBalanceTransactionExpirationFromSimulatedEpoch({
	transactionData,
	client,
	epoch,
	originalTransactionData,
	isTransactionKindOnly,
	doGasSelection,
}: {
	transactionData: TransactionDataBuilder;
	client: ClientWithCoreApi;
	epoch: string | number | bigint | null | undefined;
	originalTransactionData: TransactionData;
	isTransactionKindOnly: boolean;
	doGasSelection: boolean;
}) {
	if (
		isTransactionKindOnly ||
		doGasSelection ||
		originalTransactionData.expiration ||
		originalTransactionData.gasData.payment?.length !== 0
	) {
		return;
	}

	if (transactionData.expiration && transactionData.expiration.$kind !== 'None') {
		return;
	}

	const [{ chainIdentifier }, systemStateResult] = await Promise.all([
		client.core.getChainIdentifier(),
		epoch == null ? client.core.getCurrentSystemState() : null,
	]);
	const currentEpoch = BigInt(epoch ?? systemStateResult!.systemState.epoch);

	transactionData.expiration = {
		$kind: 'ValidDuring',
		ValidDuring: {
			minEpoch: String(currentEpoch),
			maxEpoch: String(currentEpoch + 1n),
			minTimestamp: null,
			maxTimestamp: null,
			chain: chainIdentifier,
			nonce: (Math.random() * 0x100000000) >>> 0,
		},
	};
}
