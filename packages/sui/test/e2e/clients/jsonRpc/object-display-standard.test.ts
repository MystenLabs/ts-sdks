// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { SuiObjectData } from '../../../../src/jsonRpc';
import { Transaction } from '../../../../src/transactions';
import { setup, TestToolbox } from '../../utils/setup';

describe('Test Object Display Standard', () => {
	let toolbox: TestToolbox;
	let packageId: string;

	beforeAll(async () => {
		toolbox = await setup();
		packageId = await toolbox.getPackage('test_data', { normalized: false });

		// Create a Boar object owned by this test address
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::boars::create_boar`,
			arguments: [tx.pure.address(toolbox.address())],
		});

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
		});
		await toolbox.jsonRpcClient.waitForTransaction({ digest: result.digest });
	});

	it('Test getting Display fields with error object', async () => {
		const resp = (
			await toolbox.jsonRpcClient.getOwnedObjects({
				owner: toolbox.address(),
				options: { showDisplay: true, showType: true },
				filter: { StructType: `${packageId}::boars::Boar` },
			})
		).data;
		expect(resp.length).toBeGreaterThan(0);
		const data = resp[0].data as SuiObjectData;
		const boarId = data.objectId;
		const display = (
			await toolbox.jsonRpcClient.getObject({
				id: boarId,
				options: { showDisplay: true },
			})
		).data?.display!;
		const expectedData = {
			data: {
				age: '10',
				buyer: toolbox.address(),
				creator: 'Chris',
				description: `Unique Boar from the Boars collection with First Boar and ${boarId}`,
				img_url: 'https://get-a-boar.com/first.png',
				name: 'First Boar',
				price: '',
				project_url: 'https://get-a-boar.com/',
				full_url: 'https://get-a-boar.fullurl.com/',
				escape_syntax: '{name}',
			},
		};
		expect(display).toEqual(expect.objectContaining(expectedData));
		const errorMessage1 =
			'RPC call failed: Field value idd cannot be found in struct; RPC call failed: Field value namee cannot be found in struct';
		const errorMessage2 =
			'Field value idd cannot be found in struct; Field value namee cannot be found in struct';
		const errorMessage3 = "'namee' not found in object; 'idd' not found in object";

		expect([errorMessage1, errorMessage2, errorMessage3]).toContain(
			(display.error as { error: string })?.error,
		);
	});

	it('Test getting Display fields for object that has no display object', async () => {
		const coin = (await toolbox.getGasObjectsOwnedByAddress()).data[0];
		const coinId = coin.coinObjectId;
		const display = (
			await toolbox.jsonRpcClient.getObject({
				id: coinId,
				options: { showDisplay: true },
			})
		).data?.display;
		expect(display?.data).toEqual(null);
	});
});
