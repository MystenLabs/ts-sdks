// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';

describe('Core API - Move Functions', () => {
	let toolbox: TestToolbox;
	let testPackageId: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		// Use entry_point_types package which has well-defined functions
		testPackageId = await toolbox.getPackage('entry_point_types');
	});

	describe('getMoveFunction', () => {
		it('all clients return same data: getMoveFunction', async () => {
			await toolbox.expectAllClientsReturnSameData((client) =>
				client.core.getMoveFunction({
					packageId: testPackageId,
					moduleName: 'entry_point_types',
					name: 'ascii_arg',
				}),
			);
		});

		testWithAllClients('should get Move function details', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId: testPackageId,
				moduleName: 'entry_point_types',
				name: 'ascii_arg',
			});

			expect(result.function).toBeDefined();
			expect(result.function.name).toBe('ascii_arg');
			expect(result.function.moduleName).toBe('entry_point_types');
			expect(result.function.packageId).toBe(testPackageId);
			expect(result.function.visibility).toBe('public');
			expect(result.function.isEntry).toBe(false);
			expect(result.function.typeParameters).toEqual([]);

			// Should have parameters: ascii::String, u64, &mut TxContext
			expect(result.function.parameters).toBeDefined();
			expect(result.function.parameters.length).toBe(3);

			// Should have no return values
			expect(result.function.returns).toEqual([]);
		});

		testWithAllClients('should get function with return value', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId: testPackageId,
				moduleName: 'entry_point_types',
				name: 'id',
			});

			expect(result.function).toBeDefined();
			expect(result.function.name).toBe('id');
			expect(result.function.visibility).toBe('public');

			// The id function has type parameter T
			expect(result.function.typeParameters.length).toBe(1);

			// Should have one parameter of type T
			expect(result.function.parameters.length).toBe(1);

			// Should have one return value of type T
			expect(result.function.returns.length).toBe(1);
		});

		testWithAllClients('should get function with generic type parameters', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId: testPackageId,
				moduleName: 'entry_point_types',
				name: 'drop_all',
			});

			expect(result.function).toBeDefined();
			expect(result.function.name).toBe('drop_all');
			expect(result.function.visibility).toBe('public');

			// drop_all has one type parameter: T: drop
			expect(result.function.typeParameters.length).toBe(1);
			expect(result.function.typeParameters[0].constraints).toContain('drop');

			// Should have parameters: vector<T>, u64
			expect(result.function.parameters.length).toBe(2);
		});

		testWithAllClients('should handle function with vector parameters', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId: testPackageId,
				moduleName: 'entry_point_types',
				name: 'utf8_vec_arg',
			});

			expect(result.function).toBeDefined();
			expect(result.function.name).toBe('utf8_vec_arg');
			expect(result.function.parameters.length).toBe(3);

			// First parameter should be a vector
			const firstParam = result.function.parameters[0];
			expect(firstParam.body.$kind).toBe('vector');
		});

		testWithAllClients('should handle function with Option parameters', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId: testPackageId,
				moduleName: 'entry_point_types',
				name: 'option_ascii_arg',
			});

			expect(result.function).toBeDefined();
			expect(result.function.name).toBe('option_ascii_arg');
			expect(result.function.parameters.length).toBe(1);

			// Parameter should be Option<ascii::String>
			const firstParam = result.function.parameters[0];
			expect(firstParam.body.$kind).toBe('datatype');
			if (firstParam.body.$kind === 'datatype') {
				expect(firstParam.body.datatype.typeName).toContain('Option');
			}
		});

		testWithAllClients('should handle nested Option and vector types', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId: testPackageId,
				moduleName: 'entry_point_types',
				name: 'option_vec_option_utf8_arg',
			});

			expect(result.function).toBeDefined();
			expect(result.function.name).toBe('option_vec_option_utf8_arg');
			expect(result.function.parameters.length).toBe(1);

			// Parameter should be Option<vector<Option<string::String>>>
			const firstParam = result.function.parameters[0];
			expect(firstParam.body.$kind).toBe('datatype');
		});

		testWithAllClients('should throw error for non-existent function', async (client) => {
			await expect(
				client.core.getMoveFunction({
					packageId: testPackageId,
					moduleName: 'entry_point_types',
					name: 'non_existent_function',
				}),
			).rejects.toThrow();
		});

		testWithAllClients('should throw error for non-existent module', async (client) => {
			await expect(
				client.core.getMoveFunction({
					packageId: testPackageId,
					moduleName: 'non_existent_module',
					name: 'ascii_arg',
				}),
			).rejects.toThrow();
		});

		testWithAllClients('should throw error for invalid package ID', async (client) => {
			await expect(
				client.core.getMoveFunction({
					packageId: '0x1234567890abcdef',
					moduleName: 'entry_point_types',
					name: 'ascii_arg',
				}),
			).rejects.toThrow();
		});
	});
});
