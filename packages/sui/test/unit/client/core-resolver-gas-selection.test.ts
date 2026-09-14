// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it, vi } from 'vitest';

import type { SuiClientTypes } from '../../../src/client/types.js';
import { SuiJsonRpcClient } from '../../../src/jsonRpc/client.js';
import { Transaction } from '../../../src/transactions/index.js';
import {
	createCoinReservationRef,
	isCoinReservationDigest,
} from '../../../src/utils/coin-reservation.js';
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
	it.each([0, 256, 257, 1000])(
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
				limit: 256,
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

	it('reserves one payment slot for address balance, selecting 255 real coins', async () => {
		const candidates = coins(300);
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
		expect(client.core.listCoins).toHaveBeenCalledOnce();
	});

	it.each([false, true])(
		'counts owned, shared and receiving inputs without charging a gas reservation an input slot (reservation=%s)',
		async (reservation) => {
			const tx = transaction();
			addObjects(tx, 2046);
			if (reservation) tx.splitCoins(tx.gas, [1]);
			await tx.build({ client: createClient(coins(300), reservation ? '100' : '0') });
			const payment = tx.getData().gasData.payment!;
			expect(payment.filter((coin) => !isCoinReservationDigest(coin.digest))).toEqual(
				paymentRefs(coins(2)),
			);
			expect(payment).toHaveLength(reservation ? 3 : 2);
		},
	);

	it('counts nested type packages and deduplicates normalized package references across commands', async () => {
		const tx = transaction();
		addObjects(tx, 2039);
		tx.moveCall({
			target: '0xa::m::f',
			typeArguments: ['vector<0xb::m::T<0xc::m::U<vector<0xd::m::V>>, u64>>', 'address'],
		});
		tx.moveCall({
			target: normalizeSuiAddress('0xa') + '::m::f',
			typeArguments: ['0x0b::m::T<u8>'],
		});
		tx.makeMoveVec({ type: 'vector<0xe::m::T<0xc::m::U>>', elements: [] });
		tx.makeMoveVec({ type: 'u8', elements: [] });
		tx.makeMoveVec({ elements: [] });
		tx.publish({ modules: [], dependencies: ['0xf', '0x0a'] });
		tx.upgrade({
			modules: [],
			dependencies: ['0x10', '0x0f'],
			package: '0x11',
			ticket: tx.pure.u8(0),
		});
		// Eight distinct packages (a..11) plus 2039 object inputs leave one slot.
		await tx.build({ client: createClient() });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(1)));
	});

	it('does not count pure inputs, funds withdrawals (including their type packages), or input reservations', async () => {
		const tx = transaction();
		addObjects(tx, 1792);
		for (let i = 0; i < 50; i++) tx.pure.u64(i);
		tx.withdrawal({ amount: 1, type: '0x987::m::T<0x986::m::U>' });
		tx.objectRef(createCoinReservationRef(1n, SENDER, CHAIN, '100'));
		await tx.build({ client: createClient() });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(256)));
	});

	it('excludes normalized owned, shared and receiving input IDs before applying the cap', async () => {
		const candidates = coins(300);
		candidates[0].objectId = '0x1';
		candidates[1].objectId = '0x02';
		candidates[2].objectId = '0x3';
		const tx = transaction();
		tx.objectRef(ref(1));
		tx.receivingRef(ref(2));
		tx.sharedObjectRef({ objectId: ref(3).objectId, initialSharedVersion: '1', mutable: false });
		await tx.build({ client: createClient(candidates) });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(candidates.slice(3, 259)));
	});

	it('counts objects after resolving their references', async () => {
		const tx = transaction();
		addObjects(tx, 2046);
		tx.object('0x1');
		const client = createClient();
		await tx.build({ client });
		expect(client.core.getObjects).toHaveBeenCalledOnce();
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(1, 2)));
	});

	it.each([2048, 2049])(
		'reports exhausted object headroom at %i inputs instead of selecting gas coins',
		async (count) => {
			const tx = transaction();
			addObjects(tx, count);
			await expect(tx.build({ client: createClient() })).rejects.toThrow(
				'No gas coin slots available within the limit of 2048 input objects.',
			);
		},
	);

	it('allows a reservation-only payment at exactly the total object limit', async () => {
		const tx = transaction();
		addObjects(tx, 2048);
		tx.splitCoins(tx.gas, [1]);
		await tx.build({ client: createClient(coins(300), '100') });
		expect(tx.getData().gasData.payment).toEqual([
			createCoinReservationRef(100n, SENDER, CHAIN, '100'),
		]);
	});

	it('rejects excessive real inputs even when gas can use a reservation', async () => {
		const tx = transaction();
		addObjects(tx, 2049);
		tx.splitCoins(tx.gas, [1]);
		await expect(tx.build({ client: createClient(coins(300), '100') })).rejects.toThrow(
			'No gas coin slots available',
		);
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

	it('fetches additional pages only until remaining headroom is filled after exclusions', async () => {
		const tx = transaction();
		tx.objectRef(ref(1));
		tx.receivingRef(ref(2));
		const client = createClient();
		vi.mocked(client.core.listCoins)
			.mockResolvedValueOnce({ objects: coins(2), hasNextPage: true, cursor: 'first' })
			.mockResolvedValueOnce({ objects: coins(200, 3), hasNextPage: true, cursor: 'second' })
			.mockResolvedValueOnce({ objects: coins(100, 203), hasNextPage: true, cursor: 'third' });
		await tx.build({ client });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(256, 3)));
		expect(client.core.listCoins).toHaveBeenCalledTimes(3);
		expect(client.core.listCoins).toHaveBeenNthCalledWith(2, {
			owner: SENDER,
			coinType: SUI_TYPE_ARG,
			cursor: 'first',
			limit: 256,
		});
		expect(client.core.listCoins).toHaveBeenNthCalledWith(3, {
			owner: SENDER,
			coinType: SUI_TYPE_ARG,
			cursor: 'second',
			limit: 56,
		});
	});

	it('stops paging when exhausted even with spare capacity', async () => {
		const tx = transaction();
		const client = createClient();
		vi.mocked(client.core.listCoins)
			.mockResolvedValueOnce({ objects: coins(1), hasNextPage: true, cursor: 'first' })
			.mockResolvedValueOnce({ objects: coins(2, 2), hasNextPage: false, cursor: null });
		await tx.build({ client });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(3)));
		expect(client.core.listCoins).toHaveBeenCalledTimes(2);
	});

	it('deduplicates normalized gas coins across pages without consuming extra slots', async () => {
		const tx = transaction();
		const client = createClient();
		vi.mocked(client.core.listCoins)
			.mockResolvedValueOnce({ objects: coins(100), hasNextPage: true, cursor: 'first' })
			.mockResolvedValueOnce({
				objects: [{ ...coins(1)[0], objectId: '0x01' }, ...coins(200, 101)],
				hasNextPage: false,
				cursor: null,
			});
		await tx.build({ client });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(256)));
		expect(client.core.listCoins).toHaveBeenCalledTimes(2);
	});

	it('does not fetch more pages when the object limit is tighter than the gas payment limit', async () => {
		const tx = transaction();
		addObjects(tx, 2047);
		const client = createClient();
		vi.mocked(client.core.listCoins).mockResolvedValueOnce({
			objects: coins(1),
			hasNextPage: true,
			cursor: 'first',
		});
		await tx.build({ client });
		expect(tx.getData().gasData.payment).toEqual(paymentRefs(coins(1)));
		expect(client.core.listCoins).toHaveBeenCalledOnce();
	});
});
