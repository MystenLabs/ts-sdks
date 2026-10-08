// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the queue reads against a mocked simulate, including tuple and
// Option returns, and the watermark read from ProtocolConfig's own BCS.
import { bcs } from '@mysten/sui/bcs';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, test } from 'vitest';
import { ProtocolConfig } from '../../src/contracts/deepbook_predict/protocol_config.js';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import {
	executionModeFor,
	lazerPackages,
	marketQueueState,
	pendingFunds,
	queuedOrders,
	quoteMintForAccount,
	quoteRedeemOpen,
	versionWatermark,
} from '../../src/predict/reads/queue.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';
import { deriveAccountIdFrom } from '../../src/predict/tx/common.js';
import {
	QUEUE_CFG as cfg,
	moveCallTargets,
	queueClient,
	recordFields,
	scenario,
} from './queue-fixtures.js';

const config = toGeneratedConfig(cfg);
const MARKET = '0x' + 'cd'.repeat(32);
const OWNER = '0x' + 'ab'.repeat(32);
const feeds = {
	pythFeed: cfg.underlyings.BTC.pythFeed,
	blockScholesValueStore: cfg.underlyings.BTC.blockScholesValueStore,
	blockScholesSviStore: cfg.underlyings.BTC.blockScholesSviStore,
};

function objectClient(object: { type: string; content: Uint8Array }) {
	return {
		core: {
			async getObject() {
				return { object };
			},
		},
	} as unknown as ReadClient;
}

describe('marketQueueState', () => {
	test('reads the whole queue in one simulate, tuples and options included', async () => {
		const s = scenario({
			heads: [3n, 9n, 1_000_800n, 1_000_600n],
			pending: [4n, 2n],
			stuck: true,
			waitingOrders: 2n,
			available: 25_000_000n,
			records: new Map([[5n, recordFields({ status: 2 })]]),
		});
		const { client, simulated } = queueClient(s);
		const state = await marketQueueState(client, config, MARKET, {
			owner: OWNER,
			quoteCoinType: cfg.quoteCoinType,
			recordIds: [5n, 6n],
		});
		expect(simulated).toHaveLength(1);
		expect(state).toMatchObject({
			spareCash: 500_000_000n,
			minEntryProbability: 10_000_000n,
			stuck: true,
			heads: { resolveHead: 3n, nextId: 9n, lastTauMs: 1_000_800n, lastCommittedTauMs: 1_000_600n },
			pending: { mints: 4n, sells: 2n },
			cohorts: {
				count: 1n,
				oldestUncommittedTauMs: 1_000_800n,
				oldestUncommittedTauAboveCommittedMs: null,
			},
			protocol: {
				policy: { orderFee: 20_000n, pythChannel: 3 },
				feeIncentiveSubsidyRate: 200_000_000n,
				versionWatermark: 4n,
			},
			account: { waitingOrders: 2n, availableRaw: 25_000_000n },
		});
		expect(state.account!.accountId).toBe(deriveAccountIdFrom(config, OWNER));
		expect(state.records[0]!.status).toBe(2);
		expect(state.records[1]).toBeNull();
		const targets = moveCallTargets(simulated[0]);
		expect(targets).toContain('expiry_market::queue_stuck');
		expect(targets).toContain('protocol_config::delayed_execution_policy');
		expect(targets.slice(-5)).toEqual([
			'expiry_market::waiting_orders',
			'account::load_account',
			'account::balance',
			'expiry_market::queued_order',
			'expiry_market::queued_order',
		]);
	});

	test('a policy that was never initialized reads as null', async () => {
		const { client } = queueClient(scenario({ policy: null }));
		const state = await marketQueueState(client, config, MARKET);
		expect(state.protocol.policy).toBeNull();
		expect(state.account).toBeNull();
		expect(state.records).toEqual([]);
	});

	test('owner reads need the quote coin type', async () => {
		const { client } = queueClient(scenario());
		await expect(marketQueueState(client, config, MARKET, { owner: OWNER })).rejects.toThrow();
	});
});

describe('records and quotes', () => {
	test('queuedOrders parses Option<QueuedOrder> per record', async () => {
		const { client } = queueClient(
			scenario({ records: new Map([[1n, recordFields({ status: 1, kind: 2 })]]) }),
		);
		const [one, two] = await queuedOrders(client, config, MARKET, [1n, 2n]);
		expect(one).toMatchObject({ status: 1, kind: 2 });
		expect(two).toBeNull();
		expect(await queuedOrders(client, config, MARKET, [])).toEqual([]);
	});

	test('quoteRedeemOpen loads a live pricer, quotes the record and reads the policy', async () => {
		const { client, simulated } = queueClient(scenario());
		const { quote, policy } = await quoteRedeemOpen(client, config, {
			expiryMarketId: MARKET,
			wrapperId: '0x' + 'ef'.repeat(32),
			recordId: 3n,
			closeQuantityRaw: 2_000_000n,
			...feeds,
		});
		expect(moveCallTargets(simulated[0])).toEqual([
			'expiry_market::load_live_pricer',
			'expiry_market::quote_redeem_open',
			'protocol_config::delayed_execution_policy',
		]);
		expect(quote).toMatchObject({ proceeds: 790_000n, closeQuantity: 2_000_000n });
		expect(policy!.orderFee).toBe(20_000n);
	});

	test('quoteMintForAccount picks the quote for each mint shape', async () => {
		const { client, simulated } = queueClient(scenario());
		const base = {
			expiryMarketId: MARKET,
			wrapperId: '0x' + 'ef'.repeat(32),
			lowerTick: 1n,
			higherTick: 2n,
			...feeds,
		};
		const exact = await quoteMintForAccount(client, config, {
			...base,
			request: { shape: 'exact-quantity', quantityRaw: 10_000_000n },
		});
		expect(exact.quote).toMatchObject({ allInCost: 4_090_000n, penaltyFee: 7_000n });
		expect(exact.policy).toBeNull();
		await quoteMintForAccount(client, config, {
			...base,
			request: { shape: 'exact-cost', maxCostRaw: 5_000_000n, minQuantityRaw: 0n },
			withPolicy: true,
		});
		expect(moveCallTargets(simulated[0])[1]).toBe('expiry_market::quote_mint_for_account');
		expect(moveCallTargets(simulated[1])).toEqual([
			'expiry_market::load_live_pricer',
			'expiry_market::quote_mint_exact_cost_for_account',
			'protocol_config::delayed_execution_policy',
		]);
		// exact_quantity = true carries the quantity in min_quantity and no premium cap.
		const exactCall = simulated[0].getData().commands[1].MoveCall!;
		const exactFlag =
			simulated[0].getData().inputs[(exactCall.arguments[8] as { Input: number }).Input];
		expect(exactFlag.Pure!.bytes).toBe(Buffer.from([1]).toString('base64'));
	});
});

describe('execution mode and the watermark', () => {
	// A zero buffer parses into a valid ProtocolConfig (empty vectors, `none`s, zeros), so the
	// fixture only sets the field under test and the layout stays the generated one.
	const zeroConfig = ProtocolConfig.parse(new Uint8Array(4096));

	test('versionWatermark reads the field from the object BCS', async () => {
		const bytes = ProtocolConfig.serialize({ ...zeroConfig, version_watermark: 4n }).toBytes();
		const client = objectClient({ type: '0x1::protocol_config::ProtocolConfig', content: bytes });
		expect(await versionWatermark(client, cfg.objects.protocolConfig)).toBe(4n);
	});

	test('the mode follows the watermark and whether the config records delayed execution', () => {
		expect(executionModeFor(3n, false)).toBe('immediate');
		expect(executionModeFor(3n, true)).toBe('awaiting-cutover');
		expect(executionModeFor(4n, true)).toBe('delayed');
		expect(executionModeFor(5n, true)).toBe('delayed');
		expect(executionModeFor(4n, false)).toBe('unsupported');
	});
});

describe('wallet and oracle reads', () => {
	test('pendingFunds is the wrapper address balance not yet settled', async () => {
		let asked: unknown;
		const client = {
			core: {
				async getBalance(opts: unknown) {
					asked = opts;
					return {
						balance: { coinType: 'x', balance: '9', coinBalance: '0', addressBalance: '1500000' },
					};
				},
			},
		} as unknown as ReadClient;
		expect(await pendingFunds(client, '0x' + 'ef'.repeat(32), cfg.quoteCoinType)).toBe(1_500_000n);
		expect(asked).toEqual({ owner: '0x' + 'ef'.repeat(32), coinType: cfg.quoteCoinType });
	});

	test('lazerPackages reads the current package from the upgrade cap and the origin from the type', async () => {
		const original = '0x' + '3c'.repeat(32);
		const current = '0x' + '2b'.repeat(32);
		const prefix = bcs
			.struct('State', {
				id: bcs.Address,
				trusted_signers: bcs.vector(
					bcs.struct('TrustedSignerInfo', {
						public_key: bcs.vector(bcs.u8()),
						expires_at: bcs.u64(),
					}),
				),
				upgrade_cap: bcs.struct('UpgradeCap', {
					id: bcs.Address,
					package: bcs.Address,
					version: bcs.u64(),
					policy: bcs.u8(),
				}),
			})
			.serialize({
				id: '0x' + '1a'.repeat(32),
				trusted_signers: [{ public_key: [1, 2, 3], expires_at: 1_800_000_000_000n }],
				upgrade_cap: { id: '0x' + '4d'.repeat(32), package: current, version: 3n, policy: 0 },
			})
			.toBytes();
		// Trailing governance bytes the prefix parse ignores.
		const content = new Uint8Array([...prefix, 9, 9, 9]);
		const client = objectClient({ type: `${original}::state::State`, content });
		expect(await lazerPackages(client, '0x1a')).toEqual({
			stateId: normalizeSuiAddress('0x1a'),
			packageId: current,
			originalId: original,
		});
		await expect(
			lazerPackages(objectClient({ type: `${original}::other::Thing`, content }), '0x1a'),
		).rejects.toThrow('not a Pyth Lazer State');
	});
});
