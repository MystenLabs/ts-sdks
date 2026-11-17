// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// The object reads Predict version 6 needs: an underlying's oracle binding and the desk's Block
// Scholes timing, decoded from their dynamic fields under the version 6 type IDs, the Block
// Scholes verifier's original ID, and a market's fee bands and payout tree for the off-chain
// quotes and NAV.
import { bcs } from '@mysten/sui/bcs';
import { deriveDynamicFieldID, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, test } from 'vitest';
import { OracleBinding } from '../../src/contracts/deepbook_predict/protocol_config.js';
import { PayoutNode } from '../../src/contracts/deepbook_predict/strike_payout_tree.js';
import { BsTiming } from '../../src/contracts/deepbook_predict_orders/delayed_execution_config.js';
import { DEFAULT_BS_TIMING, bsSlots } from '../../src/predict/queue.js';
import {
	blockScholesPackages,
	readBsTiming,
	readOracleBinding,
} from '../../src/predict/reads/binding.js';
import {
	readFeeBands,
	readMarketObject,
	readMarketWithBook,
	readPayoutBoundaries,
} from '../../src/predict/reads/book.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';
import { MARKET, marketObjectBytes, scenario } from './queue-fixtures.js';

const CONFIG = '0x' + 'c0'.repeat(32);
const DESK = '0x' + 'd6'.repeat(32);
const V6 = '0x' + '66'.repeat(32);
const O3 = '0x' + '03'.repeat(32);

// A client serving objects by ID: content bytes, or missing.
function objectsClient(
	objects: Record<string, Uint8Array>,
	extra: Partial<ReadClient['core']> = {},
) {
	const asked: string[] = [];
	const client = {
		core: {
			async getObjects(opts: { objectIds: string[] }) {
				asked.push(...opts.objectIds);
				return {
					objects: opts.objectIds.map((id) =>
						objects[normalizeSuiAddress(id)]
							? { objectId: id, content: objects[normalizeSuiAddress(id)] }
							: new Error(`object ${id} not found`),
					),
				};
			},
			...extra,
		},
	} as unknown as ReadClient;
	return { client, asked };
}

describe('readOracleBinding', () => {
	const bindingFieldId = (underlying: number) =>
		normalizeSuiAddress(
			deriveDynamicFieldID(
				CONFIG,
				`${V6}::protocol_config::OracleBindingKey`,
				bcs.u32().serialize(underlying).toBytes(),
			),
		);

	test('decodes the OracleBindingKey field under the version 6 type ID', async () => {
		const field = bcs
			.struct('F', { id: bcs.Address, name: bcs.u32(), value: OracleBinding })
			.serialize({
				id: bindingFieldId(1),
				name: 1,
				value: {
					lazer_feed_id: 1,
					lazer_channel: 3,
					block_scholes_base_asset: 'BTC',
					svi_model: 'model-a',
					svi_decimals: 18,
				},
			})
			.toBytes();
		const { client, asked } = objectsClient({ [bindingFieldId(1)]: field });
		const binding = await readOracleBinding(client, {
			protocolConfigId: CONFIG,
			predictV6: V6,
			propbookUnderlyingId: 1,
		});
		expect(asked).toEqual([bindingFieldId(1)]);
		expect(binding).toEqual({
			propbookUnderlyingId: 1,
			lazerFeedId: 1,
			lazerChannel: 3,
			blockScholesBaseAsset: 'BTC',
			sviModel: 'model-a',
			sviDecimals: 18,
		});
	});

	test('an underlying with no binding reads null', async () => {
		const { client } = objectsClient({});
		expect(
			await readOracleBinding(client, {
				protocolConfigId: CONFIG,
				predictV6: V6,
				propbookUnderlyingId: 2,
			}),
		).toBeNull();
	});
});

describe('readBsTiming', () => {
	const fieldId = normalizeSuiAddress(
		deriveDynamicFieldID(DESK, `${O3}::desk::BsTimingKey`, new Uint8Array([0])),
	);

	test('the defaults while unset', async () => {
		const timing = await readBsTiming(objectsClient({}).client, {
			orderDeskId: DESK,
			predictOrdersV3: O3,
		});
		expect(timing).toEqual({ ...DEFAULT_BS_TIMING, isDefault: true });
		expect(DEFAULT_BS_TIMING).toEqual({ valueLagMs: 500n, sviLagMs: 1_000n, gapWaitMs: 1_000n });
	});

	test('decodes the BsTimingKey field under the orders version 3 type ID', async () => {
		const field = bcs
			.struct('F', { id: bcs.Address, name: bcs.bool(), value: BsTiming })
			.serialize({
				id: fieldId,
				name: false,
				value: { value_lag_ms: 1_000n, svi_lag_ms: 2_000n, gap_wait_ms: 300n },
			})
			.toBytes();
		const timing = await readBsTiming(objectsClient({ [fieldId]: field }).client, {
			orderDeskId: DESK,
			predictOrdersV3: O3,
		});
		expect(timing).toEqual({
			valueLagMs: 1_000n,
			sviLagMs: 2_000n,
			gapWaitMs: 300n,
			isDefault: false,
		});
	});

	test('the slots a commit at τ takes', () => {
		expect(bsSlots(1_000_800n)).toEqual({
			valueMs: 1_000_000n,
			sviMs: 999_000n,
			nextValueMs: 1_000_500n,
			nextSviMs: 1_000_000n,
		});
		expect(
			bsSlots(1_000_800n, { valueLagMs: 1_000n, sviLagMs: 2_000n, gapWaitMs: 0n }),
		).toMatchObject({
			valueMs: 999_500n,
			sviMs: 998_000n,
		});
	});
});

describe('blockScholesPackages', () => {
	test("reads the verifier's original ID from its SignerRegistry's type", async () => {
		const original = '0x' + 'b5'.repeat(32);
		const client = {
			core: {
				async getObject() {
					return { object: { type: `${original}::registry::SignerRegistry` } };
				},
			},
		} as unknown as ReadClient;
		expect(
			await blockScholesPackages(client, { signerRegistryId: '0x2', packageId: '0x3' }),
		).toEqual({
			signerRegistryId: normalizeSuiAddress('0x2'),
			packageId: normalizeSuiAddress('0x3'),
			originalId: original,
		});
		const wrong = {
			core: {
				async getObject() {
					return { object: { type: `${original}::state::State` } };
				},
			},
		} as unknown as ReadClient;
		await expect(
			blockScholesPackages(wrong, { signerRegistryId: '0x2', packageId: '0x3' }),
		).rejects.toThrow(/SignerRegistry/);
	});
});

describe('market reads for the off-chain quotes', () => {
	test('readMarketObject decodes the fee policy, cash and payout tree root', async () => {
		const s = scenario({ cashBalance: 42_000_000n });
		const client = {
			core: {
				async getObject() {
					return { object: { content: marketObjectBytes(s) } };
				},
			},
		} as unknown as ReadClient;
		const m = await readMarketObject(client, MARKET);
		expect(m).toMatchObject({
			marketId: MARKET,
			expiryMs: s.expiryMs,
			tickSizeRaw: s.tickSizeRaw,
			referenceTickRaw: 10_500_000n,
			cashBalance: 42_000_000n,
			inventoryImpactReserve: 0n,
			feeIncentiveBalance: 0n,
			settled: false,
		});
		expect(m.fees.minEntryProbability).toBe(s.minEntryProbability);
	});

	test("readFeeBands finds the market's FeeBandsKey field by module and name", async () => {
		const bandsType = '0x' + '55'.repeat(32) + '::protocol_config::FeeBandsKey';
		let asked: unknown;
		const client = {
			core: {
				async listDynamicFields() {
					return {
						hasNextPage: false,
						cursor: null,
						dynamicFields: [
							{ fieldId: '0x1', name: { type: '0x9::pricing::SviKey', bcs: new Uint8Array([0]) } },
							{ fieldId: '0x2', name: { type: bandsType, bcs: new Uint8Array([0]) } },
						],
					};
				},
				async getDynamicField(opts: unknown) {
					asked = opts;
					return {
						dynamicField: {
							value: {
								bcs: bcs.vector(bcs.u64()).serialize([0n, 150_000_000n, 2_000_000_000n]).toBytes(),
							},
						},
					};
				},
			},
		} as unknown as ReadClient;
		expect(await readFeeBands(client, MARKET)).toEqual([
			{ low: 0n, high: 150_000_000n, multiplier: 2_000_000_000n },
		]);
		expect(asked).toMatchObject({ parentId: MARKET, name: { type: bandsType } });
		const none = {
			core: {
				async listDynamicFields() {
					return { hasNextPage: false, cursor: null, dynamicFields: [] };
				},
			},
		} as unknown as ReadClient;
		expect(await readFeeBands(none, MARKET)).toEqual([]);
	});

	test('readPayoutBoundaries reads every node across pages, in tick order', async () => {
		const node = (tick: bigint, start: bigint, end: bigint) =>
			bcs
				.struct('F', { id: bcs.Address, name: bcs.u64(), value: PayoutNode })
				.serialize({
					id: '0x' + tick.toString(16).padStart(64, '0'),
					name: tick,
					value: {
						height: 1n,
						left: null,
						right: null,
						local_start: start,
						local_end: end,
						snapshot_local_start: 0n,
						snapshot_local_end: 0n,
						snapshot_seq: 0n,
						summary: { start, end, max_payout_prefix_gain: 0n },
					},
				})
				.toBytes();
		const pages = [
			{ ids: ['0xa', '0xb'], hasNextPage: true, cursor: 'c1' },
			{ ids: ['0xc'], hasNextPage: false, cursor: null },
		];
		const contents: Record<string, Uint8Array> = {
			'0xa': node(30n, 1n, 0n),
			'0xb': node(10n, 2n, 0n),
			'0xc': node(20n, 0n, 2n),
		};
		let page = 0;
		const client = {
			core: {
				async listDynamicFields() {
					const p = pages[page++];
					return {
						hasNextPage: p.hasNextPage,
						cursor: p.cursor,
						dynamicFields: p.ids.map((fieldId) => ({
							fieldId,
							name: { type: 'u64', bcs: new Uint8Array() },
						})),
					};
				},
				async getObjects(opts: { objectIds: string[] }) {
					return { objects: opts.objectIds.map((id) => ({ objectId: id, content: contents[id] })) };
				},
			},
		} as unknown as ReadClient;
		expect(await readPayoutBoundaries(client, '0x7')).toEqual([
			{ tick: 10n, localStart: 2n, localEnd: 0n },
			{ tick: 20n, localStart: 0n, localEnd: 2n },
			{ tick: 30n, localStart: 1n, localEnd: 0n },
		]);
	});
});

describe('readMarketWithBook', () => {
	// A market whose version moves on each read listed in `versions`, with an empty payout tree.
	function client(versions: (string | undefined)[]) {
		const s = scenario();
		let reads = 0;
		return {
			reads: () => reads,
			client: {
				core: {
					async getObject() {
						const version = versions[Math.min(reads, versions.length - 1)];
						reads++;
						return { object: { version, content: marketObjectBytes(s) } };
					},
					async listDynamicFields() {
						return { hasNextPage: false, cursor: null, dynamicFields: [] };
					},
				},
			} as unknown as ReadClient,
		};
	}

	test('keeps a read whose market version held across the tree', async () => {
		const c = client(['7', '7']);
		const m = await readMarketWithBook(c.client, MARKET);
		expect(m.version).toBe('7');
		expect(m.boundaries).toEqual([]);
		expect(c.reads()).toBe(2);
	});

	test('reads again when a trade landed in between, and gives up after the attempts', async () => {
		const retried = client(['7', '8', '8', '8']);
		expect((await readMarketWithBook(retried.client, MARKET)).version).toBe('8');
		expect(retried.reads()).toBe(4);
		const busy = client(['1', '2', '3', '4', '5', '6', '7']);
		await expect(readMarketWithBook(busy.client, MARKET, { attempts: 3 })).rejects.toThrow(
			/changed while its payout tree was read/,
		);
	});
});
