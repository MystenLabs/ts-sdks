// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';

describe('Core API - Move Packages', () => {
	let toolbox: TestToolbox;
	let packageId: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		packageId = await toolbox.getPackage('test_data');
	});

	describe('getMoveFunction', () => {
		it('all clients return same data: getMoveFunction', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) =>
					client.core.getMoveFunction({
						packageId,
						moduleName: 'test_objects',
						name: 'create_simple_object',
					}),
				// Normalize packageId to handle address normalization differences
				(result) => ({
					...result,
					function: {
						...result.function,
						// Remove any leading '0x' or '00x' then normalize with padStart
						packageId: ('0x' + result.function.packageId.replace(/^0+x/, '')).padStart(66, '0'),
					},
				}),
			);
		});

		testWithAllClients('should get function with correct signature', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId,
				moduleName: 'test_objects',
				name: 'create_simple_object',
			});

			expect(result.function).toBeDefined();
			expect(result.function.name).toBe('create_simple_object');
			expect(result.function.moduleName).toBe('test_objects');
			expect(result.function.packageId).toBeDefined();
			expect(result.function.visibility).toBeDefined();
			expect(typeof result.function.isEntry).toBe('boolean');
			expect(Array.isArray(result.function.parameters)).toBe(true);
			expect(Array.isArray(result.function.returns)).toBe(true);
		});

		testWithAllClients('should get function with parameters and returns', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId,
				moduleName: 'test_objects',
				name: 'create_simple_object',
			});

			expect(result.function.parameters).toBeDefined();
			if (result.function.parameters.length > 0) {
				const param = result.function.parameters[0];
				expect(param.body).toBeDefined();
				expect(param.body.$kind).toBeDefined();
			}

			expect(result.function.returns).toBeDefined();
			expect(Array.isArray(result.function.returns)).toBe(true);
		});

		testWithAllClients('should handle non-existent function', async (client) => {
			await expect(
				client.core.getMoveFunction({
					packageId,
					moduleName: 'test_objects',
					name: 'non_existent_function',
				}),
			).rejects.toThrow();
		});

		testWithAllClients('should handle non-existent module', async (client) => {
			await expect(
				client.core.getMoveFunction({
					packageId,
					moduleName: 'non_existent_module',
					name: 'some_function',
				}),
			).rejects.toThrow();
		});

		testWithAllClients('should get function from standard library (0x2)', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId: '0x2',
				moduleName: 'coin',
				name: 'mint',
			});

			expect(result.function).toBeDefined();
			expect(result.function.name).toBe('mint');
			expect(result.function.moduleName).toBe('coin');
			expect(result.function.packageId).toBeDefined();
		});
	});

	describe('Move Function Signature Details', () => {
		testWithAllClients('should resolve parameter types correctly', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId,
				moduleName: 'test_objects',
				name: 'create_simple_object',
			});

			expect(result.function.parameters).toBeDefined();
			if (result.function.parameters.length > 0) {
				const param = result.function.parameters[0];
				expect(param.body).toBeDefined();
				expect(param.body.$kind).toBeDefined();
			}
		});

		testWithAllClients('should resolve return types correctly', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId,
				moduleName: 'test_objects',
				name: 'create_simple_object',
			});

			expect(result.function.returns).toBeDefined();
			expect(Array.isArray(result.function.returns)).toBe(true);
		});

		testWithAllClients('should identify function visibility', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId,
				moduleName: 'test_objects',
				name: 'create_simple_object',
			});

			expect(result.function.visibility).toBeDefined();
			expect(['public', 'friend', 'private', 'unknown']).toContain(result.function.visibility);
		});

		testWithAllClients('should identify entry functions', async (client) => {
			const result = await client.core.getMoveFunction({
				packageId,
				moduleName: 'test_objects',
				name: 'create_simple_object',
			});

			expect(typeof result.function.isEntry).toBe('boolean');
		});

		testWithAllClients('should handle generic functions with type parameters', async (client) => {
			// Use a generic function from the standard library
			const result = await client.core.getMoveFunction({
				packageId: '0x2',
				moduleName: 'coin',
				name: 'mint',
			});

			expect(result.function.typeParameters).toBeDefined();
			expect(Array.isArray(result.function.typeParameters)).toBe(true);
			expect(result.function.typeParameters.length).toBeGreaterThan(0);

			if (result.function.typeParameters.length > 0) {
				const typeParam = result.function.typeParameters[0];
				expect(typeParam.constraints).toBeDefined();
				expect(Array.isArray(typeParam.constraints)).toBe(true);
				expect(typeof typeParam.isPhantom).toBe('boolean');
			}
		});
	});
});
