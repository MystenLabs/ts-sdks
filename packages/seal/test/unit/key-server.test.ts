// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bcs } from '@mysten/sui/bcs';

import { GeneralError, InvalidClientOptionsError } from '../../src/error.js';
import {
	retrieveKeyServers,
	SERVER_VERSION_REQUIREMENT,
	ServerType,
	verifyKeyServer,
} from '../../src/key-server.js';
import { Version } from '../../src/utils.js';

// Data for mock response from SuiClient
const pk = fromBase64(
	'oEC1VIuwQo+6FZiVwHCAy/3HbvAbuIyiztXIWwd4LgmXCh9WhOKg3T0+Mb62y9fqAsSaN5SybG09n/3JnkmEzJgdDXLpM8KvMwkha/cBHp6Cx7aCdogvGLoOp/RadyHb',
);
const id = '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75';
const keyType = 0;
const url = 'https://seal-key-server-testnet-1.mystenlabs.com';
const name = 'mysten-testnet-v1-1';

// Helper to create mock SuiClient for V2 servers.
function createMockV2Client(
	objectId: string,
	firstVersion: number,
	lastVersion: number,
	serverType: ServerType,
	serverUrl?: string,
) {
	const mockGetObject = vi.fn().mockImplementation(() => {
		const keyServerMove = bcs.struct('KeyServer', {
			id: bcs.Address,
			firstVersion: bcs.u64(),
			lastVersion: bcs.u64(),
		});

		return {
			object: {
				content: keyServerMove
					.serialize({
						id: objectId,
						firstVersion: BigInt(firstVersion),
						lastVersion: BigInt(lastVersion),
					})
					.toBytes(),
			},
		};
	});

	const mockGetDynamicField = vi.fn().mockImplementation(() => {
		const serverTypeEnum = bcs.enum('ServerType', {
			Independent: bcs.struct('Independent', {
				url: bcs.string(),
			}),
			Committee: bcs.struct('Committee', {
				version: bcs.u32(),
				threshold: bcs.u16(),
				partialKeyServers: bcs.vector(bcs.Address),
			}),
		});

		const keyServerV2 = bcs.struct('KeyServerV2', {
			name: bcs.string(),
			keyType: bcs.u8(),
			pk: bcs.byteVector(),
			serverType: serverTypeEnum,
		});

		const typeData =
			serverType === 'Independent'
				? { Independent: { url: serverUrl || 'https://example.com' } }
				: { Committee: { version: 1, threshold: 2, partialKeyServers: [] } };

		return {
			dynamicField: {
				value: {
					bcs: keyServerV2
						.serialize({
							name: 'test-server',
							keyType: 0,
							pk: Array.from(pk),
							serverType: typeData,
						})
						.toBytes(),
				},
			},
		};
	});

	return {
		core: {
			getObject: mockGetObject,
			getDynamicField: mockGetDynamicField,
		},
	} as unknown as SuiClient;
}

describe('key-server tests', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('test retrieveKeyServers with invalid version', async () => {
		const mockGetObject = vi.fn().mockImplementation(() => {
			const keyServerMove = bcs.struct('KeyServer', {
				id: bcs.Address,
				firstVersion: bcs.u64(),
				lastVersion: bcs.u64(),
			});

			const serialized = keyServerMove.serialize({
				id,
				firstVersion: BigInt(3),
				lastVersion: BigInt(5),
			});

			return {
				object: {
					content: serialized.toBytes(),
				},
			};
		});

		// Mock SuiClient
		const mockSuiClient = {
			core: {
				getObject: mockGetObject,
				getDynamicField: vi.fn(), // This won't be called due to version check
			},
		} as unknown as SuiClient;

		await expect(
			retrieveKeyServers({
				objectIds: [id],
				client: mockSuiClient,
				configs: new Map(),
			}),
		).rejects.toThrow(
			'Key server 0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75 supports versions between 3 and 5 (inclusive), but SDK expects one of 2, 1',
		);
	});

	it(
		'test verifyKeyServerInfo (mocked)',
		{
			timeout: 12000,
		},
		async () => {
			// Mock fetch with exact response from the real service
			const keyServers = await retrieveKeyServers({
				objectIds: [id],
				client: new SuiClient({ url: getFullnodeUrl('testnet') }),
				configs: new Map(),
			});
			vi.clearAllMocks();
			const headers = new Headers();
			headers.set('x-keyserver-version', '0.4.1');
			global.fetch = vi.fn().mockImplementation(() => {
				return Promise.resolve({
					ok: true,
					status: 200,
					headers,
					json: () =>
						Promise.resolve({
							service_id: id, // Note: the actual response uses the hex string format
							pop: 'iDsj79BrG4PplI8oxRR3OUS6STJkC1ffoljGwSlk2BWib4ovohsk2/irjkqdOEkF',
						}),
				});
			});
			expect(verifyKeyServer(keyServers[0], 10_000)).toBeTruthy();
		},
	);

	it('test verifyKeyServer throws SealAPIError on 503', async () => {
		const keyServers = [
			{
				objectId: id,
				name,
				keyType,
				url,
				pk,
				serverType: 'Independent' as const,
			},
		];
		global.fetch = vi.fn().mockImplementation(() => {
			return Promise.resolve({
				ok: false,
				status: 503,
				text: () => Promise.resolve('Internal server error, please try again later'),
			});
		});

		await expect(verifyKeyServer(keyServers[0], 10_000)).rejects.toThrow(GeneralError);
	});

	it('test comparing key server versions', () => {
		const version0 = new Version('0.1.1');
		const version1 = new Version('0.2.0');
		const version2 = new Version('0.2.1');
		const version3 = new Version('0.3.0');
		const version4 = new Version('1.1.0');
		expect(version0.older_than(version1)).toBe(true);
		expect(version1.older_than(version2)).toBe(true);
		expect(version2.older_than(version3)).toBe(true);
		expect(version3.older_than(version4)).toBe(true);
		expect(version1.older_than(version0)).toBe(false);
		expect(version2.older_than(version1)).toBe(false);
		expect(version3.older_than(version2)).toBe(false);
		expect(version4.older_than(version3)).toBe(false);

		// Update when SERVER_VERSION_REQUIREMENT changes
		expect(version0.older_than(SERVER_VERSION_REQUIREMENT)).toBe(true);
		expect(SERVER_VERSION_REQUIREMENT.older_than(version0)).toBe(false);
	});

	it('test retrieveKeyServers throws error for committee server without aggregatorUrl', async () => {
		const mockSuiClient = createMockV2Client(id, 2, 2, 'Committee');

		await expect(
			retrieveKeyServers({
				objectIds: [id],
				client: mockSuiClient,
				configs: new Map(), // Missing aggregatorUrl
			}),
		).rejects.toThrow(InvalidClientOptionsError);
	});

	it('test retrieveKeyServers V2 uses aggregatorUrl for committee servers', async () => {
		const mockSuiClient = createMockV2Client(id, 2, 2, 'Committee');

		const configs = new Map([[id, { objectId: id, weight: 1, aggregatorUrl: url }]]);

		const keyServers = await retrieveKeyServers({
			objectIds: [id],
			client: mockSuiClient,
			configs,
		});

		expect(keyServers).toHaveLength(1);
		expect(keyServers[0].url).toBe(url);
		expect(keyServers[0].serverType).toBe('Committee');
	});

	it('test retrieveKeyServers V2 uses server URL for independent servers', async () => {
		const mockSuiClient = createMockV2Client(id, 2, 2, 'Independent', url);

		const keyServers = await retrieveKeyServers({
			objectIds: [id],
			client: mockSuiClient,
			configs: new Map(),
		});

		expect(keyServers).toHaveLength(1);
		expect(keyServers[0].url).toBe(url);
		expect(keyServers[0].serverType).toBe('Independent');
	});

	it('test version selection prefers highest supported version', async () => {
		const mockSuiClient = createMockV2Client(id, 1, 2, 'Independent'); // Supports both V1 and V2

		await retrieveKeyServers({ objectIds: [id], client: mockSuiClient, configs: new Map() });

		// Verify getDynamicField was called with version 2 (highest supported)
		expect(mockSuiClient.core.getDynamicField).toHaveBeenCalledWith(
			expect.objectContaining({
				parentId: id,
				name: {
					type: 'u64',
					bcs: bcs.u64().serialize(2).toBytes(),
				},
			}),
		);
	});
});
