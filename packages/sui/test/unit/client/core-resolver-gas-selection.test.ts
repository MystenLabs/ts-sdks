// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import type { SuiClientTypes } from '../../../src/client/types.js';
import { SuiJsonRpcClient } from '../../../src/jsonRpc/client.js';
import { Transaction } from '../../../src/transactions/index.js';
import { createCoinReservationRef } from '../../../src/utils/coin-reservation.js';
import { normalizeSuiAddress, SUI_TYPE_ARG } from '../../../src/utils/index.js';

const SENDER = normalizeSuiAddress('0xabc');
const CHAIN = toBase58(new Uint8Array(32).fill(1));
const DIGEST = toBase58(new Uint8Array(32).fill(2));

function ref(id: number) {
	return { objectId: normalizeSuiAddress('0x' + id.toString(16)), version: '1', digest: DIGEST };
}

function coins(count: number, start = 1): SuiClientTypes.Coin[] {
	return Array.from({ length: count }, (_, i) => ({
		...ref(start + i),
		balance: '1000000000',
		owner: { $kind: 'AddressOwner', AddressOwner: SENDER },
		type: '0x2::coin::Coin<' + SUI_TYPE_ARG + '>',
	}));
}

function paymentRefs(objects: SuiClientTypes.Coin[]) {
	return objects.map(({ objectId, version, digest }) => ({
		objectId: normalizeSuiAddress(objectId),
		version,
		digest,
	}));
}

function createClient(objects = coins(300), addressBalance = '0') {
	const client = new SuiJsonRpcClient({ network: 'testnet', url: 'http://localhost:9000' });
	vi.spyOn(client.core, 'listCoins').mockResolvedValue({
		objects,
		hasNextPage: false,
		cursor: null,
	});
	vi.spyOn(client.core, 'getBalance').mockResolvedValue({
		balance: {
			balance: '1000000000000',
			coinBalance: '1000000000000',
			addressBalance,
			coinType: SUI_TYPE_ARG,
		},
	});
	vi.spyOn(client.core, 'getCurrentSystemState').mockResolvedValue({
		systemState: { epoch: '100', referenceGasPrice: '1' },
	} as SuiClientTypes.GetCurrentSystemStateResponse);
	vi.spyOn(client.core, 'getChainIdentifier').mockResolvedValue({ chainIdentifier: CHAIN });
	vi.spyOn(client.core, 'getProtocolConfig').mockRejectedValue(new Error('Must not fetch limits'));
	vi.spyOn(client.core, 'getObjects').mockResolvedValue({
		objects: [
			{
				...coins(1)[0],
				content: undefined,
				previousTransaction: undefined,
				objectBcs: undefined,
				json: undefined,
				display: undefined,
			},
		],
	});
	return client;
}

function transaction() {
	const tx = new Transaction();
	tx.setSender(SENDER);
	tx.setGasPrice(1);
	tx.setGasBudget(10);
	return tx;
}

function addObjects(tx: Transaction, count: number) {
	for (let i = 0; i < count; i++) {
		switch (i % 3) {
			case 0:
				tx.objectRef(ref(10000 + i));
				break;
			case 1:
				tx.sharedObjectRef({
					objectId: ref(10000 + i).objectId,
					initialSharedVersion: '1',
					mutable: true,
				});
				break;
			case 2:
				tx.receivingRef(ref(10000 + i));
		}
	}
}

describe('bounded automatic gas selection', () => {
	it.each([0, 50, 255, 256, 257, 1000])(
		'selects up to 256 coins in server order from %i candidates',
		async (count) => {
			const candidates = coins(count);
			const client = createClient(candidates);
			const tx = transaction();
			if (count === 0) {
				await expect(tx.build({ client })).rejects.toThrow('No valid gas coins found');
			} else {
				await tx.build({ client });
				expect(tx.getData().gasData.payment).toEqual(paymentRefs(candidates.slice(0, 256)));
			}
			expect(client.core.listCoins).toHaveBeenCalledExactlyOnceWith({
				owner: SENDER,
				coinType: SUI_TYPE_ARG,
			});
			expect(client.core.getProtocolConfig).not.toHaveBeenCalled();
		},
	);

	it('does not sort by balance or stop when the budget is covered', async () => {
		const candidates = coins(300).map((coin, i) => ({
			...coin,
			balance: i % 2 ? '1' : '1000000000',
		}));
		const client = createClient(candidates);
		const tx = transaction();
		await tx.build({ client });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(candidates.slice(0, 256)));
	});

	it.each([0, 50, 254, 255, 256, 257])(
		'keeps the address-balance reservation and at most 255 of %i coins',
		async (count) => {
			const candidates = coins(count);
			const tx = transaction();
			tx.splitCoins(tx.gas, [1]);
			const client = createClient(candidates, '100');
			vi.mocked(client.core.listCoins).mockResolvedValueOnce({
				objects: candidates,
				hasNextPage: true,
				cursor: 'next',
			});
			await tx.build({ client });
			expect(tx.getData().gasData.payment).toEqual([
				createCoinReservationRef(100n, SENDER, CHAIN, '100'),
				...paymentRefs(candidates.slice(0, 255)),
			]);
			expect(client.core.listCoins).toHaveBeenCalledExactlyOnceWith({
				owner: SENDER,
				coinType: SUI_TYPE_ARG,
			});
		},
	);

	it.each([false, true])(
		'does not impose a combined input-object limit (reservation=%s)',
		async (reservation) => {
			const tx = transaction();
			addObjects(tx, 2048);
			tx.makeMoveVec({ type: '0xa::m::T<0xb::m::U>', elements: [] });
			if (reservation) tx.splitCoins(tx.gas, [1]);
			await tx.build({ client: createClient(coins(300), reservation ? '100' : '0') });
			expect(tx.getData().gasData.payment).toEqual([
				...(reservation ? [createCoinReservationRef(100n, SENDER, CHAIN, '100')] : []),
				...paymentRefs(coins(reservation ? 255 : 256)),
			]);
		},
	);

	it('excludes existing owned inputs before applying the payment cap', async () => {
		const candidates = coins(300);
		const tx = transaction();
		tx.objectRef(ref(1));
		tx.objectRef(ref(2));
		await tx.build({ client: createClient(candidates) });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(candidates.slice(2, 258)));
	});

	it('does not reserve a slot when explicit withdrawals use the entire address balance', async () => {
		const tx = transaction();
		tx.splitCoins(tx.gas, [1]);
		tx.withdrawal({ amount: 100, type: SUI_TYPE_ARG });
		await tx.build({ client: createClient(coins(300), '100') });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(256)));
	});

	it.each([{ payment: [] }, { payment: paymentRefs(coins(300)) }])(
		'preserves explicit gas payment',
		async ({ payment }) => {
			const tx = new Transaction();
			tx.setSender(SENDER);
			tx.setGasBudget(10);
			tx.setGasPayment(payment);
			// Leave gas price unset so the real resolver runs for explicit payments too.
			const client = createClient();
			await tx.build({ client });
			expect(tx.getData().gasData.payment).toEqual(payment);
			expect(client.core.getCurrentSystemState).toHaveBeenCalledOnce();
			expect(client.core.listCoins).not.toHaveBeenCalled();
			expect(client.core.getBalance).not.toHaveBeenCalled();
		},
	);

	it('does not select gas for transaction-kind-only builds', async () => {
		const tx = transaction();
		tx.object('0x1');
		const client = createClient();
		await tx.build({ client, onlyTransactionKind: true });
		expect(tx.getData().gasData.payment).toBeNull();
		expect(client.core.getObjects).toHaveBeenCalledOnce();
		expect(client.core.listCoins).not.toHaveBeenCalled();
		expect(client.core.getBalance).not.toHaveBeenCalled();
	});

	it.each([
		{ budget: 0, addressBalance: '0' },
		{ budget: 10, addressBalance: '100' },
	])('preserves the empty payment fast path (%j)', async ({ budget, addressBalance }) => {
		const tx = transaction();
		addObjects(tx, 2048);
		tx.setGasBudget(budget);
		await tx.build({ client: createClient(coins(300), addressBalance) });
		expect(tx.getData().gasData.payment).toEqual([]);
	});

	it('uses only the original page after exclusions even when more pages are available', async () => {
		const tx = transaction();
		tx.objectRef(ref(1));
		tx.objectRef(ref(2));
		const client = createClient();
		vi.mocked(client.core.listCoins).mockResolvedValueOnce({
			objects: coins(50),
			hasNextPage: true,
			cursor: 'next',
		});
		await tx.build({ client });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(48, 3)));
		expect(client.core.listCoins).toHaveBeenCalledExactlyOnceWith({
			owner: SENDER,
			coinType: SUI_TYPE_ARG,
		});
	});

	it('does not fetch another page when every fetched coin is already an input', async () => {
		const tx = transaction();
		tx.objectRef(ref(1));
		tx.objectRef(ref(2));
		const client = createClient();
		vi.mocked(client.core.listCoins).mockResolvedValueOnce({
			objects: coins(2),
			hasNextPage: true,
			cursor: 'next',
		});
		await expect(tx.build({ client })).rejects.toThrow('No valid gas coins found');
		expect(client.core.listCoins).toHaveBeenCalledExactlyOnceWith({
			owner: SENDER,
			coinType: SUI_TYPE_ARG,
		});
	});
});
