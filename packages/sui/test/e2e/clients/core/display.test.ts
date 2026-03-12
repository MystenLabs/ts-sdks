// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { Transaction } from '../../../../src/transactions/index.js';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { normalizeSuiAddress } from '../../../../src/utils/index.js';

const BEAR_NAME = 'TestBear';

describe('Core API - Display', () => {
	let toolbox: TestToolbox;
	let testPackageId: string;
	let demoBearId: string;
	let simpleObjectId: string;
	let testAddress: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();

		testPackageId = toolbox.getPackage('test_data');

		// Create a DemoBear (has Display template) and a SimpleObject (no Display)
		const tx = new Transaction();

		const [bear] = tx.moveCall({
			target: `${testPackageId}::demo_bear::new`,
			arguments: [tx.pure.string(BEAR_NAME)],
		});
		tx.transferObjects([bear], tx.pure.address(testAddress));

		const [simple] = tx.moveCall({
			target: `${testPackageId}::test_objects::create_simple_object`,
			arguments: [tx.pure.u64(1)],
		});
		tx.transferObjects([simple], tx.pure.address(testAddress));

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
			options: { showEffects: true, showObjectChanges: true },
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: result.digest });

		for (const change of result.objectChanges ?? []) {
			if (change.type !== 'created') continue;
			if (change.objectType.includes('DemoBear')) {
				demoBearId = change.objectId;
			} else if (change.objectType.includes('SimpleObject')) {
				simpleObjectId = change.objectId;
			}
		}

		expect(demoBearId).toBeDefined();
		expect(simpleObjectId).toBeDefined();
	});

	describe('getObject with display', () => {
		it('all clients return same data: getObject with display', async () => {
			await toolbox.expectAllClientsReturnSameData((client) =>
				client.core.getObject({ objectId: demoBearId, include: { display: true } }),
			);
		});

		testWithAllClients(
			'returns null display for objects without a Display template',
			async (client) => {
				const { object } = await client.core.getObject({
					objectId: simpleObjectId,
					include: { display: true },
				});

				expect(object.display).toBeNull();
			},
		);

		testWithAllClients(
			'returns display fields for objects with a Display template',
			async (client) => {
				const { object } = await client.core.getObject({
					objectId: demoBearId,
					include: { display: true },
				});

				expect(object.display).not.toBeNull();
				expect(object.display!.output).not.toBeNull();
				expect(object.display!.output!['name']).toBe(BEAR_NAME);
				expect(object.display!.output!['description']).toBe('The greatest figure for demos');
				expect(object.display!.errors).toBeNull();
			},
		);

		testWithAllClients('display is undefined when not requested', async (client) => {
			const { object } = await client.core.getObject({ objectId: demoBearId });
			expect(object.display).toBeUndefined();
		});
	});

	describe('getObjects with display', () => {
		it('all clients return same data: getObjects with display', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) =>
					client.core.getObjects({
						objectIds: [demoBearId, simpleObjectId],
						include: { display: true },
					}),
				// Normalize: sort by objectId since order may vary across transports
				(result) => ({
					...result,
					objects: [...result.objects].sort((a, b) => {
						if (a instanceof Error || b instanceof Error) return 0;
						return a.objectId.localeCompare(b.objectId);
					}),
				}),
			);
		});

		testWithAllClients(
			'returns display fields for objects with a Display template',
			async (client) => {
				const { objects } = await client.core.getObjects({
					objectIds: [demoBearId, simpleObjectId],
					include: { display: true },
				});

				const bear = objects.find(
					(o) => !(o instanceof Error) && o.objectId === normalizeSuiAddress(demoBearId),
				);
				const simple = objects.find(
					(o) => !(o instanceof Error) && o.objectId === normalizeSuiAddress(simpleObjectId),
				);

				expect(bear).not.toBeInstanceOf(Error);
				expect(simple).not.toBeInstanceOf(Error);

				if (bear instanceof Error || simple instanceof Error || bear == null || simple == null)
					return;

				// Objects without Display template always return null
				expect(simple.display).toBeNull();

				expect(bear.display).not.toBeNull();
				expect(bear.display!.output!['name']).toBe(BEAR_NAME);
			},
		);
	});

	describe('listOwnedObjects with display', () => {
		it('all clients return same data: listOwnedObjects with display', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) =>
					client.core.listOwnedObjects({
						owner: testAddress,
						type: `${testPackageId}::demo_bear::DemoBear`,
						include: { display: true },
					}),
				// Normalize: ignore cursor and sort by objectId (order may vary across transports)
				(result) => ({
					...result,
					cursor: null,
					objects: [...result.objects].sort((a, b) => a.objectId.localeCompare(b.objectId)),
				}),
			);
		});

		testWithAllClients(
			'returns display fields for objects with a Display template',
			async (client) => {
				const result = await client.core.listOwnedObjects({
					owner: testAddress,
					type: `${testPackageId}::demo_bear::DemoBear`,
					include: { display: true },
				});

				expect(result.objects.length).toBeGreaterThan(0);

				for (const obj of result.objects) {
					expect(obj.display).not.toBeNull();
					expect(obj.display!.output!['name']).toBe(BEAR_NAME);
				}
			},
		);
	});
});
