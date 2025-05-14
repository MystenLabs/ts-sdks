// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GeneralError } from '../../src/error.js';
import {
	getAllowlistedKeyServers,
	retrieveKeyServers,
	SERVER_VERSION_REQUIREMENT,
	verifyKeyServer,
} from '../../src/key-server.js';
import { Version } from '../../src/utils.js';

// Data for mock response from SuiClient
const pk = fromBase64(
	'oEC1VIuwQo+6FZiVwHCAy/3HbvAbuIyiztXIWwd4LgmXCh9WhOKg3T0+Mb62y9fqAsSaN5SybG09n/3JnkmEzJgdDXLpM8KvMwkha/cBHp6Cx7aCdogvGLoOp/RadyHb',
);
const id = '0xb35a7228d8cf224ad1e828c0217c95a5153bafc2906d6f9c178197dce26fbcf8';
const keyType = 0;
const url = 'https://seal-key-server-testnet-1.mystenlabs.com';
const name = 'mysten-testnet-1';

describe('key-server tests', () => {
	beforeEach(() => {
		vi.mock('@mysten/sui.js', () => ({
			SuiClient: vi.fn(() => ({
				getObject: vi.fn().mockResolvedValue({
					data: {
						content: {
							fields: {
								id: {
									id,
								},
								name,
								url,
								key_type: keyType,
								pk,
							},
						},
					},
				}),
			})),
		}));
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('test fixed getAllowedlistedKeyServers', async () => {
		// These should be updated when new key servers are added.
		expect(getAllowlistedKeyServers('testnet')).toEqual([
			'0xb35a7228d8cf224ad1e828c0217c95a5153bafc2906d6f9c178197dce26fbcf8',
			'0x2d6cde8a9d9a65bde3b0a346566945a63b4bfb70e9a06c41bdb70807e2502b06',
		]);
	});

	it('test retrieveKeyServers (mocked)', async () => {
		const keyServers = await retrieveKeyServers({
			objectIds: [id],
			client: new SuiClient({ url: getFullnodeUrl('testnet') }),
		});
		expect(keyServers.length).toEqual(1);
		expect(keyServers[0].objectId).toEqual(id);
		expect(keyServers[0].name).toEqual(name);
		expect(keyServers[0].keyType).toEqual(0);
		expect(keyServers[0].url).toEqual(url);
		expect(keyServers[0].pk).toEqual(new Uint8Array(pk));
	});

	it('test verifyKeyServerInfo (mocked)', async () => {
		// Mock fetch with exact response from the real service
		const keyServers = await retrieveKeyServers({
			objectIds: [id],
			client: new SuiClient({ url: getFullnodeUrl('testnet') }),
		});
		vi.clearAllMocks();
		const headers = new Headers();
		headers.set('x-keyserver-version', '0.2.0');
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
	});

	it('test verifyKeyServer throws SealAPIError on 503', async () => {
		const keyServers = [
			{
				objectId: id,
				name,
				keyType,
				url,
				pk,
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
});
