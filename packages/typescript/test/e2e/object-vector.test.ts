// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from 'vitest';

import { Transaction } from '../../src/transactions';
import { SUI_FRAMEWORK_ADDRESS } from '../../src/utils';
import { publishPackage, setup, TestToolbox } from './utils/setup';

describe('Test Move call with a vector of objects as input', () => {
	let toolbox: TestToolbox;
	let packageId: string;

	async function mintObject(val: number) {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::entry_point_vector::mint`,
			arguments: [tx.pure.u64(val)],
		});
		const result = await toolbox.keypair.signAndExecuteTransaction({
			client: toolbox.grpcClient,
			transaction: tx,
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: result.digest });
		expect(result.effects?.status.success).toEqual(true);
		return result.effects?.changedObjects.filter((o) => o.idOperation === 'Created')[0]?.objectId!;
	}

	async function destroyObjects(objects: string[], withType = false) {
		const tx = new Transaction();
		const vec = tx.makeMoveVec({
			elements: objects.map((id) => tx.object(id)),
			type: withType ? `${packageId}::entry_point_vector::Obj` : undefined,
		});
		tx.moveCall({
			target: `${packageId}::entry_point_vector::two_obj_vec_destroy`,
			arguments: [vec],
		});
		const result = await toolbox.keypair.signAndExecuteTransaction({
			client: toolbox.grpcClient,
			transaction: tx,
		});
		await toolbox.jsonRpcClient.waitForTransaction({ digest: result.digest });
		expect(result.effects?.status.success).toEqual(true);
	}

	beforeEach(async () => {
		toolbox = await setup();

		({ packageId } = await publishPackage('entry_point_vector'));
	});

	it('Test object vector', async () => {
		await destroyObjects([(await mintObject(7))!, await mintObject(42)], /* withType */ false);
	});

	it('Test object vector with type hint', async () => {
		await destroyObjects([await mintObject(7), await mintObject(42)], /* withType */ true);
	});

	it('Test regular arg mixed with object vector arg', async () => {
		const coins = await toolbox.getGasObjectsOwnedByAddress();
		const coin = coins.data[3];
		const coinIDs = coins.data.map((coin) => coin.coinObjectId);
		const tx = new Transaction();
		const vec = tx.makeMoveVec({
			elements: [coinIDs[1], tx.object(coinIDs[2])],
		});
		tx.moveCall({
			target: `${SUI_FRAMEWORK_ADDRESS}::pay::join_vec`,
			typeArguments: ['0x2::sui::SUI'],
			arguments: [tx.object(coinIDs[0]), vec],
		});
		tx.setGasPayment([{ objectId: coin.coinObjectId, digest: coin.digest, version: coin.version }]);
		const result = await toolbox.keypair.signAndExecuteTransaction({
			client: toolbox.grpcClient,
			transaction: tx,
		});
		expect(result.effects?.status.success).toEqual(true);
	});
});
