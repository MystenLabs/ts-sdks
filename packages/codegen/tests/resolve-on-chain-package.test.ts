// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	getOnChainSummaryArgs,
	resolveOnChainPackageId,
	writeSuiClientConfig,
} from '../src/cli/commands/generate/impl.js';
import { configSchema, DEFAULT_FULLNODE_URLS } from '../src/config.js';

describe('resolveOnChainPackageId', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns package IDs without resolving them', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		const packageId = `0x${'2'.repeat(64)}`;

		await expect(
			resolveOnChainPackageId(packageId, 'testnet', DEFAULT_FULLNODE_URLS.testnet),
		).resolves.toBe(packageId);
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

		await expect(
			resolveOnChainPackageId('@deepbook/core', 'testnet', 'https://custom.testnet.example'),
		).resolves.toBe('0x123');
		expect(fetch).toHaveBeenCalledWith(
			'https://testnet.mvr.mystenlabs.com/v1/resolution/bulk',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ names: ['@deepbook/core'] }),
			}),
		);
	});

	it('uses a temporary client config when generating summaries', () => {
		expect(getOnChainSummaryArgs('0x123', '/tmp/client.json', '/tmp/output')).toEqual([
			'move',
			'--client.config',
			'/tmp/client.json',
			'--client.env',
			'codegen',
			'summary',
			'--package-id',
			'0x123',
			'--output-directory',
			'/tmp/output',
		]);
	});

	it('writes the configured fullnode URL to the temporary client config', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'codegen-client-config-'));
		try {
			const configPath = writeSuiClientConfig(directory, 'https://custom.testnet.example');
			const config = JSON.parse(await readFile(configPath, 'utf8'));

			expect(config.envs).toEqual([
				expect.objectContaining({
					alias: 'codegen',
					rpc: 'https://custom.testnet.example',
				}),
			]);
			expect(config.active_env).toBe('codegen');
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it('provides default fullnode URLs and accepts per-network overrides', () => {
		const config = configSchema.parse({
			output: './generated',
			packages: [],
			fullnodeUrls: { testnet: 'https://custom.testnet.example' },
		});

		expect(config.fullnodeUrls).toEqual({
			mainnet: DEFAULT_FULLNODE_URLS.mainnet,
			testnet: 'https://custom.testnet.example',
		});
	});
});
