// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, toBase58 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import { Transaction } from '../../../src/transactions/index.js';
import { Inputs } from '../../../src/transactions/Inputs.js';
import { coreClientResolveTransactionPlugin } from '../../../src/client/core-resolver.js';
import {
	isCoinReservationDigest,
	parseCoinReservationBalance,
} from '../../../src/utils/coin-reservation.js';

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

interface MockClientOptions {
	coins?: { objectId: string; version: string; digest: string; balance: string }[];
	addressBalance?: string;
}

function createMockClient(options?: MockClientOptions) {
	const defaultCoin = {
		objectId: '0x' + '1'.repeat(64),
		version: '1',
		digest: toBase58(new Uint8Array(32).fill(2)),
		balance: '10000000000',
	};
	const coins = options?.coins ?? [defaultCoin];
	const addressBalance = options?.addressBalance ?? '0';

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
			getBalance: vi.fn().mockResolvedValue({
				balance: {
					coinType: '0x2::sui::SUI',
					totalBalance: String(
						BigInt(addressBalance) + coins.reduce((sum, c) => sum + BigInt(c.balance), 0n),
					),
					addressBalance,
					coinObjectCount: coins.length,
				},
			}),
			listCoins: vi.fn().mockResolvedValue({
				objects: coins,
				hasNextPage: false,
				cursor: null,
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

	it('does not set ValidDuring when gas payment is non-empty', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(10000000);
		tx.setGasPayment([ref()]);

		const client = createMockClient();
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.expiration).toBeNull();
	});

	it('sets ValidDuring when payment is empty even with owned object inputs', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(10000000);
		tx.setGasPayment([]);

		tx.object(Inputs.ObjectRef(ref()));

		const client = createMockClient();
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.expiration?.$kind).toBe('ValidDuring');
	});

	it('does NOT override expiration when already set', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
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
			expect(String(data.expiration.Epoch)).toBe('200');
		}
	});

	it('sets ValidDuring when transaction has withdrawal with empty payment', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(10000000);
		tx.setGasPayment([]);

		tx.withdrawal({ amount: 1000, type: '0x2::sui::SUI' });

		const client = createMockClient();
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.expiration?.$kind).toBe('ValidDuring');
	});

	it('does not set ValidDuring when withdrawal has non-empty payment', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(10000000);
		tx.setGasPayment([ref()]);

		tx.withdrawal({ amount: 1000, type: '0x2::sui::SUI' });

		const client = createMockClient();
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.expiration).toBeNull();
	});
});

describe('Gas payment resolution', () => {
	it('uses empty payment when address balance covers budget', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));

		const client = createMockClient({
			addressBalance: '100000000000',
			coins: [
				{
					objectId: '0x' + '1'.repeat(64),
					version: '1',
					digest: toBase58(new Uint8Array(32).fill(2)),
					balance: '5000000000',
				},
			],
		});
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.gasData.payment).toEqual([]);
	});

	it('uses coin objects when address balance is insufficient', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));

		const client = createMockClient({
			addressBalance: '0',
			coins: [
				{
					objectId: '0x' + '1'.repeat(64),
					version: '1',
					digest: toBase58(new Uint8Array(32).fill(2)),
					balance: '10000000000',
				},
			],
		});
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.gasData.payment?.length).toBeGreaterThan(0);
		expect(data.gasData.payment?.[0].objectId).toBe('0x' + '1'.repeat(64));
	});

	it('uses empty payment when budget is zero', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(0);

		const client = createMockClient({ addressBalance: '0' });
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.gasData.payment).toEqual([]);
	});
});

describe('Coin reservation', () => {
	it('creates reservation ref when usesGasCoin and addressBalance > 0', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(2000000);
		tx.splitCoins(tx.gas, [1000]);

		const client = createMockClient({
			addressBalance: '5000000000',
			coins: [
				{
					objectId: '0x' + '1'.repeat(64),
					version: '1',
					digest: toBase58(new Uint8Array(32).fill(2)),
					balance: '1000000',
				},
			],
		});
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.gasData.payment!.length).toBeGreaterThanOrEqual(1);

		const reservationRef = data.gasData.payment![0];
		expect(isCoinReservationDigest(reservationRef.digest)).toBe(true);
		// Version should be "0" (SequenceNumber::new())
		expect(reservationRef.version).toBe('0');
		// ObjectId should be non-zero (derived from accumulator XOR chain identifier)
		expect(reservationRef.objectId).not.toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
	});

	it('reserves full address balance when usesGasCoin', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(2000000);
		tx.splitCoins(tx.gas, [1000]);

		const client = createMockClient({
			addressBalance: '5000000000',
			coins: [
				{
					objectId: '0x' + '1'.repeat(64),
					version: '1',
					digest: toBase58(new Uint8Array(32).fill(2)),
					balance: '1000000',
				},
			],
		});
		await tx.build({ client: client as any });

		const data = tx.getData();
		expect(data.gasData.payment!.length).toBe(2);

		const reservationRef = data.gasData.payment![0];
		expect(isCoinReservationDigest(reservationRef.digest)).toBe(true);
		expect(parseCoinReservationBalance(reservationRef.digest)).toBe(5000000000n);
		// Verify epoch (100) is encoded in digest bytes 8-11 as LE u32
		const digestBytes = fromBase58(reservationRef.digest);
		const epochView = new DataView(
			digestBytes.buffer,
			digestBytes.byteOffset,
			digestBytes.byteLength,
		);
		expect(epochView.getUint32(8, true)).toBe(100);
		expect(reservationRef.version).toBe('0');

		expect(data.gasData.payment![1].objectId).toBe('0x' + '1'.repeat(64));
	});

	it('does not create reservation when coins cover budget without usesGasCoin', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(1000000);

		const client = createMockClient({
			addressBalance: '0',
			coins: [
				{
					objectId: '0x' + '1'.repeat(64),
					version: '1',
					digest: toBase58(new Uint8Array(32).fill(2)),
					balance: '10000000000',
				},
			],
		});
		await tx.build({ client: client as any });

		const data = tx.getData();
		for (const coin of data.gasData.payment ?? []) {
			expect(isCoinReservationDigest(coin.digest)).toBe(false);
		}
	});

	it('no reservation when usesGasCoin and addressBalance is 0', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(1000000);
		tx.splitCoins(tx.gas, [100n]); // usesGasCoin = true

		const client = createMockClient({
			addressBalance: '0',
			coins: [
				{
					objectId: '0x' + '1'.repeat(64),
					version: '1',
					digest: toBase58(new Uint8Array(32).fill(2)),
					balance: '10000000000',
				},
			],
		});
		await tx.build({ client: client as any });

		const data = tx.getData();
		// reservationAmount = 0 - 0 = 0, which is not > 0, so no reservation ref
		for (const coin of data.gasData.payment ?? []) {
			expect(isCoinReservationDigest(coin.digest)).toBe(false);
		}
	});
});

describe('Chain identifier fetch gating', () => {
	it('does not fetch getChainIdentifier when !usesGasCoin', async () => {
		const tx = new Transaction();
		tx.setSender('0x' + '2'.repeat(64));
		tx.setGasBudget(1000000);
		// No tx.gas reference, so usesGasCoin = false

		const client = createMockClient({
			addressBalance: '0',
			coins: [
				{
					objectId: '0x' + '1'.repeat(64),
					version: '1',
					digest: toBase58(new Uint8Array(32).fill(2)),
					balance: '10000000000',
				},
			],
		});
		await tx.build({ client: client as any });

		expect(client.core.getChainIdentifier).not.toHaveBeenCalled();
	});
});
