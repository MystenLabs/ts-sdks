// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// Hermes wire contract.
//
// Two things this pins, both of which are silent failures if they regress: the endpoint
// must be v2 (`/api/latest_vaas` is deprecated), and auth headers must reach the client
// — the Hermes serving Pyth's upgraded Core answers 401 without an `Authorization`
// header, so a dropped header shows up as a fetch failure rather than a config error.
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PriceServiceConnection } from '../../../src/pyth/PriceServiceConnection.js';
import { DEEPBOOK_HERMES_PROXY, PYTH_UPGRADED_HERMES } from '../../../src/utils/constants.js';

const FEED = 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
const UPDATE = 'UE5BVQEAAAAD';

const get = vi.fn();
const create = vi.spyOn(axios, 'create');

beforeEach(() => {
	get.mockReset();
	create.mockReset();
	create.mockReturnValue({
		get,
		// axios-retry registers on both interceptor chains at construction time.
		interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
		defaults: {},
	} as never);
});

function connection(config?: Parameters<typeof PriceServiceConnection>[1]) {
	return new PriceServiceConnection('https://example.invalid/hermes', config);
}

describe('PriceServiceConnection', () => {
	it('requests Hermes v2, not the deprecated v1 endpoint', async () => {
		get.mockResolvedValue({ data: { binary: { encoding: 'base64', data: [UPDATE] } } });

		const result = await connection().getLatestVaas([FEED]);

		expect(get).toHaveBeenCalledWith('/v2/updates/price/latest', {
			params: { ids: [FEED], encoding: 'base64' },
		});
		expect(result).toEqual([UPDATE]);
	});

	it('passes auth headers to the http client', () => {
		connection({ headers: { Authorization: 'Bearer token' } });

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
		);
	});

	it('omits the headers key entirely when none are configured', () => {
		connection();

		expect(create).toHaveBeenCalledWith(
			expect.not.objectContaining({ headers: expect.anything() }),
		);
	});

	it('returns the single combined message Hermes sends for multiple feeds', async () => {
		// Hermes returns one accumulator message covering every requested feed, so callers
		// must not assume one entry per feed id.
		const second = '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744';
		get.mockResolvedValue({ data: { binary: { data: [UPDATE] } } });

		expect(await connection().getLatestVaas([FEED, second])).toHaveLength(1);
	});

	// Regression: DEEPBOOK_HERMES_PROXY briefly shipped as a literal placeholder host, which
	// made the default testnet path throw `TypeError: Invalid URL` from inside axios —
	// naming neither Hermes, nor the config field, nor the coin. Whatever the constant holds,
	// it must be a resolvable URL or absent, never a placeholder.
	it('the shipped proxy constant is a parseable URL or undefined', () => {
		if (DEEPBOOK_HERMES_PROXY !== undefined) {
			expect(() => new URL(DEEPBOOK_HERMES_PROXY)).not.toThrow();
		}
	});

	it('the shipped upgraded Hermes constant is a parseable URL', () => {
		expect(() => new URL(PYTH_UPGRADED_HERMES)).not.toThrow();
	});

	it('throws a diagnosable error when the response is not v2-shaped', async () => {
		// A v1 endpoint answers with a bare array; surface that rather than returning undefined.
		get.mockResolvedValue({ data: [UPDATE] });

		await expect(connection().getLatestVaas([FEED])).rejects.toThrow(
			/expected 'binary.data' array/,
		);
	});
});
