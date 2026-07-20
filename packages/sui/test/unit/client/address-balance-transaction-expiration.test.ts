// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import { setAddressBalanceTransactionExpirationFromSimulatedEpoch } from '../../../src/client/address-balance-transaction-expiration.js';
import { TransactionDataBuilder } from '../../../src/transactions/TransactionData.js';
import type { TransactionData } from '../../../src/transactions/data/internal.js';

const MOCK_CHAIN_IDENTIFIER = toBase58(new Uint8Array(32).fill(1));

function createClient() {
	return {
		core: {
			getChainIdentifier: vi.fn().mockResolvedValue({
				chainIdentifier: MOCK_CHAIN_IDENTIFIER,
			}),
			getCurrentSystemState: vi.fn().mockResolvedValue({
				systemState: {
					epoch: '20',
					referenceGasPrice: '1000',
				},
			}),
		},
	};
}

function createTransactionData({
	expiration = null,
	payment = [],
}: {
	expiration?: TransactionData['expiration'];
	payment?: TransactionData['gasData']['payment'];
} = {}) {
	return TransactionDataBuilder.restore({
		version: 2,
		sender: '0x' + '1'.repeat(64),
		expiration,
		gasData: {
			budget: '1000000',
			price: '1000',
			owner: null,
			payment,
		},
		inputs: [],
		commands: [],
	});
}

describe('setAddressBalanceTransactionExpirationFromSimulatedEpoch', () => {
	it('sets ValidDuring when gas selection was disabled and the original transaction had no expiration', async () => {
		const transactionData = createTransactionData({ expiration: { $kind: 'None', None: true } });
		const originalTransactionData = createTransactionData({ expiration: null }).snapshot();
		const client = createClient();

		await setAddressBalanceTransactionExpirationFromSimulatedEpoch({
			transactionData,
			client: client as any,
			epoch: '12',
			originalTransactionData,
			isTransactionKindOnly: false,
			doGasSelection: false,
		});

		expect(transactionData.expiration?.$kind).toBe('ValidDuring');
		expect(transactionData.expiration?.ValidDuring).toMatchObject({
			minEpoch: '12',
			maxEpoch: '13',
			chain: MOCK_CHAIN_IDENTIFIER,
		});
		expect(client.core.getChainIdentifier).toHaveBeenCalledTimes(1);
		expect(client.core.getCurrentSystemState).not.toHaveBeenCalled();
	});

	it('does not set ValidDuring when gas selection was enabled', async () => {
		const transactionData = createTransactionData({ expiration: { $kind: 'None', None: true } });
		const originalTransactionData = createTransactionData({ expiration: null }).snapshot();
		const client = createClient();

		await setAddressBalanceTransactionExpirationFromSimulatedEpoch({
			transactionData,
			client: client as any,
			epoch: '12',
			originalTransactionData,
			isTransactionKindOnly: false,
			doGasSelection: true,
		});

		expect(transactionData.expiration?.$kind).toBe('None');
		expect(client.core.getChainIdentifier).not.toHaveBeenCalled();
	});

	it('does not set ValidDuring for transaction-kind-only resolution', async () => {
		const transactionData = createTransactionData({ expiration: { $kind: 'None', None: true } });
		const originalTransactionData = createTransactionData({ expiration: null }).snapshot();
		const client = createClient();

		await setAddressBalanceTransactionExpirationFromSimulatedEpoch({
			transactionData,
			client: client as any,
			epoch: '12',
			originalTransactionData,
			isTransactionKindOnly: true,
			doGasSelection: false,
		});

		expect(transactionData.expiration?.$kind).toBe('None');
		expect(client.core.getChainIdentifier).not.toHaveBeenCalled();
	});

	it('falls back to current system state when simulation did not return an epoch', async () => {
		const transactionData = createTransactionData({ expiration: { $kind: 'None', None: true } });
		const originalTransactionData = createTransactionData({ expiration: null }).snapshot();
		const client = createClient();

		await setAddressBalanceTransactionExpirationFromSimulatedEpoch({
			transactionData,
			client: client as any,
			epoch: null,
			originalTransactionData,
			isTransactionKindOnly: false,
			doGasSelection: false,
		});

		expect(transactionData.expiration?.$kind).toBe('ValidDuring');
		expect(transactionData.expiration?.ValidDuring).toMatchObject({
			minEpoch: '20',
			maxEpoch: '21',
			chain: MOCK_CHAIN_IDENTIFIER,
		});
		expect(client.core.getChainIdentifier).toHaveBeenCalledTimes(1);
		expect(client.core.getCurrentSystemState).toHaveBeenCalledTimes(1);
	});

	it('preserves explicit None expiration from the original transaction', async () => {
		const transactionData = createTransactionData({ expiration: { $kind: 'None', None: true } });
		const originalTransactionData = createTransactionData({
			expiration: { $kind: 'None', None: true },
		}).snapshot();
		const client = createClient();

		await setAddressBalanceTransactionExpirationFromSimulatedEpoch({
			transactionData,
			client: client as any,
			epoch: '12',
			originalTransactionData,
			isTransactionKindOnly: false,
			doGasSelection: false,
		});

		expect(transactionData.expiration?.$kind).toBe('None');
		expect(client.core.getChainIdentifier).not.toHaveBeenCalled();
	});
});
