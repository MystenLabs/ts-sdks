// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { SUI_TYPE_ARG } from '../../../../src/utils/index.js';
import type { TransactionPlugin } from '../../../../src/transactions/resolve.js';

/**
 * Creates a transaction plugin that sets kind on a specific input index.
 */
function setExpectedKindPlugin(
	inputIndex: number,
	kind: 'ImmOrOwnedObject' | 'SharedObject' | 'Receiving',
): TransactionPlugin {
	return async (transactionData, _options, next) => {
		const input = transactionData.inputs[inputIndex];
		if (input?.UnresolvedObject) {
			input.UnresolvedObject.kind = kind;
		}
		await next();
	};
}

describe('Core API - Expected Kind Validation', () => {
	let toolbox: TestToolbox;
	let testAddress: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();
	});

	describe('correct kind passes validation', () => {
		testWithAllClients(
			'owned object with kind=ImmOrOwnedObject resolves successfully',
			async (client) => {
				const coins = await client.core.listCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});
				expect(coins.objects.length).toBeGreaterThan(0);

				const tx = new Transaction();
				tx.transferObjects([tx.object(coins.objects[0].objectId)], testAddress);
				tx.setSender(testAddress);
				tx.addBuildPlugin(setExpectedKindPlugin(0, 'ImmOrOwnedObject'));

				// Should not throw
				const bytes = await tx.build({ client });
				expect(bytes).toBeDefined();
			},
		);

		testWithAllClients(
			'shared object with kind=SharedObject resolves successfully',
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
				tx.addBuildPlugin(setExpectedKindPlugin(0, 'SharedObject'));

				// Should not throw
				const bytes = await tx.build({ client });
				expect(bytes).toBeDefined();
			},
		);
	});

	describe('incorrect kind throws error', () => {
		testWithAllClients('owned object with kind=SharedObject throws', async (client) => {
			const coins = await client.core.listCoins({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});
			expect(coins.objects.length).toBeGreaterThan(0);

			const tx = new Transaction();
			tx.transferObjects([tx.object(coins.objects[0].objectId)], testAddress);
			tx.setSender(testAddress);
			tx.addBuildPlugin(setExpectedKindPlugin(0, 'SharedObject'));

			// JSON-RPC: client-side validation catches the mismatch
			// gRPC/GraphQL: server rejects the incorrect kind hint during simulation
			await expect(tx.build({ client })).rejects.toThrow();
		});

		testWithAllClients('shared object with kind=ImmOrOwnedObject throws', async (client) => {
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
			tx.addBuildPlugin(setExpectedKindPlugin(0, 'ImmOrOwnedObject'));

			// JSON-RPC: client-side validation catches the mismatch
			// gRPC/GraphQL: server rejects "object ... is not Immutable or AddressOwned"
			await expect(tx.build({ client })).rejects.toThrow();
		});

		testWithAllClients(
			'owned object with kind=Receiving throws when not used as receiving',
			async (client) => {
				const coins = await client.core.listCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});
				expect(coins.objects.length).toBeGreaterThan(0);

				const tx = new Transaction();
				tx.transferObjects([tx.object(coins.objects[0].objectId)], testAddress);
				tx.setSender(testAddress);
				tx.addBuildPlugin(setExpectedKindPlugin(0, 'Receiving'));

				// JSON-RPC: client-side validation catches the mismatch
				// gRPC/GraphQL: server rejects the incorrect kind during simulation
				await expect(tx.build({ client })).rejects.toThrow();
			},
		);
	});
});
