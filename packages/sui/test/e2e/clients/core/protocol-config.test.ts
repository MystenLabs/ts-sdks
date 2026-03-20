// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';

describe('Core API - Protocol Config', () => {
	let toolbox: TestToolbox;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
	});

	describe('getProtocolConfig', () => {
		it('all clients return same data: getProtocolConfig', { retry: 3 }, async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.getProtocolConfig(),
				(data) => {
					// Normalize attributes: filter out null values since some transports
					// include keys with null values and others omit them entirely
					const filteredAttributes: Record<string, string | null> = {};
					for (const [key, value] of Object.entries(data.protocolConfig.attributes)) {
						if (value !== null) {
							filteredAttributes[key] = value;
						}
					}
					return {
						protocolConfig: {
							protocolVersion: data.protocolConfig.protocolVersion,
							featureFlags: data.protocolConfig.featureFlags,
							attributes: filteredAttributes,
						},
					};
				},
			);
		});

		testWithAllClients('should return feature flags', async (client) => {
			const result = await client.core.getProtocolConfig();

			expect(result.protocolConfig).toBeDefined();
			expect(result.protocolConfig.featureFlags).toBeDefined();
			expect(typeof result.protocolConfig.featureFlags).toBe('object');

			const flagKeys = Object.keys(result.protocolConfig.featureFlags);
			expect(flagKeys.length).toBeGreaterThan(0);

			for (const value of Object.values(result.protocolConfig.featureFlags)) {
				expect(typeof value).toBe('boolean');
			}
		});

		testWithAllClients('should return attributes', async (client) => {
			const result = await client.core.getProtocolConfig();

			expect(result.protocolConfig.attributes).toBeDefined();
			expect(typeof result.protocolConfig.attributes).toBe('object');

			const attrKeys = Object.keys(result.protocolConfig.attributes);
			expect(attrKeys.length).toBeGreaterThan(0);

			for (const value of Object.values(result.protocolConfig.attributes)) {
				expect(value === null || typeof value === 'string').toBe(true);
			}
		});
	});
});
