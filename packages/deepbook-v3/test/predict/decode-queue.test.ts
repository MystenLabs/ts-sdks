// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the queue event decoders. Fixtures serialize with the GENERATED
// event structs. The queue events are the order-flow companion's (`queue_events`), tagged with its
// original ID; the Predict events the upgrade added are tagged with the delayed-execution origin.
import { describe, expect, test } from 'vitest';
import * as configEvents from '../../src/contracts/deepbook_predict/config_events.js';
import * as vaultEvents from '../../src/contracts/deepbook_predict/vault_events.js';
import * as queueEvents from '../../src/contracts/deepbook_predict_orders/queue_events.js';
import { PredictClient } from '../../src/predict/client.js';
import { TESTNET_CONFIG } from '../../src/predict/config/index.js';
import {
	decodeEnqueues,
	decodeExpiryPnlRealized,
	decodePolicyUpdates,
	decodeQueueEvents,
	decodeQueuedRefunds,
	realizedPnlRaw,
	type DecodableEvent,
} from '../../src/predict/decode.js';
import { PredictInputError } from '../../src/predict/errors.js';
import { reduceOrderEvents } from '../../src/predict/queue.js';
import {
	DELAYED_PKG,
	DESK,
	ORDERS_PKG,
	QUEUE_CFG as cfg,
	policyFields,
	recordFields,
} from './queue-fixtures.js';

const MARKET = '0x' + '11'.repeat(32);
const ACCOUNT = '0x' + '22'.repeat(32);
const KEEPER = '0x' + '99'.repeat(32);
const cash = { market_cash: 900n, required_cash: 500n, waiting_cash_need: 120n };

function event(pkg: string, module: string, name: string, bytes: Uint8Array): DecodableEvent {
	return { eventType: `${pkg}::${module}::${name}`, bcs: bytes };
}

const record = recordFields();
const I64_ZERO = { magnitude: 0n, is_negative: false };
const VOL = {
	pyth_source_id: 1,
	bs_spot: 0n,
	bs_forward: 0n,
	svi_a: I64_ZERO,
	svi_b: 0n,
	svi_rho: I64_ZERO,
	svi_m: I64_ZERO,
	svi_sigma: 0n,
	bs_spot_source_timestamp_ms: 0n,
	bs_forward_source_timestamp_ms: 0n,
	svi_source_timestamp_ms: 0n,
};

const ENQUEUED = (recordId: bigint, overrides: Record<string, unknown> = {}) =>
	event(
		ORDERS_PKG,
		'queue_events',
		'OrderEnqueued',
		queueEvents.OrderEnqueued.serialize({
			expiry_market_id: MARKET,
			record_id: recordId,
			account_id: ACCOUNT,
			kind: 0,
			request: record.request,
			position: { order_id: 0n, root_id: 0n, opened_at_ms: 0n },
			timing: record.timing,
			vol: VOL,
			budget: 6_000_000n,
			order_fee: 20_000n,
			cash_need: 9_900_001n,
			subsidy_bound: 50_000n,
			builder_code_id: null,
			referrer_account_id: null,
			source_record_id: null,
			...cash,
			onchain_timestamp_ms: 1_000_000n,
			...overrides,
		}).toBytes(),
	);

const COMMITTED = event(
	ORDERS_PKG,
	'queue_events',
	'CohortCommitted',
	queueEvents.CohortCommitted.serialize({
		expiry_market_id: MARKET,
		tau_ms: 1_000_800n,
		tick_ms: 1_000_800n,
		first_record_id: 0n,
		last_record_id: 1n,
		// 65_000.123456789, normalized to 1e9.
		spot: 65_000_123_456_789n,
		generation_us: 1_000_799_000n,
		pyth_source_id: 1,
		pyth_channel: 3,
		sender: KEEPER,
		onchain_timestamp_ms: 1_001_000n,
	}).toBytes(),
);

const FILLED = event(
	ORDERS_PKG,
	'queue_events',
	'QueuedOrderFilled',
	queueEvents.QueuedOrderFilled.serialize({
		...cash,
		expiry_market_id: MARKET,
		record_id: 0n,
		account_id: ACCOUNT,
		kind: 0,
		quantity: 10_000_000n,
		amount: 4_100_000n,
		trading_fee: 100_000n,
		builder_fee: 0n,
		referral_fee: 5_000n,
		order_fee: 20_000n,
		subsidy_used: 20_000n,
		inventory_impact: 3_000n,
		tau_ms: 1_000_800n,
		tick_ms: 1_000_800n,
		position: { order_id: 77n, root_id: 77n, opened_at_ms: 1_001_200n },
		sender: KEEPER,
		onchain_timestamp_ms: 1_001_200n,
	}).toBytes(),
);

const REFUNDED = (sender: string, reason: number) =>
	event(
		ORDERS_PKG,
		'queue_events',
		'QueuedOrderRefunded',
		queueEvents.QueuedOrderRefunded.serialize({
			...cash,
			expiry_market_id: MARKET,
			record_id: 1n,
			account_id: ACCOUNT,
			kind: 4,
			reason,
			escrow_returned: 0n,
			order_fee_returned: 20_000n,
			subsidy_returned: 0n,
			position_returned: true,
			sender,
			onchain_timestamp_ms: 1_001_200n,
		}).toBytes(),
	);

const SETTLED = (name: 'OpenRecordSettled' | 'OpenRecordPayoutSkipped', payout: bigint) =>
	event(
		ORDERS_PKG,
		'queue_events',
		name,
		queueEvents.OpenRecordSettled.serialize({
			expiry_market_id: MARKET,
			record_id: 0n,
			account_id: ACCOUNT,
			order_id: 77n,
			payout,
			onchain_timestamp_ms: 2_000_000n,
		}).toBytes(),
	);

describe('queue event decoders', () => {
	test('OrderEnqueued is the trader receipt: record ID, timing, escrow and fee', () => {
		const [r] = decodeEnqueues(cfg, { events: [ENQUEUED(7n)] });
		expect(r).toMatchObject({
			type: 'enqueued',
			marketId: MARKET,
			recordId: 7n,
			kind: 0,
			kindName: 'exact-quantity',
			side: 'mint',
			position: null,
			sourceRecordId: null,
			budget: 6,
			orderFee: 0.02,
			timing: { tauMs: 1_000_800n, deadlineMs: 1_005_800n, pythChannel: 3 },
			cash: { marketCash: 900n, requiredCash: 500n, waitingCashNeed: 120n },
			timestampMs: 1_000_000n,
			raw: { cashNeed: 9_900_001n, subsidyBound: 50_000n },
		});
	});

	test('a sell receipt names its source record and the position it moved', () => {
		const [r] = decodeEnqueues(cfg, {
			events: [
				ENQUEUED(8n, {
					kind: 4,
					source_record_id: 3n,
					position: { order_id: 77n, root_id: 70n, opened_at_ms: 5n },
				}),
			],
		});
		expect(r).toMatchObject({
			side: 'sell',
			kindName: 'redeem-open',
			sourceRecordId: 3n,
			position: { orderId: 77n, rootId: 70n },
		});
	});

	test('every queue event decodes in chain order, tagged', () => {
		const events = decodeQueueEvents(cfg, {
			events: [
				ENQUEUED(0n),
				COMMITTED,
				FILLED,
				REFUNDED(KEEPER, 8),
				SETTLED('OpenRecordSettled', 0n),
			],
		});
		expect(events.map((e) => e.type)).toEqual([
			'enqueued',
			'cohort-committed',
			'filled',
			'refunded',
			'open-record-settled',
		]);
		const commit = events[1];
		expect(commit).toMatchObject({
			lastRecordId: 1n,
			spotRaw: 65_000_123_456_789n,
			pythChannel: 3,
			sender: KEEPER,
			timestampMs: 1_001_000n,
		});
		expect(commit.type === 'cohort-committed' && commit.price).toBeCloseTo(65_000.123456789, 6);
		expect(events[2]).toMatchObject({
			quantity: 10,
			amount: 4.1,
			fees: { order: 0.02, subsidyUsed: 0.02 },
			position: { orderId: 77n },
			timestampMs: 1_001_200n,
		});
		expect(events[4]).toMatchObject({ payout: 0, skipped: false });
	});

	test('a settlement-drain refund carries its real sender and the deadline reason', () => {
		const [drained] = decodeQueuedRefunds(cfg, { events: [REFUNDED(KEEPER, 5)] });
		expect(drained).toMatchObject({ sender: KEEPER, positionReturned: true });
		expect(drained.reason.key).toBe('deadline');
		expect(drained).not.toHaveProperty('bySettlement');
		const [noCash] = decodeQueuedRefunds(cfg, { events: [REFUNDED(KEEPER, 8)] });
		expect(noCash).toMatchObject({ orderFeeReturned: 0.02 });
		expect(noCash.reason.key).toBe('no-cash');
	});

	test('an unknown reason code decodes rather than throwing', () => {
		const [r] = decodeQueuedRefunds(cfg, { events: [REFUNDED(KEEPER, 42)] });
		expect(r.reason).toMatchObject({ key: 'unknown', code: 42 });
	});

	test('a payout the market could not make is reported as skipped', () => {
		const [r] = decodeQueueEvents(cfg, {
			events: [SETTLED('OpenRecordPayoutSkipped', 5_000_000n)],
		});
		expect(r).toMatchObject({ type: 'open-record-payout-skipped', skipped: true, payout: 5 });
	});

	test('only the companion origin matches: Predict, the single-package layout and the latest ID do not', () => {
		const tagged = (eventType: string) => ({ ...ENQUEUED(1n), eventType });
		const others = [
			`${cfg.packages.predictV1}::order_events::OrderEnqueued`,
			`${DELAYED_PKG}::order_events::OrderEnqueued`,
			`${DELAYED_PKG}::queue_events::OrderEnqueued`,
		];
		for (const eventType of others) {
			expect(decodeEnqueues(cfg, { events: [tagged(eventType)] })).toEqual([]);
		}
		// After a companion upgrade, events stay typed by its original ID.
		const upgraded = {
			...cfg,
			packages: {
				...cfg.packages,
				predictOrders: '0x' + '77'.repeat(32),
				predictOrdersV1: ORDERS_PKG,
			},
		};
		expect(decodeEnqueues(upgraded, { events: [ENQUEUED(1n)] })).toHaveLength(1);
		expect(
			decodeEnqueues(upgraded, {
				events: [tagged(`${'0x' + '77'.repeat(32)}::queue_events::OrderEnqueued`)],
			}),
		).toEqual([]);
	});

	test('a cleanup decodes as a queue op', () => {
		const cleaned = event(
			ORDERS_PKG,
			'queue_events',
			'QueuedOrdersCleaned',
			queueEvents.QueuedOrdersCleaned.serialize({
				expiry_market_id: MARKET,
				record_ids: [1n, 2n],
				onchain_timestamp_ms: 3n,
			}).toBytes(),
		);
		expect(decodeQueueEvents(cfg, { events: [cleaned] })).toEqual([
			{ type: 'queued-orders-cleaned', marketId: MARKET, recordIds: [1n, 2n], timestampMs: 3n },
		]);
	});

	test('without the companion recorded the decoders throw instead of guessing', () => {
		expect(() => decodeQueueEvents(TESTNET_CONFIG, { events: [ENQUEUED(1n)] })).toThrow(
			PredictInputError,
		);
		const noOrders = { ...cfg, packages: { ...cfg.packages, predictOrders: undefined } };
		expect(() => decodeQueueEvents(noOrders, { events: [ENQUEUED(1n)] })).toThrow(/predictOrders/);
	});

	test('decoded events fold into order states', () => {
		const states = reduceOrderEvents(
			decodeQueueEvents(cfg, { events: [ENQUEUED(0n), ENQUEUED(1n), COMMITTED, FILLED] }),
		);
		expect(states.get(`${MARKET}:0`)).toMatchObject({ state: 'filled' });
		expect(states.get(`${MARKET}:1`)).toMatchObject({ state: 'priced' });
	});

	test('decoded sell events move ownership from the source record to the sell record', () => {
		const P = { order_id: 77n, root_id: 77n, opened_at_ms: 1_001_200n };
		const states = reduceOrderEvents(
			decodeQueueEvents(cfg, {
				events: [
					ENQUEUED(0n),
					FILLED,
					ENQUEUED(1n, { kind: 4, source_record_id: 0n, position: P }),
					REFUNDED(KEEPER, 8),
				],
			}),
		);
		expect(states.get(`${MARKET}:0`)).toMatchObject({ state: 'closed', position: null });
		expect(states.get(`${MARKET}:1`)).toMatchObject({
			state: 'refunded',
			position: { orderId: 77n },
			sourceRecordId: 0n,
		});
	});

	test('desk policy, flush-operator and order-flow updates decode for the multisig scripts', () => {
		const witness = `${ORDERS_PKG.slice(2)}::order_flow::OrderFlow`;
		const updates = decodePolicyUpdates(cfg, {
			events: [
				event(
					ORDERS_PKG,
					'queue_events',
					'DelayedExecutionPolicyUpdated',
					queueEvents.DelayedExecutionPolicyUpdated.serialize({
						desk_id: DESK,
						policy: policyFields({ order_fee: 30_000n }),
						onchain_timestamp_ms: 9n,
					}).toBytes(),
				),
				// The single-package layout, under Predict's origin, is no longer a policy event.
				event(DELAYED_PKG, 'config_events', 'DelayedExecutionPolicyUpdated', new Uint8Array()),
				event(
					DELAYED_PKG,
					'config_events',
					'FlushOperatorUpdated',
					configEvents.FlushOperatorUpdated.serialize({
						operator: KEEPER,
						added: true,
						onchain_timestamp_ms: 10n,
					}).toBytes(),
				),
				event(
					DELAYED_PKG,
					'config_events',
					'OrderFlowUpdated',
					configEvents.OrderFlowUpdated.serialize({
						order_flow: { name: witness },
						enabled: true,
						onchain_timestamp_ms: 11n,
					}).toBytes(),
				),
			],
		});
		expect(updates).toEqual([
			{
				type: 'policy-updated',
				deskId: DESK,
				policy: expect.objectContaining({ orderFee: 30_000n }),
				timestampMs: 9n,
			},
			{ type: 'flush-operator-updated', operator: KEEPER, added: true, timestampMs: 10n },
			{ type: 'order-flow-updated', orderFlow: witness, enabled: true, timestampMs: 11n },
		]);
	});

	test('the facade decoders route through the client config', () => {
		const pc = new PredictClient({ network: 'testnet', client: {} as never, config: cfg });
		expect(pc.decode.enqueue({ events: [ENQUEUED(4n)] }).recordId).toBe(4n);
		expect(() => pc.decode.enqueue({ events: [] })).toThrow(PredictInputError);
		expect(pc.decode.queuedFills({ events: [FILLED] })).toHaveLength(1);
		expect(pc.decode.cohortCommits({ events: [COMMITTED] })).toHaveLength(1);
	});
});

describe('ExpiryPnlRealized', () => {
	const VAULT = '0x' + '44'.repeat(32);
	const realized = (market: string, inProfit: boolean, amount: bigint, pkg = DELAYED_PKG) =>
		event(
			pkg,
			'vault_events',
			'ExpiryPnlRealized',
			vaultEvents.ExpiryPnlRealized.serialize({
				pool_vault_id: VAULT,
				expiry_market_id: market,
				propbook_underlying_id: 1,
				expiry: 1_800_000_000_000n,
				settlement_price: 65_000_000_000_000n,
				in_profit: inProfit,
				amount,
			}).toBytes(),
		);

	test('decodes the signed change, matched against the delayed-execution origin', () => {
		const [loss] = decodeExpiryPnlRealized(cfg, { events: [realized(MARKET, false, 3_500_000n)] });
		expect(loss).toMatchObject({
			vaultId: VAULT,
			marketId: MARKET,
			propbookUnderlyingId: 1,
			expiryMs: 1_800_000_000_000n,
			settlementPriceRaw: 65_000_000_000_000n,
			inProfit: false,
			amount: 3.5,
			signedAmountRaw: -3_500_000n,
		});
		const v1 = realized(MARKET, true, 1n, cfg.packages.predictV1!);
		expect(decodeExpiryPnlRealized(cfg, { events: [v1] })).toEqual([]);
		expect(() => decodeExpiryPnlRealized(TESTNET_CONFIG, { events: [v1] })).toThrow(
			PredictInputError,
		);
	});

	test('the signed sum over every emission is the gross realized P&L', () => {
		const other = '0x' + '12'.repeat(32);
		// Market A: lifetime loss of 3.5 at its first sweep, then 1.0 returned by a later sweep.
		// Market B: lifetime profit of 2.0. Gross realized: −3.5 + 1.0 + 2.0 = −0.5.
		const receipts = decodeExpiryPnlRealized(cfg, {
			events: [
				realized(MARKET, false, 3_500_000n),
				realized(MARKET, true, 1_000_000n),
				realized(other, true, 2_000_000n),
			],
		});
		expect(realizedPnlRaw(receipts)).toBe(-500_000n);
		expect(realizedPnlRaw([])).toBe(0n);
		const pc = new PredictClient({ network: 'testnet', client: {} as never, config: cfg });
		expect(pc.decode.expiryPnlRealized({ events: [realized(MARKET, true, 7n)] })).toHaveLength(1);
	});
});
