// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { Transaction } from '../../src/transactions';
import { setup, TestToolbox } from './utils/setup';

describe('Test ID as args to entry functions', () => {
	let toolbox: TestToolbox;
	let packageId: string;

	beforeAll(async () => {
		toolbox = await setup();
		packageId = await toolbox.getPackage('test_data');
	});

	it('Test ID as arg to entry functions', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::id_test::test_id`,
			arguments: [tx.pure.id('0x000000000000000000000000c2b5625c221264078310a084df0a3137956d20ee')],
		});
		const result = await toolbox.keypair.signAndExecuteTransaction({
			client: toolbox.grpcClient,
			transaction: tx,
		});
		await toolbox.grpcClient.core.waitForTransaction({ digest: result.Transaction!.digest });
		expect(result.Transaction?.effects?.status.success).toEqual(true);
	});

	it('Test ID as arg to entry functions (non-mut)', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::id_test::test_id_non_mut`,
			arguments: [tx.pure.id('0x000000000000000000000000c2b5625c221264078310a084df0a3137956d20ee')],
		});
		const result = await toolbox.keypair.signAndExecuteTransaction({
			client: toolbox.grpcClient,
			transaction: tx,
		});
		await toolbox.grpcClient.core.waitForTransaction({ digest: result.Transaction!.digest });
		expect(result.Transaction?.effects?.status.success).toEqual(true);
	});
});
