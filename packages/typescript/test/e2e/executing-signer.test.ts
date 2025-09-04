// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from 'vitest';

import { Transaction } from '../../src/transactions';
import { normalizeSuiObjectId } from '../../src/utils';
import { setup, TestToolbox } from './utils/setup';
import { ExecutingSigner } from '../../src/cryptography';

export const SUI_CLOCK_OBJECT_ID = normalizeSuiObjectId('0x6');

describe('ExecutingSigner', () => {
	let toolbox: TestToolbox;

	beforeEach(async () => {
		toolbox = await setup();
	});

	it('executes without a client', async () => {
		const tx = new Transaction();

		tx.transferObjects([tx.splitCoins(tx.gas, [1])], toolbox.address());

		const signer = new ExecutingSigner({
			signer: toolbox.keypair,
			client: toolbox.client,
		});

		const result = await signer.signAndExecuteTransaction({
			transaction: tx,
		});

		expect(result.effects.status.success).toBe(true);

		expect(
			await toolbox.keypair
				.getPublicKey()
				.verifyTransaction(await tx.build(), result.signatures[0]),
		).toBe(true);
	});
});
