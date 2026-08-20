// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Endpoint selection — the code that decides where a Pyth credential is sent.
//
// `#hermesEndpoint()` is private, so these drive it through the public path: stub the
// price object as stale, let `getPriceInfoObject` reach the fetch, and read back the
// endpoint the connection was constructed with. That also pins the failure mode when no
// credential is configured, which is the shipped default on both networks.
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeepBookClient } from '../../../src/client.js';
import { PriceInfoObject } from '../../../src/contracts/pyth/price_info.js';
import { ConfigurationError } from '../../../src/utils/errors.js';
import { PYTH_UPGRADED_HERMES } from '../../../src/utils/constants.js';

const ADDRESS = '0x1111111111111111111111111111111111111111111111111111111111111111';

const get = vi.fn();
const create = vi.spyOn(axios, 'create');

// A price object old enough that the freshness check always routes to the update path.
const STALE = { price_info: { arrival_time: 0n, price_feed: {} } };

function client(opts: { pythAccessToken?: string; hermesEndpoint?: string } = {}) {
	const suiClient = {
		core: {
			getObject: vi.fn().mockResolvedValue({ object: { content: new Uint8Array() } }),
			getObjects: vi.fn().mockResolvedValue({ objects: [] }),
		},
	};
	return new DeepBookClient({
		client: suiClient as never,
		address: ADDRESS,
		network: 'testnet',
		pythAccessToken: opts.pythAccessToken,
		...(opts.hermesEndpoint
			? {
					pyth: {
						pythStateId: '0xaaa',
						wormholeStateId: '0xbbb',
						hermesEndpoint: opts.hermesEndpoint,
					},
				}
			: {}),
	});
}

beforeEach(() => {
	get.mockReset();
	create.mockReset();
	create.mockReturnValue({
		get,
		interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
		defaults: {},
	} as never);
	// The BCS binding is irrelevant here; only endpoint selection is under test.
	vi.spyOn(PriceInfoObject, 'parse').mockReturnValue(STALE as never);
});

describe('#hermesEndpoint via getPriceInfoObject', () => {
	it('throws a named ConfigurationError when no credential is configured', async () => {
		// The shipped default on both networks: no token, and no proxy deployed yet.
		await expect(client().getPriceInfoObject({} as never, 'SUI')).rejects.toThrow(
			ConfigurationError,
		);
		await expect(client().getPriceInfoObject({} as never, 'SUI')).rejects.toThrow(
			/pythAccessToken|accessToken/,
		);
	});

	it('names the field rather than failing inside the http client', async () => {
		// Regression: a placeholder proxy URL once made this a bare `TypeError: Invalid URL`
		// from inside axios, naming neither the field nor the coin.
		await expect(client().getPriceInfoObject({} as never, 'SUI')).rejects.not.toThrow(TypeError);
		expect(create).not.toHaveBeenCalled();
	});
});

describe('endpoint selection', () => {
	it("sends the token to Pyth's endpoint when no explicit endpoint is set", async () => {
		get.mockResolvedValue({ data: { binary: { data: ['UE5BVQ=='] } } });

		await client({ pythAccessToken: 'tok' })
			.getPriceInfoObject({} as never, 'SUI')
			.catch(() => {});

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: PYTH_UPGRADED_HERMES,
				headers: { Authorization: 'Bearer tok' },
			}),
		);
	});

	it('an explicit hermesEndpoint wins, and the token follows it there', async () => {
		// Documented consequence: the credential goes wherever hermesEndpoint points.
		get.mockResolvedValue({ data: { binary: { data: ['UE5BVQ=='] } } });

		await client({ pythAccessToken: 'tok', hermesEndpoint: 'https://mirror.invalid/hermes' })
			.getPriceInfoObject({} as never, 'SUI')
			.catch(() => {});

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				baseURL: 'https://mirror.invalid/hermes',
				headers: { Authorization: 'Bearer tok' },
			}),
		);
	});
});
