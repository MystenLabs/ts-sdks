// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { SuiObjectData } from '../../../../src/jsonRpc';
import { Transaction } from '../../../../src/transactions';
import { setup, TestToolbox } from '../../utils/setup';

describe('Dynamic Fields Reading API', () => {
	let toolbox: TestToolbox;
	let packageId: string;
	let parentObjectId: string;

	beforeAll(async () => {
		toolbox = await setup();
		packageId = await toolbox.getPackage('test_data', { normalized: false });

		// Create Test object with dynamic fields owned by this test address
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::dynamic_fields_test::create_test_with_fields`,
			arguments: [tx.pure.address(toolbox.address())],
		});

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
		});
		await toolbox.jsonRpcClient.waitForTransaction({ digest: result.digest });

		// Now get the Test object we created
		const objects = await toolbox.jsonRpcClient.getOwnedObjects({
			owner: toolbox.address(),
			options: { showType: true },
			filter: { StructType: `${packageId}::dynamic_fields_test::Test` },
		});
		const data = objects.data[0].data as SuiObjectData;
		parentObjectId = data.objectId;
	});

	it('get all dynamic fields', async () => {
		const dynamicFields = await toolbox.jsonRpcClient.getDynamicFields({
			parentId: parentObjectId,
		});
		expect(dynamicFields.data.length).toEqual(2);
	});
	it('limit response in page', async () => {
		const dynamicFields = await toolbox.jsonRpcClient.getDynamicFields({
			parentId: parentObjectId,
			limit: 1,
		});
		expect(dynamicFields.data.length).toEqual(1);
		expect(dynamicFields.nextCursor).not.toEqual(null);
	});
	it('go to next cursor', async () => {
		return await toolbox.jsonRpcClient
			.getDynamicFields({ parentId: parentObjectId, limit: 1 })
			.then(async function (dynamicFields) {
				expect(dynamicFields.nextCursor).not.toEqual(null);

				const dynamicFieldsCursor = await toolbox.jsonRpcClient.getDynamicFields({
					parentId: parentObjectId,
					cursor: dynamicFields.nextCursor,
				});
				expect(dynamicFieldsCursor.data.length).greaterThanOrEqual(0);
			});
	});
	it('get dynamic object field', async () => {
		const dynamicFields = await toolbox.jsonRpcClient.getDynamicFields({
			parentId: parentObjectId,
		});
		for (const data of dynamicFields.data) {
			const objName = data.name;

			const object = await toolbox.jsonRpcClient.getDynamicFieldObject({
				parentId: parentObjectId,
				name: objName,
			});

			expect(object.data?.objectId).toEqual(data.objectId);
		}
	});
});
