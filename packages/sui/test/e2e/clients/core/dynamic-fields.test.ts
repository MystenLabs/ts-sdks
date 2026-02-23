// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { bcs } from '../../../../src/bcs/index.js';

describe('Core API - Dynamic Fields', () => {
	let toolbox: TestToolbox;
	let testPackageId: string;
	let objectWithDynamicFieldsId: string;
	let objectWithMixedFieldsId: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testPackageId = await toolbox.getPackage('test_data');

		// Create an object with regular dynamic fields
		const tx1 = new Transaction();
		tx1.moveCall({
			target: `${testPackageId}::test_objects::create_object_with_dynamic_fields`,
			arguments: [tx1.pure.vector('u8', Array.from(new TextEncoder().encode('test_df_object')))],
		});

		const result1 = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx1,
			signer: toolbox.keypair,
			options: {
				showEffects: true,
				showObjectChanges: true,
			},
		});

		expect(result1.effects?.status.status).toBe('success');
		await toolbox.jsonRpcClient.waitForTransaction({ digest: result1.digest });

		const dfObj = result1.objectChanges?.find(
			(change) =>
				change.type === 'created' &&
				change.objectType?.includes('test_objects::ObjectWithDynamicFields'),
		);
		expect(dfObj).toBeDefined();
		if (dfObj && dfObj.type === 'created') {
			objectWithDynamicFieldsId = dfObj.objectId;
		}

		// Create an object with mixed dynamic fields (regular + DOF)
		const tx2 = new Transaction();
		tx2.moveCall({
			target: `${testPackageId}::test_objects::create_object_with_mixed_dynamic_fields`,
		});

		const result2 = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx2,
			signer: toolbox.keypair,
			options: {
				showEffects: true,
				showObjectChanges: true,
			},
		});

		expect(result2.effects?.status.status).toBe('success');
		await toolbox.jsonRpcClient.waitForTransaction({ digest: result2.digest });

		const mixedObj = result2.objectChanges?.find(
			(change) =>
				change.type === 'created' &&
				change.objectType?.includes('test_objects::ObjectWithDynamicFields'),
		);
		expect(mixedObj).toBeDefined();
		if (mixedObj && mixedObj.type === 'created') {
			objectWithMixedFieldsId = mixedObj.objectId;
		}

		expect(objectWithDynamicFieldsId).toBeDefined();
		expect(objectWithMixedFieldsId).toBeDefined();
	});

	describe('getDynamicFields', () => {
		it('all clients return same data: getDynamicFields', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.listDynamicFields({ parentId: objectWithDynamicFieldsId }),
				// Normalize: ignore cursor and sort by id (order may vary across APIs)
				(result) => ({
					...result,
					cursor: null,
					dynamicFields: result.dynamicFields.sort((a, b) => a.fieldId.localeCompare(b.fieldId)),
				}),
			);
		});

		testWithAllClients('should get all dynamic fields for an object', async (client) => {
			const result = await client.core.listDynamicFields({
				parentId: objectWithDynamicFieldsId,
			});

			// The create_object_with_dynamic_fields function adds 3 fields:
			// - field_u64: 42u64
			// - field_bool: true
			// - field_address: sender address
			expect(result.dynamicFields.length).toBe(3);
			expect(result.hasNextPage).toBe(false);

			// Verify field names - decode BCS to get the string value
			const fieldNames = result.dynamicFields.map((f) => {
				// BCS bytes include ULEB128 length prefix, so parse with BCS
				// Note: gRPC might not return BCS bytes in some cases
				if (!f.name.bcs || f.name.bcs.length === 0) {
					// Fall back to using the type field for identification
					return f.name.type.split('::').pop() || f.name.type;
				}
				const decodedArray = bcs.vector(bcs.u8()).parse(f.name.bcs);
				return new TextDecoder().decode(new Uint8Array(decodedArray));
			});

			expect(fieldNames).toContain('field_u64');
			expect(fieldNames).toContain('field_bool');
			expect(fieldNames).toContain('field_address');
		});

		testWithAllClients('should paginate dynamic fields', async (client) => {
			// Get first page with limit of 2
			const firstPage = await client.core.listDynamicFields({
				parentId: objectWithDynamicFieldsId,
				limit: 2,
			});

			expect(firstPage.dynamicFields.length).toBe(2);
			expect(firstPage.hasNextPage).toBe(true);
			expect(firstPage.cursor).toBeDefined();

			// Get second page
			const secondPage = await client.core.listDynamicFields({
				parentId: objectWithDynamicFieldsId,
				limit: 2,
				cursor: firstPage.cursor,
			});

			expect(secondPage.dynamicFields.length).toBe(1);
			expect(secondPage.hasNextPage).toBe(false);

			// Verify all fields are unique
			const allFieldIds = [
				...firstPage.dynamicFields.map((f) => f.fieldId),
				...secondPage.dynamicFields.map((f) => f.fieldId),
			];
			expect(new Set(allFieldIds).size).toBe(3);
		});

		testWithAllClients('should handle empty result for non-existent parent', async (client) => {
			const result = await client.core.listDynamicFields({
				parentId: '0x0000000000000000000000000000000000000000000000000000000000000001',
			});

			expect(result.dynamicFields.length).toBe(0);
			expect(result.hasNextPage).toBe(false);
		});
	});

	describe('$kind and childId', () => {
		testWithAllClients(
			'should return $kind DynamicField for regular dynamic fields',
			async (client) => {
				const result = await client.core.listDynamicFields({
					parentId: objectWithDynamicFieldsId,
				});

				// All fields on this object are regular dynamic fields
				for (const field of result.dynamicFields) {
					expect(field.$kind).toBe('DynamicField');
					expect(field.childId).toBeUndefined();
				}
			},
		);

		testWithAllClients(
			'should return correct $kind and childId for mixed dynamic fields',
			async (client) => {
				const result = await client.core.listDynamicFields({
					parentId: objectWithMixedFieldsId,
				});

				expect(result.dynamicFields.length).toBe(2);

				const regularField = result.dynamicFields.find((f) => f.$kind === 'DynamicField');
				const objectField = result.dynamicFields.find((f) => f.$kind === 'DynamicObject');

				expect(regularField).toBeDefined();
				expect(objectField).toBeDefined();

				// Regular dynamic field should not have childId
				expect(regularField!.childId).toBeUndefined();

				// Dynamic object field should have childId
				expect(objectField!.childId).toBeTypeOf('string');
				expect(objectField!.childId.length).toBeGreaterThan(0);
			},
		);

		it('all clients return same data for mixed dynamic fields', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.listDynamicFields({ parentId: objectWithMixedFieldsId }),
				(result) => ({
					...result,
					cursor: null,
					dynamicFields: result.dynamicFields.sort((a, b) => a.fieldId.localeCompare(b.fieldId)),
				}),
			);
		});
	});

	describe('getDynamicField', () => {
		it('all clients return same data: getDynamicField', async () => {
			const textBytes = new TextEncoder().encode('field_u64');
			const bcsBytes = bcs.vector(bcs.u8()).serialize(Array.from(textBytes)).toBytes();

			await toolbox.expectAllClientsReturnSameData((client) =>
				client.core.getDynamicField({
					parentId: objectWithDynamicFieldsId,
					name: {
						type: 'vector<u8>',
						bcs: bcsBytes,
					},
				}),
			);
		});

		testWithAllClients('should get a specific dynamic field by name', async (client) => {
			// Encode the field name as BCS bytes (vector<u8> includes length prefix)
			const textBytes = new TextEncoder().encode('field_u64');
			const bcsBytes = bcs.vector(bcs.u8()).serialize(Array.from(textBytes)).toBytes();

			const result = await client.core.getDynamicField({
				parentId: objectWithDynamicFieldsId,
				name: {
					type: 'vector<u8>',
					bcs: bcsBytes,
				},
			});

			expect(result).toBeDefined();
			expect(result.dynamicField).toBeDefined();
			expect(result.dynamicField.name).toBeDefined();
			expect(result.dynamicField.value).toBeDefined();

			// Verify the name - BCS decode
			const decodedArray = bcs.vector(bcs.u8()).parse(result.dynamicField.name.bcs);
			const decodedName = new TextDecoder().decode(new Uint8Array(decodedArray));
			expect(decodedName).toBe('field_u64');
		});

		testWithAllClients('should throw error for non-existent field name', async (client) => {
			const textBytes = new TextEncoder().encode('nonexistent_field');
			const bcsBytes = bcs.vector(bcs.u8()).serialize(Array.from(textBytes)).toBytes();

			await expect(
				client.core.getDynamicField({
					parentId: objectWithDynamicFieldsId,
					name: {
						type: 'vector<u8>',
						bcs: bcsBytes,
					},
				}),
			).rejects.toThrow();
		});
	});
});
