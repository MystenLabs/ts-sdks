// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { Transaction } from '../../src/transactions/index.js';
import {
	isCoinReservationDigest,
	parseCoinReservationBalance,
} from '../../src/utils/coin-reservation.js';
import { setup, TestToolbox } from './utils/setup.js';

describe('Coin Reservation', () => {
	let toolbox: TestToolbox;

	beforeAll(async () => {
		toolbox = await setup();
	});

	it('address balance covers full budget (empty payment)', async () => {
		const { address } = await toolbox.getSigner({
			addressBalance: 500_000_000n,
			coins: [1_000_000n],
		});

		const tx = new Transaction();
		tx.setSender(address);
		tx.setGasBudget(2_000_000);

		await tx.build({ client: toolbox.jsonRpcClient });
		const data = tx.getData();
		expect(data.gasData.payment).toEqual([]);
	});

	it('tx.gas with combined address balance + coins succeeds', async () => {
		const { keypair, address } = await toolbox.getSigner({
			coins: [50_000_000n],
			addressBalance: 50_000_000n,
		});

		const tx = new Transaction();
		const [coin] = tx.splitCoins(tx.gas, [1000n]);
		tx.transferObjects([coin], address);

		const result = await toolbox.jsonRpcClient.core.signAndExecuteTransaction({
			transaction: tx,
			signer: keypair,
			include: { effects: true },
		});

		expect(result.$kind).toBe('Transaction');
		if (result.$kind === 'Transaction') {
			expect(result.Transaction.effects?.status.success).toBe(true);
		}
	});

	it('tx.gas with only address balance succeeds', async () => {
		const addressBalance = 500_000_000n;
		const { keypair, address } = await toolbox.getSigner({ addressBalance });

		const tx = new Transaction();
		const [coin] = tx.splitCoins(tx.gas, [1000n]);
		tx.transferObjects([coin], address);

		const result = await toolbox.jsonRpcClient.core.signAndExecuteTransaction({
			transaction: tx,
			signer: keypair,
			include: { effects: true },
		});

		expect(result.$kind).toBe('Transaction');
		if (result.$kind === 'Transaction') {
			expect(result.Transaction.effects?.status.success).toBe(true);
		}
	});

	it('reservation ref encodes address balance in digest', async () => {
		const addressBalance = 500_000_000n;
		const { address } = await toolbox.getSigner({ addressBalance });

		const tx = new Transaction();
		tx.setSender(address);
		const [coin] = tx.splitCoins(tx.gas, [1000n]);
		tx.transferObjects([coin], address);

		await tx.build({ client: toolbox.jsonRpcClient });

		const data = tx.getData();
		const payment = data.gasData.payment!;
		expect(payment.length).toBeGreaterThanOrEqual(1);

		const reservation = payment.find((c) => isCoinReservationDigest(c.digest));
		expect(reservation).toBeDefined();

		const reservedBalance = parseCoinReservationBalance(reservation!.digest);
		expect(reservedBalance).toBe(addressBalance);
		expect(reservation!.version).toBe('0');
		expect(reservation!.objectId).not.toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
	});

	it('reservation with coins encodes address balance and includes coin refs', async () => {
		const addressBalance = 500_000_000n;
		const { address } = await toolbox.getSigner({
			coins: [1_000_000n],
			addressBalance,
		});

		const tx = new Transaction();
		tx.setSender(address);
		const [coin] = tx.splitCoins(tx.gas, [1000n]);
		tx.transferObjects([coin], address);

		await tx.build({ client: toolbox.jsonRpcClient });

		const data = tx.getData();
		const payment = data.gasData.payment!;
		expect(payment.length).toBe(2);

		expect(isCoinReservationDigest(payment[0].digest)).toBe(true);
		expect(parseCoinReservationBalance(payment[0].digest)).toBe(addressBalance);

		expect(isCoinReservationDigest(payment[1].digest)).toBe(false);
	});
});
