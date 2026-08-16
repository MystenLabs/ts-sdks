// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	getOnChainSummaryArgs,
	resolveOnChainPackageId,
} from '../src/cli/commands/generate/impl.js';

describe('resolveOnChainPackageId', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns package IDs without resolving them', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);

		await expect(resolveOnChainPackageId('0x2', 'testnet')).resolves.toBe('0x2');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('resolves MVR names on the configured network', async () => {
		const fetch = vi.fn(async () =>
			Response.json({
				resolution: {
					'@deepbook/core': { package_id: '0x123' },
				},
			}),
		);
		vi.stubGlobal('fetch', fetch);

		await expect(resolveOnChainPackageId('@deepbook/core', 'testnet')).resolves.toBe('0x123');
		expect(fetch).toHaveBeenCalledWith(
			'https://testnet.mvr.mystenlabs.com/v1/resolution/bulk',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ names: ['@deepbook/core'] }),
			}),
		);
	});

	it('generates summaries on the configured network', () => {
		expect(getOnChainSummaryArgs('0x123', 'testnet', '/tmp/output')).toEqual([
			'move',
			'--client.env',
			'testnet',
			'summary',
			'--package-id',
			'0x123',
			'--output-directory',
			'/tmp/output',
		]);
	});
});
