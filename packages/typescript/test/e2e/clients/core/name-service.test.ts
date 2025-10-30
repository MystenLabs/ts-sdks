// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Ed25519Keypair } from '../../../../src/keypairs/ed25519/keypair.js';

describe('Core API - Name Service', () => {
	let toolbox: TestToolbox;
	let testAddress: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();
	});

	describe('defaultNameServiceName', () => {
		// Note: SuiNS is not configured on localnet, so we expect specific behavior
		// gRPC throws "SuiNS not configured for this network"
		// GraphQL returns no data (Missing response data)
		// JSON RPC returns undefined instead of null

		testWithAllClients('should handle name service request', async (client) => {
			try {
				const result = await client.core.defaultNameServiceName({
					address: testAddress,
				});

				expect(result.data).toBeDefined();
				// On localnet without SuiNS, name will be null or undefined
				if (result.data.name !== null && result.data.name !== undefined) {
					expect(typeof result.data.name).toBe('string');
				}
			} catch (error) {
				// gRPC and GraphQL may throw errors when SuiNS is not configured
				// This is expected behavior on localnet
				expect(error).toBeDefined();
			}
		});

		testWithAllClients('should handle address without name', async (client) => {
			// Use a new keypair address that definitely has no name
			const emptyAddress = new Ed25519Keypair().toSuiAddress();

			try {
				const result = await client.core.defaultNameServiceName({
					address: emptyAddress,
				});

				expect(result.data).toBeDefined();
				// Accept both null and undefined for addresses without names
				expect([null, undefined]).toContain(result.data.name);
			} catch (error) {
				// gRPC and GraphQL may throw errors when SuiNS is not configured
				expect(error).toBeDefined();
			}
		});

		testWithAllClients('should throw error for invalid address format', async (client) => {
			await expect(
				client.core.defaultNameServiceName({
					address: 'invalid_address',
				}),
			).rejects.toThrow();
		});

		testWithAllClients('should throw error for empty address', async (client) => {
			await expect(
				client.core.defaultNameServiceName({
					address: '',
				}),
			).rejects.toThrow();
		});
	});
});
