// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the queue reads against a mocked simulate, including tuple and
// Option returns, and the watermark read from ProtocolConfig's own BCS. The queue reads target
// the order-flow companion's `queue` and `desk` modules; the cash figures stay Predict reads.
import { bcs } from '@mysten/sui/bcs';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, test } from 'vitest';
import { ProtocolConfig } from '../../src/contracts/deepbook_predict/protocol_config.js';
import { toGeneratedConfig, toOrdersConfig } from '../../src/predict/config/generated.js';
import {
	executionModeFor,
	lazerPackages,
	marketQueueState,
	orderFeeAndBalance,
	orderFlowWitnessType,
	pendingFunds,
	queuedOrders,
	quoteMintForAccount,
	quoteRedeemOpen,
	versionWatermark,
} from '../../src/predict/reads/queue.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';
import { deriveAccountIdFrom } from '../../src/predict/tx/common.js';
import {
	DELAYED_PKG,
	DESK,
	MARKET,
	ORDERS_PKG,
	QUEUE,
	QUEUE_CFG as cfg,
	moveCallTargets,
	queueClient,
	recordFields,
	scenario,
} from './queue-fixtures.js';

const config = toOrdersConfig(cfg);
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
			waitingCashNeed: 7_000_000n,
			payoutCompleted: true,
			deskWatermark: 1n,
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
			queueId: QUEUE,
			spareCash: 500_000_000n,
			waitingCashNeed: 7_000_000n,
			payoutTreeNodeCount: 12n,
			minEntryProbability: 10_000_000n,
			stuck: true,
			heads: { resolveHead: 3n, nextId: 9n, lastTauMs: 1_000_800n, lastCommittedTauMs: 1_000_600n },
			pending: { mints: 4n, sells: 2n },
			cohorts: {
				count: 1n,
				oldestUncommittedTauMs: 1_000_800n,
				oldestUncommittedTauAboveCommittedMs: null,
			},
			payout: { cursor: 0n, nextId: 9n, completed: true },
			desk: { id: DESK, policy: { orderFee: 20_000n, pythChannel: 3 }, versionWatermark: 1n },
			protocol: {
				feeIncentiveSubsidyRate: 200_000_000n,
				versionWatermark: 4n,
				orderFlowEnabled: true,
			},
			account: { waitingOrders: 2n, availableRaw: 25_000_000n },
		});
		expect(state.account!.accountId).toBe(deriveAccountIdFrom(config, OWNER));
		expect(state.records[0]!.status).toBe(2);
		expect(state.records[1]).toBeNull();
		const targets = moveCallTargets(simulated[0]);
		expect(targets).toContain('expiry_market::order_flow_state');
		expect(targets).toContain('queue::queue_stuck');
		expect(targets).toContain('desk::policy');
		expect(targets.slice(-5)).toEqual([
			'queue::waiting_orders',
			'account::load_account',
			'account::balance',
			'queue::order',
			'queue::order',
		]);
		// The cash and gate reads go to Predict's call target (the upgrade).
		for (const c of simulated[0].getData().commands) {
			if (c.MoveCall!.module === 'expiry_market' || c.MoveCall!.module === 'protocol_config') {
				expect(normalizeSuiAddress(c.MoveCall!.package)).toBe(DELAYED_PKG);
			}
		}
		// The queue reads go to the companion at the derived queue.
		const data = simulated[0].getData();
		const queueCalls = data.commands.filter((c) => c.MoveCall?.module === 'queue');
		for (const c of queueCalls) {
			expect(normalizeSuiAddress(c.MoveCall!.package)).toBe(ORDERS_PKG);
			const first = c.MoveCall!.arguments[0] as { Input: number };
			expect(data.inputs[first.Input].UnresolvedObject?.objectId).toBe(QUEUE);
		}
		const stuck = data.commands.find((c) => c.MoveCall?.function === 'queue_stuck')!.MoveCall!;
		const desk = stuck.arguments[1] as { Input: number };
		expect(data.inputs[desk.Input].UnresolvedObject?.objectId).toBe(DESK);
		// Predict's order-flow allowlist is asked about the companion's witness type.
		const allow = data.commands.find((c) => c.MoveCall?.function === 'is_order_flow')!.MoveCall!;
		expect(allow.module).toBe('protocol_config');
		expect(allow.typeArguments).toEqual([`${ORDERS_PKG}::order_flow::OrderFlow`]);
		expect(orderFlowWitnessType(config)).toBe(`${ORDERS_PKG}::order_flow::OrderFlow`);
	});

	test('spare cash is cash above required cash, and 0 below it', async () => {
		const { client } = queueClient(
			scenario({ cashBalance: 400_000_000n, requiredCash: 500_000_000n, orderFlowEnabled: false }),
		);
		const state = await marketQueueState(client, config, MARKET);
		expect(state.spareCash).toBe(0n);
		expect(state.protocol.orderFlowEnabled).toBe(false);
		expect(state.account).toBeNull();
		expect(state.records).toEqual([]);
	});

	test('an explicit queueId overrides the derived one', async () => {
		const { client, simulated } = queueClient(scenario());
		const other = '0x' + '99'.repeat(32);
		const state = await marketQueueState(client, config, MARKET, { queueId: other });
		expect(state.queueId).toBe(other);
		const data = simulated[0].getData();
		const call = data.commands.find((c) => c.MoveCall?.function === 'queue_heads')!.MoveCall!;
		expect(
			data.inputs[(call.arguments[0] as { Input: number }).Input].UnresolvedObject?.objectId,
		).toBe(other);
	});

	test('owner reads need the quote coin type', async () => {
		const { client } = queueClient(scenario());
		await expect(marketQueueState(client, config, MARKET, { owner: OWNER })).rejects.toThrow();
	});
});

describe('records and quotes', () => {
	test('queuedOrders parses Option<OrderView> per record from queue::order', async () => {
		const { client, simulated } = queueClient(
			scenario({
				records: new Map([[1n, recordFields({ status: 1, kind: 2, funds: 6_000_000n })]]),
			}),
		);
		const [one, two] = await queuedOrders(client, config, { expiryMarketId: MARKET }, [1n, 2n]);
		expect(one).toMatchObject({ status: 1, kind: 2, receipt_stage: 1, funds: 6_000_000n });
		expect(two).toBeNull();
		expect(moveCallTargets(simulated[0])).toEqual(['queue::order', 'queue::order']);
		expect(await queuedOrders(client, config, { expiryMarketId: MARKET }, [])).toEqual([]);
	});

	test('quoteRedeemOpen loads a live pricer, quotes the record on the queue and reads the desk', async () => {
		const { client, simulated } = queueClient(
			scenario({ records: new Map([[3n, recordFields({ status: 2 })]]) }),
		);
		const { quote, policy } = await quoteRedeemOpen(client, config, {
			expiryMarketId: MARKET,
			wrapperId: '0x' + 'ef'.repeat(32),
			recordId: 3n,
			closeQuantityRaw: 2_000_000n,
			...feeds,
		});
		expect(moveCallTargets(simulated[0])).toEqual([
			'expiry_market::load_live_pricer',
			'queue::quote_redeem_open',
			'desk::policy',
		]);
		// queue, market, wrapper, pricer, record_id, close_quantity, clock: no ProtocolConfig.
		const data = simulated[0].getData();
		const q = data.commands[1].MoveCall!;
		expect(
			data.inputs[(q.arguments[0] as { Input: number }).Input].UnresolvedObject?.objectId,
		).toBe(QUEUE);
		expect(q.arguments[3]).toEqual({ $kind: 'Result', Result: 0 });
		expect(q.arguments).toHaveLength(7);
		expect(quote).toMatchObject({ proceeds: 790_000n, closeQuantity: 2_000_000n });
		expect(policy.orderFee).toBe(20_000n);
	});

	test('orderFeeAndBalance reads the desk policy and the balance in one simulate', async () => {
		const { client, simulated } = queueClient(scenario({ available: 3_000_000n }));
		const { policy, availableRaw } = await orderFeeAndBalance(
			client,
			config,
			'0x' + 'ab'.repeat(32),
			cfg.quoteCoinType,
		);
		expect(moveCallTargets(simulated[0])).toEqual([
			'desk::policy',
			'account::load_account',
			'account::balance',
		]);
		expect(policy.orderFee).toBe(20_000n);
		expect(availableRaw).toBe(3_000_000n);
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
		const exact = await quoteMintForAccount(client, toGeneratedConfig(cfg), {
			...base,
			request: { shape: 'exact-quantity', quantityRaw: 10_000_000n },
		});
		expect(exact.quote).toMatchObject({ allInCost: 4_090_000n, penaltyFee: 7_000n });
		expect(exact.policy).toBeNull();
		const cost = await quoteMintForAccount(client, toGeneratedConfig(cfg), {
			...base,
			request: { shape: 'exact-cost', maxCostRaw: 5_000_000n, minQuantityRaw: 0n },
			ordersConfig: config,
		});
		expect(cost.policy!.orderFee).toBe(20_000n);
		expect(moveCallTargets(simulated[0])[1]).toBe('expiry_market::quote_mint_for_account');
		expect(moveCallTargets(simulated[1])).toEqual([
			'expiry_market::load_live_pricer',
			'expiry_market::quote_mint_exact_cost_for_account',
			'desk::policy',
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
		// A watermark above the Predict code this SDK calls retires it.
		expect(executionModeFor(5n, true)).toBe('retired');
		expect(executionModeFor(4n, false)).toBe('unsupported');
		// The Predict upgrade recorded without the order-flow package.
		expect(executionModeFor(3n, false, true)).toBe('awaiting-cutover');
		expect(executionModeFor(4n, false, true)).toBe('unsupported');
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
