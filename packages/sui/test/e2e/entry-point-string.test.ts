// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { beforeAll, describe, expect, it } from 'vitest';

import { Transaction } from '../../src/transactions';
import { setup, TestToolbox } from './utils/setup';

describe('Test Move call with strings', () => {
	let toolbox: TestToolbox;
	let packageId: string;

	async function callWithString(str: string | string[], len: number, funcName: string) {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::entry_point_types::${funcName}`,
			arguments: [
				Array.isArray(str) ? bcs.vector(bcs.string()).serialize(str) : tx.pure.string(str),
				tx.pure.u64(len),
			],
		});

		const result = await toolbox.keypair.signAndExecuteTransaction({
			transaction: tx,
			client: toolbox.grpcClient,
		});

		await toolbox.grpcClient.core.waitForTransaction({ digest: result.Transaction!.digest });
		expect(result.Transaction?.effects?.status.success).toEqual(true);
	}

	beforeAll(async () => {
		toolbox = await setup();
		packageId = await toolbox.getPackage('test_data');
	});

	it('Test ascii', async () => {
		const s = 'SomeString';
		await callWithString(s, s.length, 'ascii_arg');
	});

	it('Test utf8', async () => {
		const s = 'çå∞≠¢õß∂ƒ∫';
		const byte_len = 24;
		await callWithString(s, byte_len, 'utf8_arg');
	});

	it('Test string vec', async () => {
		const s1 = 'çå∞≠¢';
		const s2 = 'õß∂ƒ∫';
		const byte_len = 24;
		await callWithString([s1, s2], byte_len, 'utf8_vec_arg');
	});
});
