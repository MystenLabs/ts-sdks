// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { SUI_TYPE_ARG } from '../../../../src/utils/index.js';
import { bcs } from '../../../../src/bcs/index.js';

/**
 * Transaction Resolution Test Suite
 *
 * Tests that transaction resolution correctly resolves:
 * - Object references (version, digest)
 * - Gas payment, budget, and price
 * - Shared object properties
 *
 * Key principles:
 * 1. After tx.build({ client }), transaction should be fully resolved
 * 2. Second build() without client should succeed (no re-resolution needed)
 * 3. Explicit values should NEVER be overwritten by resolution
 */
describe('Core API - Transaction Resolution', () => {
	let toolbox: TestToolbox;
	let testAddress: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();
	});

	describe('Object Resolution', () => {
		testWithAllClients(
			'should resolve object ID to full reference',
			async (client) => {
				const coins = await client.core.getCoins({ address: testAddress, coinType: SUI_TYPE_ARG });
				expect(coins.objects.length).toBeGreaterThan(0);

				const tx = new Transaction();
				tx.transferObjects([tx.object(coins.objects[0].id)], testAddress);
				tx.setSender(testAddress);

				// Build with client - performs resolution
				const bytes = await tx.build({ client });

				// Verify object was resolved with version and digest
				const parsed = bcs.TransactionData.parse(bytes);
				const objInput =
					parsed.V1?.kind.ProgrammableTransaction?.inputs[0].Object?.ImmOrOwnedObject;
				expect(objInput?.objectId).toBeDefined();
				expect(objInput?.version).toBeDefined();
				expect(objInput?.digest).toBeDefined();

				// Second build without client should succeed (already resolved)
				const bytes2 = await tx.build();
				expect(bytes2).toEqual(bytes);
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should NOT overwrite explicit object version/digest',
			async (client) => {
				const coins = await client.core.getCoins({ address: testAddress, coinType: SUI_TYPE_ARG });
				const coin = coins.objects[0];

				const tx = new Transaction();
				// Explicitly provide full reference
				tx.transferObjects(
					[tx.objectRef({ objectId: coin.id, version: coin.version, digest: coin.digest })],
					testAddress,
				);
				tx.setSender(testAddress);

				const bytes = await tx.build({ client });

				// Verify explicit values were preserved
				const parsed = bcs.TransactionData.parse(bytes);
				const objInput =
					parsed.V1?.kind.ProgrammableTransaction?.inputs[0].Object?.ImmOrOwnedObject;
				expect(objInput?.version).toBe(coin.version);
				expect(objInput?.digest).toBe(coin.digest);
			},
			{ skip: ['graphql'] },
		);
	});

	describe('Shared Objects', () => {
		testWithAllClients(
			'should handle explicit shared object',
			async (client) => {
				const CLOCK_OBJECT_ID = '0x6';

				const tx = new Transaction();
				const clock = tx.sharedObjectRef({
					objectId: CLOCK_OBJECT_ID,
					mutable: false,
					initialSharedVersion: '1',
				});
				tx.moveCall({
					target: '0x2::clock::timestamp_ms',
					arguments: [clock],
				});
				tx.setSender(testAddress);

				const bytes = await tx.build({ client });

				// Verify shared object properties
				const parsed = bcs.TransactionData.parse(bytes);
				const objInput = parsed.V1?.kind.ProgrammableTransaction?.inputs[0].Object?.SharedObject;
				expect(objInput?.mutable).toBe(false);
				expect(objInput?.initialSharedVersion).toBe('1');

				// Second build without client should work
				const bytes2 = await tx.build();
				expect(bytes2).toEqual(bytes);
			},
			{ skip: ['graphql'] },
		);
	});

	describe('Gas Resolution', () => {
		testWithAllClients(
			'should resolve gas budget when not set',
			async (client) => {
				const tx = new Transaction();
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);
				tx.setSender(testAddress);

				const bytes = await tx.build({ client });

				// Verify budget was set
				const parsed = bcs.TransactionData.parse(bytes);
				expect(parsed.V1?.gasData.budget).toBeDefined();
				expect(Number(parsed.V1?.gasData.budget)).toBeGreaterThan(0);

				// Second build without client should work
				const bytes2 = await tx.build();
				expect(bytes2).toEqual(bytes);
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should NOT overwrite explicit gas budget',
			async (client) => {
				const explicitBudget = 10000000;

				const tx = new Transaction();
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);
				tx.setSender(testAddress);
				tx.setGasBudget(explicitBudget); // Explicit

				const bytes = await tx.build({ client });

				// Verify explicit budget preserved
				const parsed = bcs.TransactionData.parse(bytes);
				expect(String(parsed.V1?.gasData.budget)).toBe(String(explicitBudget));
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should resolve gas price when not set',
			async (client) => {
				const tx = new Transaction();
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);
				tx.setSender(testAddress);

				const bytes = await tx.build({ client });

				// Verify price was set
				const parsed = bcs.TransactionData.parse(bytes);
				expect(parsed.V1?.gasData.price).toBeDefined();
				expect(Number(parsed.V1?.gasData.price)).toBeGreaterThan(0);

				// Second build without client should work
				const bytes2 = await tx.build();
				expect(bytes2).toEqual(bytes);
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should NOT overwrite explicit gas price',
			async (client) => {
				const refPrice = await client.core.getReferenceGasPrice();
				const explicitPrice = refPrice.referenceGasPrice;

				const tx = new Transaction();
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);
				tx.setSender(testAddress);
				tx.setGasPrice(explicitPrice); // Explicit

				const bytes = await tx.build({ client });

				// Verify explicit price preserved
				const parsed = bcs.TransactionData.parse(bytes);
				expect(String(parsed.V1?.gasData.price)).toBe(String(explicitPrice));
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should resolve gas payment when not set',
			async (client) => {
				const tx = new Transaction();
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);
				tx.setSender(testAddress);

				const bytes = await tx.build({ client });

				// Verify payment was set
				const parsed = bcs.TransactionData.parse(bytes);
				expect(parsed.V1?.gasData.payment).toBeDefined();
				expect(parsed.V1?.gasData.payment?.length).toBeGreaterThan(0);

				// Second build without client should work
				const bytes2 = await tx.build();
				expect(bytes2).toEqual(bytes);
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should NOT overwrite explicit gas payment',
			async (client) => {
				const coins = await client.core.getCoins({ address: testAddress, coinType: SUI_TYPE_ARG });
				expect(coins.objects.length).toBeGreaterThan(0);

				const explicitGasCoin = coins.objects[0];
				const tx = new Transaction();
				tx.setSender(testAddress);
				tx.setGasPayment([
					{
						objectId: explicitGasCoin.id,
						version: explicitGasCoin.version,
						digest: explicitGasCoin.digest,
					},
				]); // Explicit
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);

				const bytes = await tx.build({ client });

				// Verify explicit gas coin preserved
				const parsed = bcs.TransactionData.parse(bytes);
				expect(parsed.V1?.gasData.payment?.[0].objectId).toBe(explicitGasCoin.id);
			},
			{ skip: ['graphql'] },
		);
	});

	describe('Transaction Execution', () => {
		testWithAllClients(
			'resolved transaction should execute successfully',
			async (client) => {
				const tx = new Transaction();
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);
				tx.setSender(testAddress);

				// Resolve using test client
				const bytes = await tx.build({ client });
				expect(bytes).toBeDefined();

				// Execute resolved transaction (use JSON RPC client for signing since gRPC doesn't support it)
				const result = await toolbox.client.signAndExecuteTransaction({
					transaction: tx,
					signer: toolbox.keypair,
					options: {
						showEffects: true,
					},
				});
				expect(result.effects?.status.status).toBe('success');

				// Wait for indexing
				await toolbox.client.waitForTransaction({ digest: result.digest });
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should correctly resolve and execute transaction with Pure inputs (Move call)',
			async (client) => {
				// Publish test package with Move functions that take Pure arguments
				const packageId = await toolbox.getPackage('core_test');

				const tx = new Transaction();
				// Call Move function with Pure u64 argument
				// This tests that Pure.bytes (base64 string) is correctly decoded for gRPC
				const [obj] = tx.moveCall({
					target: `${packageId}::test_objects::create_simple_object`,
					arguments: [tx.pure.u64(12345)],
				});
				tx.transferObjects([obj], testAddress);
				tx.setSender(testAddress);

				// Resolve using test client
				const bytes = await tx.build({ client });
				expect(bytes).toBeDefined();

				// Verify the Pure input was correctly encoded in BCS
				const parsed = bcs.TransactionData.parse(bytes);
				const pureInput = parsed.V1?.kind.ProgrammableTransaction?.inputs[0];
				expect(pureInput?.Pure).toBeDefined();

				// Execute resolved transaction (use JSON RPC client for signing since gRPC doesn't support it)
				const result = await toolbox.client.signAndExecuteTransaction({
					transaction: tx,
					signer: toolbox.keypair,
					options: {
						showEffects: true,
						showObjectChanges: true,
					},
				});
				expect(result.effects?.status.status).toBe('success');

				// Verify the object was created with the correct value
				const createdObjects = result.objectChanges?.filter((c) => c.type === 'created');
				expect(createdObjects?.length).toBeGreaterThan(0);

				// Wait for indexing
				await toolbox.client.waitForTransaction({ digest: result.digest });
			},
			{ skip: ['graphql'] },
		);

		it('gRPC conversion helpers round-trip: verify structure preservation', async () => {
			const packageId = await toolbox.getPackage('core_test');

			// Create a transaction with multiple input types and commands
			const tx = new Transaction();

			// Input 0: Pure u64
			const valueArg = tx.pure.u64(99999);

			// Input 1: Pure amount for split
			const splitAmountArg = tx.pure.u64(1000);

			// Command 0: MoveCall with Pure argument
			const [createdObj] = tx.moveCall({
				target: `${packageId}::test_objects::create_simple_object`,
				arguments: [valueArg],
			});

			// Command 1: SplitCoins using GasCoin
			const [splitCoin] = tx.splitCoins(tx.gas, [splitAmountArg]);

			// Command 2: TransferObjects with Results
			tx.transferObjects([createdObj, splitCoin], testAddress);

			// Command 3: MergeCoins (merge splitCoin back into gas)
			tx.mergeCoins(tx.gas, [splitCoin]);

			tx.setSender(testAddress);

			const originalParsed = bcs.TransactionKind.parse(
				await tx.build({ onlyTransactionKind: true }),
			).ProgrammableTransaction;

			// Test conversion: TransactionData -> BCS (via onlyTransactionKind)
			const bytes = await tx.build({ client: toolbox.client, onlyTransactionKind: true });

			// Parse the BCS back to verify the round-trip preserved the structure
			const kind = bcs.TransactionKind.parse(bytes);
			const ptx = kind.ProgrammableTransaction;
			expect(ptx).toBeDefined();

			// Verify the round-trip preserved commands and inputs
			expect(ptx!.commands).toEqual(originalParsed!.commands);
			expect(ptx!.inputs).toEqual(originalParsed!.inputs);
		});

		testWithAllClients(
			'should NOT update tx.getData() when using onlyTransactionKind',
			async (client) => {
				const tx = new Transaction();
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);
				tx.setSender(testAddress);

				// Capture initial snapshot before onlyTransactionKind build
				const snapshotBefore = tx.getData();

				// Verify gas data is not resolved yet
				expect(snapshotBefore.gasData.budget).toBeNull();
				expect(snapshotBefore.gasData.payment).toBeNull();
				expect(snapshotBefore.gasData.price).toBeNull();

				// Build with onlyTransactionKind
				const kindBytes = await tx.build({ client, onlyTransactionKind: true });
				expect(kindBytes).toBeDefined();

				// Verify transaction snapshot was NOT mutated by onlyTransactionKind build
				const snapshotAfter = tx.getData();
				expect(snapshotAfter.gasData.budget).toBeNull();
				expect(snapshotAfter.gasData.payment).toBeNull();
				expect(snapshotAfter.gasData.price).toBeNull();
				expect(JSON.stringify(snapshotAfter)).toBe(JSON.stringify(snapshotBefore));

				// Parse as TransactionKind (not TransactionData)
				const kind = bcs.TransactionKind.parse(kindBytes);
				expect(kind.ProgrammableTransaction).toBeDefined();
				expect(kind.ProgrammableTransaction?.commands.length).toBeGreaterThan(0);

				// Verify full build still works after and does populate gas data
				const fullBytes = await tx.build({ client });
				const parsed = bcs.TransactionData.parse(fullBytes);

				// Full build should have gas data
				expect(parsed.V1?.gasData.budget).toBeDefined();
				expect(parsed.V1?.gasData.price).toBeDefined();
				expect(parsed.V1?.gasData.payment?.length).toBeGreaterThan(0);

				// Verify tx.getData() is now updated after normal build
				const snapshotAfterFull = tx.getData();
				expect(snapshotAfterFull.gasData.budget).not.toBeNull();
				expect(snapshotAfterFull.gasData.payment).not.toBeNull();
				expect(snapshotAfterFull.gasData.price).not.toBeNull();
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should not include expiration in onlyTransactionKind mode',
			async (client) => {
				const tx = new Transaction();
				tx.setExpiration({ None: true });
				const coin = tx.splitCoins(tx.gas, [1000]);
				tx.transferObjects([coin], testAddress);
				tx.setSender(testAddress);

				// Build with onlyTransactionKind
				const kindBytes = await tx.build({ client, onlyTransactionKind: true });

				// Parse as TransactionKind
				const kind = bcs.TransactionKind.parse(kindBytes);
				expect(kind.ProgrammableTransaction).toBeDefined();

				// Now build full transaction
				const fullBytes = await tx.build({ client });
				const parsed = bcs.TransactionData.parse(fullBytes);

				// Full build should have expiration
				expect(parsed.V1?.expiration).toBeDefined();
				expect(parsed.V1?.expiration.None).toBe(true);
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should resolve objects in onlyTransactionKind mode and mutate tx.getData() for objects but not gas',
			async (client) => {
				// Get a real object to use
				const coins = await client.core.getCoins({ address: testAddress, coinType: SUI_TYPE_ARG });
				expect(coins.objects.length).toBeGreaterThan(0);
				const coinId = coins.objects[0].id;

				const tx = new Transaction();
				// Use object ID only (unresolved) - will need resolution
				tx.transferObjects([tx.object(coinId)], testAddress);
				tx.setSender(testAddress);

				// Capture initial snapshot
				const snapshotBefore = tx.getData();
				const inputBefore = snapshotBefore.inputs[0];

				// Verify input is UnresolvedObject (ID only, no version/digest)
				expect(inputBefore.$kind).toBe('UnresolvedObject');
				expect(inputBefore.UnresolvedObject?.objectId).toBe(coinId);
				// Verify no gas data yet
				expect(snapshotBefore.gasData.budget).toBeNull();
				expect(snapshotBefore.gasData.payment).toBeNull();

				// Build with onlyTransactionKind - should resolve objects AND mutate tx.getData()
				// but NOT set gas data
				const kindBytes = await tx.build({ client, onlyTransactionKind: true });
				expect(kindBytes).toBeDefined();

				// Verify tx.getData() WAS mutated for object resolution
				const snapshotAfter = tx.getData();
				const inputAfter = snapshotAfter.inputs[0];
				expect(inputAfter.$kind).toBe('Object');
				expect(inputAfter.Object?.$kind).toBe('ImmOrOwnedObject');
				expect(inputAfter.Object?.ImmOrOwnedObject?.objectId).toBe(coinId);
				expect(inputAfter.Object?.ImmOrOwnedObject?.version).toBeDefined();
				expect(inputAfter.Object?.ImmOrOwnedObject?.digest).toBeDefined();

				// But gas data should still be null
				expect(snapshotAfter.gasData.budget).toBeNull();
				expect(snapshotAfter.gasData.payment).toBeNull();
				expect(snapshotAfter.gasData.price).toBeNull();

				const kind = bcs.TransactionKind.parse(kindBytes);
				expect(kind.ProgrammableTransaction).toBeDefined();
			},
			{ skip: ['graphql'] },
		);
	});

	describe('Object Type Resolution', () => {
		testWithAllClients(
			'should resolve UnresolvedObject to correct type (receiving object)',
			async (client) => {
				// Setup: publish tto package and create parent/child objects for receiving
				const packageId = await toolbox.getPackage('tto');

				// Create parent and child objects
				const setupTx = new Transaction();
				setupTx.moveCall({
					target: `${packageId}::tto::start`,
					typeArguments: [],
					arguments: [],
				});
				const setupResult = await toolbox.client.signAndExecuteTransaction({
					transaction: setupTx,
					signer: toolbox.keypair,
					options: {
						showEffects: true,
					},
				});

				expect(setupResult.effects?.status.status).toBe('success');
				await toolbox.client.waitForTransaction({ digest: setupResult.digest });

				// Find the created objects
				const created = setupResult.effects?.created || [];
				expect(created.length).toBeGreaterThan(0);

				// Find parent object (owned by testAddress) and receive object (owned by parent object)
				// The tto::start function creates objects where one is owned by the test address,
				// and another is owned by the first object (showing as AddressOwner with object ID)
				const ownedByTestAddress = created.filter((obj) => {
					const owner = obj.owner;
					return (
						typeof owner === 'object' &&
						'AddressOwner' in owner &&
						owner.AddressOwner === testAddress
					);
				});

				// The parent object is owned by the test address
				const parentObject = ownedByTestAddress[0];

				// The receive object is owned by the parent object (AddressOwner that's an object ID)
				const receiveObject = created.find((obj) => {
					const owner = obj.owner;
					return (
						typeof owner === 'object' &&
						'AddressOwner' in owner &&
						owner.AddressOwner !== testAddress &&
						// Should be owned by the parent object
						owner.AddressOwner === parentObject?.reference.objectId
					);
				});

				if (!parentObject || !receiveObject) {
					// Debug: log all created objects
					console.log('Created objects:', JSON.stringify(created, null, 2));
					throw new Error(
						`Could not find parent or receive object. Found ${created.length} objects. Parent: ${!!parentObject}, Receive: ${!!receiveObject}`,
					);
				}
				// Now create a transaction that uses the receive object
				// tx.object() creates UnresolvedObject with only ID
				// Resolution should detect it's used as Receiving type
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::tto::receiver`,
					typeArguments: [],
					arguments: [
						tx.object(parentObject.reference.objectId), // Parent object
						tx.object(receiveObject.reference.objectId), // Will be resolved as Receiving
					],
				});
				tx.setSender(testAddress);

				// Capture transaction data before resolution
				const dataBefore = tx.getData();
				expect(dataBefore.inputs[0].$kind).toBe('UnresolvedObject');
				expect(dataBefore.inputs[1].$kind).toBe('UnresolvedObject');

				// Build with client - triggers resolution
				const bytes = await tx.build({ client });

				// Parse resolved BCS
				const parsed = bcs.TransactionData.parse(bytes);
				const ptx = parsed.V1?.kind.ProgrammableTransaction;
				expect(ptx).toBeDefined();

				// The second input should be resolved as Receiving type
				const receivingInput = ptx!.inputs[1];
				expect(receivingInput.Object?.Receiving).toBeDefined();
				expect(receivingInput.Object?.Receiving?.objectId).toBe(receiveObject.reference.objectId);
				expect(receivingInput.Object?.Receiving?.version).toBeDefined();
				expect(receivingInput.Object?.Receiving?.digest).toBeDefined();

				// Verify transaction would succeed using dryRun (avoids consuming objects)
				const dryRunResult = await client.core.dryRunTransaction({ transaction: bytes });
				expect(dryRunResult.transaction.effects?.status.success).toBe(true);
			},
			{ skip: ['graphql'] },
		);

		testWithAllClients(
			'should resolve UnresolvedObject to correct type (shared object)',
			async (client) => {
				// Setup: create a shared object
				const packageId = await toolbox.getPackage('core_test');

				const setupTx = new Transaction();
				setupTx.moveCall({
					target: `${packageId}::test_objects::create_shared_object`,
					arguments: [],
				});
				const setupResult = await toolbox.client.signAndExecuteTransaction({
					transaction: setupTx,
					signer: toolbox.keypair,
					options: {
						showEffects: true,
					},
				});

				expect(setupResult.effects?.status.status).toBe('success');
				await toolbox.client.waitForTransaction({ digest: setupResult.digest });

				// Find the shared object
				const created = setupResult.effects?.created || [];
				const sharedObject = created.find((obj) => {
					const owner = obj.owner;
					return typeof owner === 'object' && 'Shared' in owner;
				});

				if (!sharedObject) {
					throw new Error('Could not find shared object');
				}

				// Create transaction that uses the shared object
				// tx.object() creates UnresolvedObject with only ID
				// Resolution should detect it's a shared object
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::increment_shared`,
					arguments: [tx.object(sharedObject.reference.objectId)],
				});
				tx.setSender(testAddress);

				// Capture transaction data before resolution
				const dataBefore = tx.getData();
				expect(dataBefore.inputs[0].$kind).toBe('UnresolvedObject');

				// Build with client - triggers resolution
				const bytes = await tx.build({ client });

				// Parse resolved BCS
				const parsed = bcs.TransactionData.parse(bytes);
				const ptx = parsed.V1?.kind.ProgrammableTransaction;
				expect(ptx).toBeDefined();

				// The input should be resolved as SharedObject type
				const sharedInput = ptx!.inputs[0];
				expect(sharedInput.Object?.SharedObject).toBeDefined();
				expect(sharedInput.Object?.SharedObject?.objectId).toBe(sharedObject.reference.objectId);
				expect(sharedInput.Object?.SharedObject?.initialSharedVersion).toBeDefined();
				expect(sharedInput.Object?.SharedObject?.mutable).toBe(true);

				// Verify transaction would succeed using dryRun (avoids consuming objects)
				const dryRunResult = await client.core.dryRunTransaction({ transaction: bytes });
				expect(dryRunResult.transaction.effects?.status.success).toBe(true);
			},
			{ skip: ['graphql'] },
		);
	});
});
