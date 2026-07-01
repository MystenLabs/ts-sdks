// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { describe, expect, it } from 'vitest';

import type { PredictCompatibleClient } from '../client.js';
import { PredictConfig } from '../utils/config.js';
import type { PredictIds } from '../utils/config.js';
import type { PricerFeeds } from '../transactions/trade.js';
import type { QueryContext } from './context.js';
import { IndexerClient } from './indexerClient.js';
import type { FetchLike } from './indexerClient.js';
import { MarketQueries } from './marketQueries.js';
import { VaultQueries } from './vaultQueries.js';

const A = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const IDS: PredictIds = {
	predictPackageId: A(0x101),
	accountPackageId: A(0x102),
	propbookPackageId: A(0x103),
	registryId: A(0x104),
	poolVaultId: A(0x105),
	protocolConfigId: A(0x106),
	oracleRegistryId: A(0x107),
	accountRegistryId: A(0x108),
	dusdcType: `${A(0x109)}::dusdc::DUSDC`,
};
const config = new PredictConfig({ network: 'testnet', address: A(0xa11ce), ids: IDS });
const FEEDS: PricerFeeds = {
	pyth: A(0x301),
	bsSpot: A(0x302),
	bsForward: A(0x303),
	bsSvi: A(0x304),
};

const u64 = (v: bigint) => bcs.u64().serialize(v).toBytes();
const optAddr = (v: string | null) => bcs.option(bcs.Address).serialize(v).toBytes();

/** Stub client: `commands[i]` is the list of return-value byte arrays for command i. */
function stubClient(commands: Uint8Array[][]): PredictCompatibleClient {
	return {
		core: {
			async simulateTransaction() {
				return {
					commandResults: commands.map((rvs) => ({
						returnValues: rvs.map((bytes) => ({ bcs: bytes })),
					})),
				};
			},
		},
	} as unknown as PredictCompatibleClient;
}

const ctx = (client: PredictCompatibleClient): QueryContext => ({
	client,
	config,
	address: A(0xa11ce),
});

describe('MarketQueries decode', () => {
	it('currentNav decodes the second command return (u64)', async () => {
		const client = stubClient([[], [u64(4_242n)]]);
		const nav = await new MarketQueries(ctx(client)).currentNav(A(0x202), FEEDS);
		expect(nav).toBe(4_242n);
	});

	it('resolveFeeds returns the four bound feed ids', async () => {
		const client = stubClient([
			[optAddr(A(0x301))],
			[optAddr(A(0x302))],
			[optAddr(A(0x303))],
			[optAddr(A(0x304))],
		]);
		const feeds = await new MarketQueries(ctx(client)).resolveFeeds(A(0x202), 7);
		expect(feeds).toEqual(FEEDS);
	});

	it('resolveFeeds throws when a feed is unbound', async () => {
		const client = stubClient([
			[optAddr(A(0x301))],
			[optAddr(null)],
			[optAddr(A(0x303))],
			[optAddr(A(0x304))],
		]);
		await expect(new MarketQueries(ctx(client)).resolveFeeds(A(0x202), 7)).rejects.toThrow();
	});
});

describe('VaultQueries decode', () => {
	it('getVaultState decodes each getter by command index', async () => {
		const client = stubClient([
			[u64(1n)],
			[u64(2n)],
			[u64(3n)],
			[u64(4n)],
			[u64(5n)],
			[u64(6n)],
			[u64(7n)],
			[u64(8n)],
		]);
		const state = await new VaultQueries(ctx(client)).getVaultState();
		expect(state).toEqual({
			idleBalance: 1n,
			plpTotalSupply: 2n,
			stakedDeep: 3n,
			protocolReserveBalance: 4n,
			feeIncentiveReserve: 5n,
			supplyRequestsPending: 6n,
			withdrawRequestsPending: 7n,
			pendingProtocolProfit: 8n,
		});
	});
});

describe('IndexerClient URL building', () => {
	function recorder() {
		const urls: string[] = [];
		const fetch: FetchLike = async (url) => {
			urls.push(url);
			return { ok: true, status: 200, statusText: 'OK', json: async () => [] };
		};
		return { urls, fetch };
	}

	it('strips the trailing slash and omits an empty query', async () => {
		const { urls, fetch } = recorder();
		await new IndexerClient({ baseUrl: 'https://idx.example/', fetch }).listMarkets();
		expect(urls[0]).toBe('https://idx.example/markets');
	});

	it('serializes the time window (seconds) and limit, skipping undefined', async () => {
		const { urls, fetch } = recorder();
		await new IndexerClient({ baseUrl: 'https://idx.example', fetch }).listMarkets({
			startTime: 5,
			limit: 10,
		});
		expect(urls[0]).toBe('https://idx.example/markets?start_time=5&limit=10');
	});

	it('defaults manager positions to the open status filter', async () => {
		const { urls, fetch } = recorder();
		await new IndexerClient({ baseUrl: 'https://idx.example', fetch }).getManagerPositions(A(0x1));
		expect(urls[0]).toBe(`https://idx.example/managers/${A(0x1)}/positions?status=open`);
	});

	it('throws on a non-ok response', async () => {
		const fetch: FetchLike = async () => ({
			ok: false,
			status: 503,
			statusText: 'Service Unavailable',
			json: async () => ({}),
		});
		await expect(
			new IndexerClient({ baseUrl: 'https://idx.example', fetch }).getStatus(),
		).rejects.toThrow();
	});
});
