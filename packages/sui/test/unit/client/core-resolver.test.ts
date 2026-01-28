// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import { Transaction } from '../../../src/transactions/index.js';
import { Inputs } from '../../../src/transactions/Inputs.js';
import { coreClientResolveTransactionPlugin } from '../../../src/client/core-resolver.js';

function ref(): { objectId: string; version: string; digest: string } {
	return {
		objectId: (Math.random() * 100000).toFixed(0).padEnd(64, '0'),
		version: String((Math.random() * 10000).toFixed(0)),
		digest: toBase58(
			new Uint8Array([
				0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1,
				2,
			]),
		),
	};
}

// Mock chain identifier (32-byte digest)
const MOCK_CHAIN_IDENTIFIER = toBase58(new Uint8Array(32).fill(1));

function createMockClient() {
	const mockClient = {
		core: {
			getChainIdentifier: vi.fn().mockResolvedValue({
				chainIdentifier: MOCK_CHAIN_IDENTIFIER,
			}),
			getCurrentSystemState: vi.fn().mockResolvedValue({
				systemState: {
					epoch: '100',
					referenceGasPrice: '1000',
				},
			}),
			getReferenceGasPrice: vi.fn().mockResolvedValue({
				referenceGasPrice: '1000',
			}),
			listCoins: vi.fn().mockResolvedValue({
				objects: [
					{
						objectId: '0x' + '1'.repeat(64),
						version: '1',
						digest: toBase58(new Uint8Array(32).fill(2)),
					},
				],
			}),
			getObjects: vi.fn().mockResolvedValue({
				objects: [],
			}),
			getMoveFunction: vi.fn(),
			simulateTransaction: vi.fn().mockResolvedValue({
				$kind: 'Transaction',
				Transaction: {
					effects: {
						gasUsed: {
							computationCost: '1000000',
							storageCost: '100000',
							storageRebate: '50000',
						},
					},
				},
			}),
			resolveTransactionPlugin: () => coreClientResolveTransactionPlugin,
		},
	};
	return mockClient;
}

describe('ValidDuring expiration auto-setting', () => {
	it('sets ValidDuring expiration when there are no owned inputs and no gas payment', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		// Don't set gas price - this forces resolution to run
		tx.setGasBudget(10000000);
		tx.setGasPayment([]); // Empty gas payment - will use address balance

		// Add a shared object input (not an owned object)
		tx.object(
			Inputs.SharedObjectRef({
				objectId: '0x' + '3'.repeat(64),
				initialSharedVersion: '1',
				mutable: true,
			}),
		);

		const client = createMockClient();
		await tx.build({ client: client as any });

		// Verify getChainIdentifier and getCurrentSystemState were called
		expect(client.core.getChainIdentifier).toHaveBeenCalled();
		expect(client.core.getCurrentSystemState).toHaveBeenCalled();

		// Verify expiration was set
		const data = tx.getData();
		expect(data.expiration).toBeDefined();
		expect(data.expiration?.$kind).toBe('ValidDuring');

		if (data.expiration?.$kind === 'ValidDuring') {
			expect(data.expiration.ValidDuring.minEpoch).toBe('100');
			expect(data.expiration.ValidDuring.maxEpoch).toBe('101');
			expect(data.expiration.ValidDuring.chain).toBe(MOCK_CHAIN_IDENTIFIER);
			expect(typeof data.expiration.ValidDuring.nonce).toBe('number');
		}
	});

	it('does NOT set ValidDuring expiration when there are gas payment coins', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasPrice(1000);
		tx.setGasBudget(10000000);
		tx.setGasPayment([ref()]); // Has gas payment coins

		const client = createMockClient();
		await tx.build({ client: client as any });

		// Verify getChainIdentifier was NOT called (no need for ValidDuring)
		expect(client.core.getChainIdentifier).not.toHaveBeenCalled();

		// Verify expiration was NOT set
		const data = tx.getData();
		expect(data.expiration).toBeNull();
	});

	it('does NOT override expiration when already set', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasPrice(1000);
		tx.setGasBudget(10000000);
		tx.setGasPayment([]); // Empty gas payment
		tx.setExpiration({ Epoch: 200 }); // Manually set expiration

		const client = createMockClient();
		await tx.build({ client: client as any });

		// Verify getChainIdentifier was NOT called (expiration already set)
		expect(client.core.getChainIdentifier).not.toHaveBeenCalled();

		// Verify original expiration is preserved
		const data = tx.getData();
		expect(data.expiration?.$kind).toBe('Epoch');
		if (data.expiration?.$kind === 'Epoch') {
			// Epoch can be stored as either number or string depending on how it was set
			expect(String(data.expiration.Epoch)).toBe('200');
		}
	});
});
