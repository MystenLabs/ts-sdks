// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the queue event decoders. Fixtures serialize with the GENERATED
// event structs, tagged with the delayed-execution package as their defining package.
import { describe, expect, test } from 'vitest';
import * as configEvents from '../../src/contracts/deepbook_predict/config_events.js';
import * as orderEvents from '../../src/contracts/deepbook_predict/order_events.js';
import * as vaultEvents from '../../src/contracts/deepbook_predict/vault_events.js';
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
	QUEUE_CFG as cfg,
	ZERO_ADDRESS,
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

const ENQUEUED = (recordId: bigint, overrides: Record<string, unknown> = {}) =>
	event(
		DELAYED_PKG,
		'order_events',
		'OrderEnqueued',
		orderEvents.OrderEnqueued.serialize({
			expiry_market_id: MARKET,
			record_id: recordId,
			account_id: ACCOUNT,
			kind: 0,
			request: record.request,
			position: { order_id: 0n, root_id: 0n, opened_at_ms: 0n },
			timing: record.timing,
			vol: record.vol,
			budget: 6_000_000n,
			order_fee: 20_000n,
			cash_need: 9_900_001n,
			subsidy_bound: 50_000n,
			builder_code_id: null,
			referrer_account_id: null,
			source_record_id: null,
			...cash,
			...overrides,
		}).toBytes(),
	);

const COMMITTED = event(
	DELAYED_PKG,
	'order_events',
	'CohortCommitted',
	orderEvents.CohortCommitted.serialize({
		expiry_market_id: MARKET,
		tau_ms: 1_000_800n,
		tick_ms: 1_000_800n,
		first_record_id: 0n,
		last_record_id: 1n,
		price_magnitude: 6_500_012_345_678n,
		price_is_negative: false,
		exponent_magnitude: 8,
		exponent_is_negative: true,
		generation_us: 1_000_799_000n,
		pyth_source_id: 1,
		pyth_channel: 3,
		sender: KEEPER,
		onchain_timestamp_ms: 1_001_000n,
	}).toBytes(),
);

const FILLED = event(
	DELAYED_PKG,
	'order_events',
	'QueuedOrderFilled',
	orderEvents.QueuedOrderFilled.serialize({
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
		DELAYED_PKG,
		'order_events',
		'QueuedOrderRefunded',
		orderEvents.QueuedOrderRefunded.serialize({
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
		DELAYED_PKG,
		'order_events',
		name,
		orderEvents.OpenRecordSettled.serialize({
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
		expect(commit).toMatchObject({ lastRecordId: 1n, exponent: -8, sender: KEEPER });
		expect(commit.type === 'cohort-committed' && commit.price).toBeCloseTo(65_000.12345678, 6);
		expect(events[2]).toMatchObject({
			quantity: 10,
			amount: 4.1,
			fees: { order: 0.02, subsidyUsed: 0.02 },
			position: { orderId: 77n },
			timestampMs: 1_001_200n,
		});
		expect(events[4]).toMatchObject({ payout: 0, skipped: false });
	});

	test('a refund from try_settle (sender 0x0) is flagged bySettlement', () => {
		const [bySettle] = decodeQueuedRefunds(cfg, { events: [REFUNDED(ZERO_ADDRESS, 5)] });
		expect(bySettle).toMatchObject({ bySettlement: true, positionReturned: true });
		expect(bySettle.reason.key).toBe('deadline');
		const [byKeeper] = decodeQueuedRefunds(cfg, { events: [REFUNDED(KEEPER, 8)] });
		expect(byKeeper).toMatchObject({ bySettlement: false, orderFeeReturned: 0.02 });
		expect(byKeeper.reason.key).toBe('no-cash');
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

	test('events tagged with the v1 origin are not queue events', () => {
		const v1 = {
			...ENQUEUED(1n),
			eventType: `${cfg.packages.predictV1}::order_events::OrderEnqueued`,
		};
		expect(decodeEnqueues(cfg, { events: [v1] })).toEqual([]);
	});

	test('without a delayed-execution record the decoders throw instead of guessing', () => {
		expect(() => decodeQueueEvents(TESTNET_CONFIG, { events: [ENQUEUED(1n)] })).toThrow(
			PredictInputError,
		);
	});

	test('decoded events fold into order states', () => {
		const states = reduceOrderEvents(
			decodeQueueEvents(cfg, { events: [ENQUEUED(0n), ENQUEUED(1n), COMMITTED, FILLED] }),
		);
		expect(states.get(`${MARKET}:0`)).toMatchObject({ state: 'filled' });
		expect(states.get(`${MARKET}:1`)).toMatchObject({ state: 'priced' });
	});

	test('policy and flush-operator updates decode for the multisig scripts', () => {
		const updates = decodePolicyUpdates(cfg, {
			events: [
				event(
					DELAYED_PKG,
					'config_events',
					'DelayedExecutionPolicyUpdated',
					configEvents.DelayedExecutionPolicyUpdated.serialize({
						policy: policyFields({ order_fee: 30_000n }),
						onchain_timestamp_ms: 9n,
					}).toBytes(),
				),
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
			],
		});
		expect(updates).toMatchObject([
			{ type: 'policy-updated', policy: { orderFee: 30_000n }, timestampMs: 9n },
			{ type: 'flush-operator-updated', operator: KEEPER, added: true },
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
