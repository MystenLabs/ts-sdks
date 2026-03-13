// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { SUI_TYPE_ARG } from '../../../../src/utils/index.js';
import type { TransactionPlugin } from '../../../../src/transactions/resolve.js';

type OwnerKind = 'AddressOwner' | 'ObjectOwner' | 'Shared' | 'Immutable' | 'ConsensusAddressOwner';

/**
 * Creates a transaction plugin that sets ownerKind on a specific input index.
 */
function setOwnerKindPlugin(inputIndex: number, ownerKind: OwnerKind[]): TransactionPlugin {
	return async (transactionData, _options, next) => {
		const input = transactionData.inputs[inputIndex];
		if (input?.UnresolvedObject) {
			input.UnresolvedObject.ownerKind = ownerKind;
		}
		await next();
	};
}

describe('Core API - Owner Kind Validation', () => {
	let toolbox: TestToolbox;
	let testAddress: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();
	});

	describe('correct ownerKind passes validation', () => {
		testWithAllClients(
			'owned object with ownerKind=[AddressOwner] resolves successfully',
			async (client) => {
				const coins = await client.core.listCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});
				expect(coins.objects.length).toBeGreaterThan(0);

				const tx = new Transaction();
				tx.transferObjects([tx.object(coins.objects[0].objectId)], testAddress);
				tx.setSender(testAddress);
				tx.addBuildPlugin(setOwnerKindPlugin(0, ['AddressOwner']));

				// Should not throw
				const bytes = await tx.build({ client });
				expect(bytes).toBeDefined();
			},
		);

		testWithAllClients(
			'shared object with ownerKind=[Shared] resolves successfully',
			async (client) => {
				const packageId = toolbox.getPackage('test_data');

				// Create a shared object
				const setupTx = new Transaction();
				setupTx.moveCall({
					target: `${packageId}::test_objects::create_shared_object`,
					arguments: [],
				});
				const setupResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
					transaction: setupTx,
					signer: toolbox.keypair,
					options: { showEffects: true },
				});
				expect(setupResult.effects?.status.status).toBe('success');
				await toolbox.jsonRpcClient.waitForTransaction({ digest: setupResult.digest });

				const created = setupResult.effects?.created || [];
				const sharedObject = created.find((obj) => {
					const owner = obj.owner;
					return typeof owner === 'object' && 'Shared' in owner;
				});
				expect(sharedObject).toBeDefined();

				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::increment_shared`,
					arguments: [tx.object(sharedObject!.reference.objectId)],
				});
				tx.setSender(testAddress);
				tx.addBuildPlugin(setOwnerKindPlugin(0, ['Shared']));

				// Should not throw
				const bytes = await tx.build({ client });
				expect(bytes).toBeDefined();
			},
		);

		testWithAllClients(
			'owned object with ownerKind=[AddressOwner, Shared] resolves successfully',
			async (client) => {
				const coins = await client.core.listCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});
				expect(coins.objects.length).toBeGreaterThan(0);

				const tx = new Transaction();
				tx.transferObjects([tx.object(coins.objects[0].objectId)], testAddress);
				tx.setSender(testAddress);
				tx.addBuildPlugin(setOwnerKindPlugin(0, ['AddressOwner', 'Shared']));

				// Should not throw - array accepts either kind
				const bytes = await tx.build({ client });
				expect(bytes).toBeDefined();
			},
		);
	});

	describe('incorrect ownerKind throws error', () => {
		testWithAllClients('owned object with ownerKind=[Shared] throws', async (client) => {
			const coins = await client.core.listCoins({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});
			expect(coins.objects.length).toBeGreaterThan(0);

			const tx = new Transaction();
			tx.transferObjects([tx.object(coins.objects[0].objectId)], testAddress);
			tx.setSender(testAddress);
			tx.addBuildPlugin(setOwnerKindPlugin(0, ['Shared']));

			await expect(tx.build({ client })).rejects.toThrow();
		});

		testWithAllClients('shared object with ownerKind=[AddressOwner] throws', async (client) => {
			const packageId = toolbox.getPackage('test_data');

			// Create a shared object
			const setupTx = new Transaction();
			setupTx.moveCall({
				target: `${packageId}::test_objects::create_shared_object`,
				arguments: [],
			});
			const setupResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
				transaction: setupTx,
				signer: toolbox.keypair,
				options: { showEffects: true },
			});
			expect(setupResult.effects?.status.status).toBe('success');
			await toolbox.jsonRpcClient.waitForTransaction({ digest: setupResult.digest });

			const created = setupResult.effects?.created || [];
			const sharedObject = created.find((obj) => {
				const owner = obj.owner;
				return typeof owner === 'object' && 'Shared' in owner;
			});
			expect(sharedObject).toBeDefined();

			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::increment_shared`,
				arguments: [tx.object(sharedObject!.reference.objectId)],
			});
			tx.setSender(testAddress);
			tx.addBuildPlugin(setOwnerKindPlugin(0, ['AddressOwner']));

			await expect(tx.build({ client })).rejects.toThrow();
		});
	});
});
