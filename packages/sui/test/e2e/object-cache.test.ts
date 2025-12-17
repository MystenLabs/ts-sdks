// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Transaction } from '../../src/transactions/index.js';
import { CachingTransactionExecutor } from '../../src/transactions/executor/caching.js';
import { normalizeSuiAddress } from '../../src/utils/index.js';
import { setup, TestToolbox } from './utils/setup.js';

interface OwnedObjectRef {
	reference: { objectId: string; version: string; digest: string };
	owner: { AddressOwner?: string; ObjectOwner?: string };
}

describe('CachingTransactionExecutor', async () => {
	let toolbox: TestToolbox;
	let packageId: string;
	let executor: CachingTransactionExecutor;
	let parentObjectId: OwnedObjectRef;
	let receiveObjectId: OwnedObjectRef;

	beforeAll(async () => {
		toolbox = await setup();
		packageId = toolbox.getPackage('test_data');
	});

	beforeEach(async () => {
		executor = new CachingTransactionExecutor({
			client: toolbox.grpcClient,
		});
		const tx = new Transaction();
		vi.spyOn(toolbox.grpcClient.core, 'getMoveFunction');
		vi.spyOn(toolbox.grpcClient.core, 'getObjects');
		tx.moveCall({
			target: `${packageId}::tto::start`,
			typeArguments: [],
			arguments: [],
		});
		tx.setSender(toolbox.address());
		const x = await executor.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
		});

		const xTx = x.Transaction ?? x.FailedTransaction;
		await toolbox.grpcClient.core.waitForTransaction({ digest: xTx.digest });

		const createdObjects = xTx.effects!.changedObjects.filter(
			(obj) =>
				obj.idOperation === 'Created' &&
				obj.outputState === 'ObjectWrite' &&
				obj.outputOwner?.AddressOwner !== undefined,
		);

		const createdIds = new Set(createdObjects.map((obj) => obj.objectId));

		const receiveObj = createdObjects.find(
			(obj) => obj.outputOwner?.AddressOwner && createdIds.has(obj.outputOwner.AddressOwner),
		)!;

		const parentObj = createdObjects.find(
			(obj) => obj.outputOwner?.AddressOwner && !createdIds.has(obj.outputOwner.AddressOwner),
		)!;

		parentObjectId = {
			reference: {
				objectId: parentObj.objectId,
				version: parentObj.outputVersion!,
				digest: parentObj.outputDigest!,
			},
			owner: { AddressOwner: parentObj.outputOwner!.AddressOwner! },
		};
		receiveObjectId = {
			reference: {
				objectId: receiveObj.objectId,
				version: receiveObj.outputVersion!,
				digest: receiveObj.outputDigest!,
			},
			owner: { ObjectOwner: receiveObj.outputOwner!.AddressOwner! },
		};
	});

	afterEach(async () => {
		await executor.waitForLastTransaction();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('caches move function definitions', async () => {
		const tx = new Transaction();

		tx.moveCall({
			target: `${packageId}::tto::receiver`,
			typeArguments: [],
			arguments: [
				tx.object(parentObjectId.reference.objectId),
				tx.object(receiveObjectId.reference.objectId),
			],
		});

		tx.setSender(toolbox.address());

		const result = await executor.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
		});

		const resultTx = result.Transaction ?? result.FailedTransaction;
		expect(resultTx.status.success).toBe(true);
		expect(toolbox.grpcClient.core.getMoveFunction).toHaveBeenCalledOnce();
		expect(toolbox.grpcClient.core.getMoveFunction).toHaveBeenCalledWith({
			packageId: packageId,
			moduleName: 'tto',
			name: 'receiver',
		});

		const receiver = await executor.cache.getMoveFunctionDefinition({
			package: packageId,
			module: 'tto',
			function: 'receiver',
		});

		expect(toolbox.grpcClient.core.getMoveFunction).toHaveBeenCalledOnce();

		expect(receiver).toEqual({
			module: 'tto',
			function: 'receiver',
			package: packageId,
			parameters: [
				{
					body: {
						$kind: 'datatype',
						datatype: {
							typeName: `${packageId}::tto::A`,
							typeParameters: [],
						},
					},
					reference: 'mutable',
				},
				{
					body: {
						$kind: 'datatype',
						datatype: {
							typeName: `${normalizeSuiAddress('0x2')}::transfer::Receiving`,
							typeParameters: [
								{
									$kind: 'datatype',
									datatype: {
										typeName: `${packageId}::tto::B`,
										typeParameters: [],
									},
								},
							],
						},
					},
					reference: null,
				},
			],
		});

		await executor.buildTransaction({
			transaction: tx,
		});
		expect(toolbox.grpcClient.core.getMoveFunction).toHaveBeenCalledOnce();
	});

	it('caches objects', async () => {
		const tx = new Transaction();
		const obj = tx.moveCall({
			target: `${packageId}::tto::return_`,
			typeArguments: [],
			arguments: [
				tx.object(parentObjectId.reference.objectId),
				tx.object(receiveObjectId.reference.objectId),
			],
		});
		tx.transferObjects([obj], toolbox.address());
		tx.setSender(toolbox.address());
		const loadedIds: string[] = [];

		expect(toolbox.grpcClient.core.getObjects).toHaveBeenCalledTimes(0);

		const result = await executor.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
		});
		expect(toolbox.grpcClient.core.getObjects).toHaveBeenCalledTimes(0);

		const resultTx = result.Transaction ?? result.FailedTransaction;
		expect(resultTx.status.success).toBe(true);
		expect(loadedIds).toEqual([]);

		const txb2 = new Transaction();
		txb2.transferObjects([txb2.object(receiveObjectId.reference.objectId)], toolbox.address());
		txb2.setSender(toolbox.address());

		expect(toolbox.grpcClient.core.getObjects).toHaveBeenCalledTimes(0);

		await toolbox.grpcClient.core.waitForTransaction({ digest: resultTx.digest });

		const result2 = await executor.signAndExecuteTransaction({
			transaction: txb2,
			signer: toolbox.keypair,
		});

		expect(toolbox.grpcClient.core.getObjects).toHaveBeenCalledTimes(0);
		const result2Tx = result2.Transaction ?? result2.FailedTransaction;
		expect(result2Tx.status.success).toBe(true);

		await toolbox.grpcClient.core.waitForTransaction({ digest: result2Tx.digest });

		await executor.reset();

		const txb3 = new Transaction();
		txb3.transferObjects([txb3.object(receiveObjectId.reference.objectId)], toolbox.address());
		txb3.setSender(toolbox.address());

		expect(toolbox.grpcClient.core.getObjects).toHaveBeenCalledTimes(0);

		const result3 = await executor.signAndExecuteTransaction({
			transaction: txb3,
			signer: toolbox.keypair,
		});
		expect(toolbox.grpcClient.core.getObjects).toHaveBeenCalledTimes(1);
		const result3Tx = result3.Transaction ?? result3.FailedTransaction;
		expect(result3Tx.status.success).toBe(true);
		await toolbox.grpcClient.core.waitForTransaction({ digest: result3Tx.digest });
	});
});
