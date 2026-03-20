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

		await toolbox.waitForTransaction({ digest: result.digest });

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

	describe('display v1 → v2 migration', () => {
		let migrationBearId = '';
		let v1Display: {
			output: Record<string, string> | null;
			errors: Record<string, string> | null;
		} | null = null;

		beforeAll(async () => {
			// Create a MigrationBear — has v1 Display set up in init, no v2 yet
			const tx = new Transaction();
			const [bear] = tx.moveCall({
				target: `${testPackageId}::migration_bear::new`,
				arguments: [tx.pure.string(BEAR_NAME)],
			});
			tx.transferObjects([bear], tx.pure.address(testAddress));

			const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
				transaction: tx,
				signer: toolbox.keypair,
				options: { showEffects: true, showObjectChanges: true },
			});

			// Wait for all clients to index the new object
			await toolbox.waitForTransaction({ digest: result.digest });

			for (const change of result.objectChanges ?? []) {
				if (change.type !== 'created') continue;
				if (change.objectType.includes('MigrationBear')) {
					migrationBearId = change.objectId;
				}
			}
			expect(migrationBearId).not.toBe('');

			// Before migration: gRPC has no display (no v2 registry entry yet)
			const { object: grpcBefore } = await toolbox.grpcClient.core.getObject({
				objectId: migrationBearId,
				include: { display: true },
			});
			expect(grpcBefore.display).toBeNull();

			// Before migration: JSON-RPC and GraphQL return display from v1
			const { object: jsonRpcBefore } = await toolbox.jsonRpcClient.core.getObject({
				objectId: migrationBearId,
				include: { display: true },
			});
			v1Display = jsonRpcBefore.display;
			expect(v1Display).not.toBeNull();
			expect(v1Display!.output!['name']).toBe(BEAR_NAME);
			expect(v1Display!.output!['description']).toBe('A bear for migration testing');
			expect(v1Display!.errors).toBeNull();

			// Migrate to v2: set up a DisplayRegistry entry for MigrationBear
			const publisherObjectId = toolbox.getPublisherObjectId('test_data');
			const publisherKeypair = toolbox.getPublisherKeypair('test_data');
			expect(publisherObjectId).toBeDefined();
			expect(publisherKeypair).toBeDefined();

			const DISPLAY_REGISTRY_ID = normalizeSuiAddress('0xd');
			const MIGRATION_BEAR_TYPE = `${testPackageId}::migration_bear::MigrationBear`;

			const setupTx = new Transaction();
			const registry = setupTx.object(DISPLAY_REGISTRY_ID);
			const publisher = setupTx.object(publisherObjectId!);

			const [display, cap] = setupTx.moveCall({
				target: '0x2::display_registry::new_with_publisher',
				typeArguments: [MIGRATION_BEAR_TYPE],
				arguments: [registry, publisher],
			});

			for (const [key, value] of [
				['name', '{name}'],
				[
					'image_url',
					'https://images.unsplash.com/photo-1589656966895-2f33e7653819?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cG9sYXIlMjBiZWFyfGVufDB8fDB8fHww',
				],
				['description', 'A bear for migration testing'],
			] as const) {
				setupTx.moveCall({
					target: '0x2::display_registry::set',
					typeArguments: [MIGRATION_BEAR_TYPE],
					arguments: [display, cap, setupTx.pure.string(key), setupTx.pure.string(value)],
				});
			}

			setupTx.moveCall({
				target: '0x2::display_registry::share',
				typeArguments: [MIGRATION_BEAR_TYPE],
				arguments: [display],
			});

			setupTx.transferObjects(
				[cap],
				setupTx.pure.address(publisherKeypair!.getPublicKey().toSuiAddress()),
			);

			const setupResult = await toolbox.jsonRpcClient.signAndExecuteTransaction({
				transaction: setupTx,
				signer: publisherKeypair!,
				options: { showEffects: true },
			});

			// Wait for all clients to index the v2 migration
			await toolbox.waitForTransaction({ digest: setupResult.digest });
		});

		it('all clients agree after v2 migration', async () => {
			await toolbox.expectAllClientsReturnSameData((client) =>
				client.core.getObject({ objectId: migrationBearId, include: { display: true } }),
			);
		});

		it('gRPC v2 display matches JSON-RPC v1 display', async () => {
			const { object } = await toolbox.grpcClient.core.getObject({
				objectId: migrationBearId,
				include: { display: true },
			});
			expect(object.display).toEqual(v1Display);
		});
	});
});
