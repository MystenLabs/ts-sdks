// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bcs } from '../../src/bcs/index.js';
import type { Keypair } from '../../src/cryptography/index.js';
import { Transaction } from '../../src/transactions/index.js';
import { normalizeSuiObjectId, SUI_SYSTEM_STATE_OBJECT_ID } from '../../src/utils/index.js';
import {
	DEFAULT_GAS_BUDGET,
	DEFAULT_RECIPIENT,
	publishPackage,
	setup,
	TestToolbox,
	upgradePackage,
} from './utils/setup.js';
import { ClientWithCoreApi } from '../../src/client/index.js';

export const SUI_CLOCK_OBJECT_ID = normalizeSuiObjectId('0x6');

describe('Transaction Builders', () => {
	let toolbox: TestToolbox;
	let packageId: string;
	let sharedObjectId: string;

	beforeAll(async () => {
		const initToolbox = await setup();
		packageId = await initToolbox.getPackage('test_data');
		sharedObjectId = initToolbox.getSharedObject('test_data', 'MutableShared')!;
	});

	beforeEach(async () => {
		toolbox = await setup();
	});

	it('SplitCoins + TransferObjects', async () => {
		const coins = await toolbox.getGasObjectsOwnedByAddress();
		const tx = new Transaction();
		const coin_0 = coins[0];

		const coin = tx.splitCoins(tx.object(coin_0.objectId), [
			bcs.u64().serialize(DEFAULT_GAS_BUDGET * 2),
		]);
		tx.transferObjects([coin], toolbox.address());
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it('MergeCoins', async () => {
		const coins = await toolbox.getGasObjectsOwnedByAddress();
		const [coin_0, coin_1] = coins;
		const tx = new Transaction();
		tx.mergeCoins(coin_0.objectId, [coin_1.objectId]);
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it('MoveCall', async () => {
		const coins = await toolbox.getGasObjectsOwnedByAddress();
		const [coin_0] = coins;
		const tx = new Transaction();
		tx.moveCall({
			target: '0x2::pay::split',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [tx.object(coin_0.objectId), tx.pure.u64(DEFAULT_GAS_BUDGET * 2)],
		});
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it(
		'MoveCall Shared Object',
		{
			// TODO: This test is currently flaky, so adding a retry to unblock merging
			retry: 10,
		},
		async () => {
			const coins = await toolbox.getGasObjectsOwnedByAddress();
			const coin_2 = coins[2];

			const [{ address: validatorAddress }] = await toolbox.getActiveValidators();

			const tx = new Transaction();
			tx.moveCall({
				target: '0x3::sui_system::request_add_stake',
				arguments: [
					tx.object(SUI_SYSTEM_STATE_OBJECT_ID),
					tx.object(coin_2.objectId),
					tx.pure.address(validatorAddress),
				],
			});

			await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
		},
	);

	it('SplitCoins from gas object + TransferObjects', async () => {
		const tx = new Transaction();
		const coin = tx.splitCoins(tx.gas, [1]);
		tx.transferObjects([coin], DEFAULT_RECIPIENT);
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it('TransferObjects gas object', async () => {
		const tx = new Transaction();
		tx.transferObjects([tx.gas], DEFAULT_RECIPIENT);
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it('TransferObject', async () => {
		const coins = await toolbox.getGasObjectsOwnedByAddress();
		const tx = new Transaction();
		const coin_0 = coins[2];

		tx.transferObjects([coin_0.objectId], DEFAULT_RECIPIENT);
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it('Move Shared Object Call with mixed usage of mutable and immutable references', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::serializer_tests::value`,
			arguments: [tx.object(sharedObjectId)],
		});
		tx.moveCall({
			target: `${packageId}::serializer_tests::set_value`,
			arguments: [tx.object(sharedObjectId)],
		});
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it('Move Shared Object Call by Value', async () => {
		// Create a new MutableShared object for this test since we'll delete it
		// (we don't want to delete the shared one that other tests use)
		const createTx = new Transaction();
		createTx.moveCall({
			target: `${packageId}::serializer_tests::create_mutable_shared`,
		});
		const createResult = await toolbox.grpcClient.core.signAndExecuteTransaction({
			transaction: createTx,
			signer: toolbox.keypair,
			include: { effects: true },
		});
		await toolbox.grpcClient.core.waitForTransaction({ result: createResult });

		// Get the newly created shared object ID
		const createdObj = createResult.Transaction?.effects.changedObjects.find(
			(o) => o.idOperation === 'Created' && o.outputOwner?.$kind === 'Shared',
		);
		expect(createdObj).toBeDefined();
		const newSharedObjectId = createdObj!.objectId;

		// Now test delete_value with the new object
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::serializer_tests::value`,
			arguments: [tx.object(newSharedObjectId)],
		});
		tx.moveCall({
			target: `${packageId}::serializer_tests::delete_value`,
			arguments: [tx.object(newSharedObjectId)],
		});
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it('immutable clock', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: `${packageId}::serializer_tests::use_clock`,
			arguments: [tx.object(SUI_CLOCK_OBJECT_ID)],
		});
		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});

	it(
		'Publish and Upgrade Package',
		{
			// TODO: This test is currently flaky, so adding a retry to unblock merging
			retry: 10,
		},
		async () => {
			// Step 1. Publish the package
			const { packageId, publishTxn } = await publishPackage('serializer', toolbox);

			const created = publishTxn.effects.changedObjects.filter((o) => o.idOperation === 'Created');

			const capId = created.find(
				(o) =>
					publishTxn.objectTypes[o.objectId]?.endsWith('UpgradeCap') &&
					o.outputOwner?.$kind === 'AddressOwner' &&
					o.outputOwner.AddressOwner === toolbox.address(),
			)?.objectId!;

			expect(capId).toBeTruthy();

			const sharedObjectId = created.find((o) => o.outputOwner?.$kind === 'Shared')!.objectId;

			// Step 2. Confirm that its functions work as expected in its
			// first version
			const callOrigTx = new Transaction();
			callOrigTx.moveCall({
				target: `${packageId}::serializer_tests::value`,
				arguments: [callOrigTx.object(sharedObjectId)],
			});
			callOrigTx.moveCall({
				target: `${packageId}::serializer_tests::set_value`,
				arguments: [callOrigTx.object(sharedObjectId)],
			});
			await validateTransaction(toolbox.grpcClient, toolbox.keypair, callOrigTx);

			// Step 4. Make sure the behaviour of the upgrade package matches
			// the newly introduced function
			await upgradePackage(packageId, capId, 'serializer_upgrade', toolbox);
		},
	);

	it('builds object options', async () => {
		const tx = new Transaction();

		tx.moveCall({
			target: `${packageId}::serializer_tests::none`,
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [
				tx.object.option({
					type: '0x2::coin::Coin<0x2::sui::SUI>',
					value: null,
				}),
			],
		});
		const coin = tx.splitCoins(tx.gas, [1]);
		const coin2 = tx.moveCall({
			target: `${packageId}::serializer_tests::some`,
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [
				tx.object.option({
					type: '0x2::coin::Coin<0x2::sui::SUI>',
					value: coin,
				}),
			],
		});

		const coin3 = tx.moveCall({
			target: `${packageId}::serializer_tests::some`,
			typeArguments: ['0x2::coin::Coin<0x2::sui::SUI>'],
			arguments: [
				tx.object.option({
					type: '0x2::coin::Coin<0x2::sui::SUI>',
					value: coin2,
				}),
			],
		});

		tx.transferObjects([coin3], toolbox.keypair.toSuiAddress());

		await validateTransaction(toolbox.grpcClient, toolbox.keypair, tx);
	});
});

async function validateTransaction(client: ClientWithCoreApi, signer: Keypair, tx: Transaction) {
	tx.setSenderIfNotSet(signer.getPublicKey().toSuiAddress());
	const localDigest = await tx.getDigest({ client });
	const result = await signer.signAndExecuteTransaction({
		client,
		transaction: tx,
	});
	await client.core.waitForTransaction({ result });
	expect(localDigest).toEqual(result.Transaction!.digest);
	expect(result.Transaction?.effects?.status.success).toEqual(true);
}
