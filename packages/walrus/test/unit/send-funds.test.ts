// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, it } from 'vitest';

import { sendFundsToSender } from '../../src/utils/send-funds.js';

const SENDER = '0x2fe12c9e2ab4e4d5ba484212a0e0f4c92eef6a6bcd50cb03e1a3b8bea4a4d267';
const WAL_TYPE = '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';

describe('sendFundsToSender', () => {
	it('resolves to a coin::send_funds call with the sender address', async () => {
		const tx = new Transaction();
		tx.setSender(SENDER);

		const coin = tx.splitCoins(tx.gas, [100n]);
		tx.add(sendFundsToSender({ coin, coinType: WAL_TYPE }));

		await tx.prepareForSerialization({});

		const commands = tx.getData().commands;
		const moveCall = commands.find((command) => command.$kind === 'MoveCall')?.MoveCall;

		expect(moveCall).toMatchObject({
			package: '0x0000000000000000000000000000000000000000000000000000000000000002',
			module: 'coin',
			function: 'send_funds',
			typeArguments: [WAL_TYPE],
		});

		expect(moveCall?.arguments[0]).toMatchObject({ $kind: 'Result', Result: 0 });

		const recipient = moveCall?.arguments[1];
		expect(recipient?.$kind).toBe('Input');
		const input = tx.getData().inputs[(recipient as { Input: number }).Input];
		expect(input.Pure?.bytes).toBe(bcs.Address.serialize(SENDER).toBase64());
	});

	it('stays unresolved until a sender is set', async () => {
		const tx = new Transaction();
		const coin = tx.splitCoins(tx.gas, [100n]);
		tx.add(sendFundsToSender({ coin, coinType: WAL_TYPE }));

		// Executors prepare transactions before setting a sender, so the intent is deferred.
		await tx.prepareForSerialization({});
		expect(
			tx.getData().commands.some((command) => command.$Intent?.name === 'WalrusSendFundsToSender'),
		).toBe(true);

		tx.setSender(SENDER);
		await tx.prepareForSerialization({});

		const moveCall = tx
			.getData()
			.commands.find((command) => command.$kind === 'MoveCall')?.MoveCall;
		expect(moveCall?.function).toBe('send_funds');
	});
});
