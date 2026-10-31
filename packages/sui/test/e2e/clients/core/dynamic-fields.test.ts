// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { bcs } from '../../../../src/bcs/index.js';
import type { SuiClientTypes } from '../../../../src/client/index.js';
import { deriveDynamicFieldID } from '../../../../src/utils/dynamic-fields.js';

describe('Core API - Dynamic Fields', () => {
	let toolbox: TestToolbox;
	let testPackageId: string;
	let objectWithDynamicFieldsId: string;
	let objectWithMixedFieldsId: string;
	let objectWithStructFieldsId: string;

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

		const result1 = await toolbox.signAndExecuteTransaction({
			transaction: tx1,
			signer: toolbox.keypair,
			include: { effects: true, objectTypes: true },
		});

		expect(result1.$kind).toBe('Transaction');
		const dfObj = result1.Transaction?.effects.changedObjects.find(
			(change) =>
				change.idOperation === 'Created' &&
				result1.Transaction?.objectTypes[change.objectId]?.includes(
					'test_objects::ObjectWithDynamicFields',
				),
		);
		expect(dfObj).toBeDefined();
		objectWithDynamicFieldsId = dfObj!.objectId;

		// Create an object with mixed dynamic fields (regular + DOF)
		const tx2 = new Transaction();
		tx2.moveCall({
			target: `${testPackageId}::test_objects::create_object_with_mixed_dynamic_fields`,
		});

		const result2 = await toolbox.signAndExecuteTransaction({
			transaction: tx2,
			signer: toolbox.keypair,
			include: { effects: true, objectTypes: true },
		});

		expect(result2.$kind).toBe('Transaction');
		const mixedObj = result2.Transaction?.effects.changedObjects.find(
			(change) =>
				change.idOperation === 'Created' &&
				result2.Transaction?.objectTypes[change.objectId]?.includes(
					'test_objects::ObjectWithDynamicFields',
				),
		);
		expect(mixedObj).toBeDefined();
		objectWithMixedFieldsId = mixedObj!.objectId;

		// Create an object whose fields use struct names and struct values
		const tx3 = new Transaction();
		tx3.moveCall({
			target: `${testPackageId}::test_objects::create_object_with_struct_dynamic_fields`,
		});

		const result3 = await toolbox.signAndExecuteTransaction({
			transaction: tx3,
			signer: toolbox.keypair,
			include: { effects: true, objectTypes: true },
		});

		expect(result3.$kind).toBe('Transaction');
		const structObj = result3.Transaction?.effects.changedObjects.find(
			(change) =>
				change.idOperation === 'Created' &&
				result3.Transaction?.objectTypes[change.objectId]?.includes(
					'test_objects::ObjectWithDynamicFields',
				),
		);
		expect(structObj).toBeDefined();
		objectWithStructFieldsId = structObj!.objectId;

		expect(objectWithDynamicFieldsId).toBeDefined();
		expect(objectWithMixedFieldsId).toBeDefined();
	});

	const sortByFieldId = <T extends { cursor: string | null; dynamicFields: { fieldId: string }[] }>(
		result: T,
	) => ({
		...result,
		cursor: null,
		dynamicFields: [...result.dynamicFields].sort((a, b) => a.fieldId.localeCompare(b.fieldId)),
	});

	// Dynamic object fields are looked up by their `Wrapper` name type
	const lookupNameType = (field: SuiClientTypes.DynamicFieldEntry<any>) =>
		field.$kind === 'DynamicObject'
			? `0x2::dynamic_object_field::Wrapper<${field.name.type}>`
			: field.name.type;

	const decodeName = (field: SuiClientTypes.DynamicFieldEntry<any>) =>
		new TextDecoder().decode(new Uint8Array(bcs.vector(bcs.u8()).parse(field.name.bcs)));

	describe('getDynamicFields', () => {
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
	});

	describe('cross-client parity', () => {
		for (const [label, getParentId] of [
			['dynamic fields', () => objectWithDynamicFieldsId],
			['mixed dynamic and dynamic object fields', () => objectWithMixedFieldsId],
			['struct names and values', () => objectWithStructFieldsId],
		] as const) {
			it(`all clients return same data: ${label}`, async () => {
				await toolbox.expectAllClientsReturnSameData(
					(client) => client.core.listDynamicFields({ parentId: getParentId() }),
					sortByFieldId,
				);
			});

			it(`all clients return same data with values: ${label}`, async () => {
				await toolbox.expectAllClientsReturnSameData(
					(client) =>
						client.core.listDynamicFields({
							parentId: getParentId(),
							include: { value: true },
						}),
					sortByFieldId,
				);
			});

			testWithAllClients(`entries match the field objects: ${label}`, async (client) => {
				const parentId = getParentId();
				const { dynamicFields } = await client.core.listDynamicFields({
					parentId,
					include: { value: true },
				});
				const { objects } = await client.core.getObjects({
					objectIds: dynamicFields.map((field) => field.fieldId),
				});

				dynamicFields.forEach((field, i) => {
					const fieldObject = objects[i];
					if (fieldObject instanceof Error) throw fieldObject;
					expect(field.type).toBe(fieldObject.type);
					expect(field.value.type).toBe(field.valueType);

					expect(field.fieldId).toBe(
						deriveDynamicFieldID(parentId, lookupNameType(field), field.name.bcs),
					);
				});
			});

			testWithAllClients(
				`getDynamicField agrees with listDynamicFields: ${label}`,
				async (client) => {
					const parentId = getParentId();
					const { dynamicFields } = await client.core.listDynamicFields({
						parentId,
						include: { value: true },
					});

					for (const field of dynamicFields) {
						const { dynamicField } = await client.core.getDynamicField({
							parentId,
							name: { type: lookupNameType(field), bcs: field.name.bcs },
						});
						const { version, digest, previousTransaction, ...entry } = dynamicField;
						expect(version).toBeTypeOf('string');
						expect(digest).toBeTypeOf('string');
						expect(previousTransaction).toBeTypeOf('string');
						expect(entry).toEqual(field);
					}
				},
			);

			it(`all clients return same data: getDynamicField for ${label}`, async () => {
				const { dynamicFields } = await toolbox.grpcClient.core.listDynamicFields({
					parentId: getParentId(),
				});

				for (const field of dynamicFields) {
					await toolbox.expectAllClientsReturnSameData((client) =>
						client.core.getDynamicField({
							parentId: getParentId(),
							name: { type: lookupNameType(field), bcs: field.name.bcs },
						}),
					);
				}
			});
		}
	});

	describe('listDynamicFields with include: { value: true }', () => {
		testWithAllClients('should return field values', async (client) => {
			const result = await client.core.listDynamicFields({
				parentId: objectWithDynamicFieldsId,
				include: { value: true },
			});

			expect(result.dynamicFields.length).toBe(3);
			const values = Object.fromEntries(
				result.dynamicFields.map((field) => [decodeName(field), field.value]),
			);
			expect(values.field_u64.type).toBe('u64');
			expect(bcs.u64().parse(values.field_u64.bcs)).toBe('42');
			expect(values.field_bool.type).toBe('bool');
			expect(bcs.bool().parse(values.field_bool.bcs)).toBe(true);
			expect(values.field_address.type).toBe('address');
			expect(bcs.Address.parse(values.field_address.bcs)).toBe(toolbox.address());
		});

		testWithAllClients('should return undefined value without include', async (client) => {
			const result = await client.core.listDynamicFields({
				parentId: objectWithMixedFieldsId,
			});

			expect(result.dynamicFields.length).toBe(2);
			for (const field of result.dynamicFields) {
				expect(field.value).toBeUndefined();
			}
		});

		testWithAllClients(
			'should return the child object content for dynamic object fields',
			async (client) => {
				const result = await client.core.listDynamicFields({
					parentId: objectWithMixedFieldsId,
					include: { value: true },
				});

				const regularField = result.dynamicFields.find((f) => f.$kind === 'DynamicField')!;
				const objectField = result.dynamicFields.find((f) => f.$kind === 'DynamicObject')!;

				expect(bcs.u64().parse(regularField.value.bcs)).toBe('100');

				const { object: child } = await client.core.getObject({
					objectId: objectField.childId!,
					include: { content: true },
				});
				expect(objectField.valueType).toBe(child.type);
				expect(objectField.value).toEqual({ type: child.type, bcs: child.content });
				expect(
					bcs
						.struct('SimpleObject', { id: bcs.Address, value: bcs.u64() })
						.parse(objectField.value.bcs),
				).toEqual({ id: objectField.childId, value: '42' });
			},
		);
	});

	describe('getDynamicField', () => {
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

		testWithAllClients(
			'should return the child object for dynamic object fields',
			async (client) => {
				const { dynamicFields } = await client.core.listDynamicFields({
					parentId: objectWithMixedFieldsId,
				});
				const objectField = dynamicFields.find((f) => f.$kind === 'DynamicObject')!;

				const { dynamicField } = await client.core.getDynamicField({
					parentId: objectWithMixedFieldsId,
					name: { type: lookupNameType(objectField), bcs: objectField.name.bcs },
				});
				const { object: child } = await client.core.getDynamicObjectField({
					parentId: objectWithMixedFieldsId,
					name: objectField.name,
					include: { content: true },
				});

				expect(dynamicField.$kind).toBe('DynamicObject');
				expect(dynamicField.childId).toBe(child.objectId);
				expect(dynamicField.valueType).toBe(child.type);
				expect(dynamicField.value).toEqual({ type: child.type, bcs: child.content });
			},
		);

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
