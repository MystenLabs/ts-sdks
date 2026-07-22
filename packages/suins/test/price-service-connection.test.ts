// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PriceServiceConnection } from '../src/pyth/PriceServiceConnection.js';

const { mockGet, mockCreate } = vi.hoisted(() => {
	const mockGet = vi.fn();
	const mockCreate = vi.fn(() => ({ get: mockGet }));
	return { mockGet, mockCreate };
});

vi.mock('axios', () => ({ default: { create: mockCreate } }));
vi.mock('axios-retry', () => ({
	default: Object.assign(() => {}, { exponentialDelay: () => {} }),
}));

describe('PriceServiceConnection - Unit Tests', () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockCreate.mockClear();
	});

	describe('constructor()', () => {
		it('builds a Bearer auth header from the access token', () => {
			new PriceServiceConnection('https://host', { accessToken: 'secret' });
			expect(mockCreate).toHaveBeenCalledWith(
				expect.objectContaining({ headers: { Authorization: 'Bearer secret' } }),
			);
		});
	});

	describe('getLatestVaas()', () => {
		it('fetches from the Hermes v2 endpoint', async () => {
			mockGet.mockResolvedValue({ data: { binary: { data: ['v2-msg'] } } });
			const connection = new PriceServiceConnection('https://host');

			const result = await connection.getLatestVaas(['0xfeed']);

			expect(mockGet).toHaveBeenCalledWith('/v2/updates/price/latest', {
				params: { 'ids[]': ['0xfeed'], encoding: 'base64', parsed: false },
			});
			expect(result).toEqual(['v2-msg']);
		});
	});
});
