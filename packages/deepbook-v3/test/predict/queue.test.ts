// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the pure queue helpers. The cash-need vectors are copied from the
// Move unit tests (`packages/predict/tests/order_queue/cash_need_tests.move`), so a rounding
// drift from the contract fails here.
import { describe, expect, test } from 'vitest';
import { PredictInputError } from '../../src/predict/errors.js';
import * as queue from '../../src/predict/queue.js';
import { policyFromBcs } from '../../src/predict/queue.js';
import type { QueueEvent } from '../../src/predict/decode.js';
import { policyFields, recordFields } from './queue-fixtures.js';

const P_MIN_ONE_PERCENT = 10_000_000n;
const P_MIN_THIRTY_PERCENT = 300_000_000n;
const P_HALF = 500_000_000n;
const P_MAX = 999_999_999n;
const LAMBDA_DEFAULT = 310_000_000n;
const LAMBDA_ONE = 1_000_000_000n;
const ONE_USDC = 1_000_000n;

describe('cash need matches the Move unit-test vectors', () => {
	test('exact quantity: ceil(q · (1 − p_min)) + 1', () => {
		expect(queue.cashNeedExactQuantity(ONE_USDC, P_MIN_ONE_PERCENT)).toBe(990_001n);
		expect(queue.cashNeedExactQuantity(ONE_USDC + 1n, P_MIN_ONE_PERCENT)).toBe(990_002n);
		expect(queue.cashNeedExactQuantity(3n, P_HALF)).toBe(3n);
		expect(queue.cashNeedExactQuantity(0n, P_MIN_ONE_PERCENT)).toBe(1n);
		expect(queue.cashNeedExactQuantity(ONE_USDC, P_MAX)).toBe(2n);
	});

	test('budget: ceil((b + 1) · (1 / p_min − 1)) + 1, rounded in one mul_div_up', () => {
		expect(queue.cashNeedBudget(ONE_USDC, P_MIN_ONE_PERCENT)).toBe(99_000_100n);
		expect(queue.cashNeedBudget(999n, P_MIN_THIRTY_PERCENT)).toBe(2_335n);
		expect(queue.cashNeedBudget(0n, P_MIN_ONE_PERCENT)).toBe(100n);
		expect(queue.cashNeedBudget(0n, P_MAX)).toBe(2n);
	});

	test('sell: ceil(q · (1 − λ)) + 1', () => {
		expect(queue.cashNeedSell(ONE_USDC, LAMBDA_DEFAULT)).toBe(690_001n);
		expect(queue.cashNeedSell(ONE_USDC + 1n, LAMBDA_DEFAULT)).toBe(690_002n);
		expect(queue.cashNeedSell(ONE_USDC, LAMBDA_ONE)).toBe(1n);
	});

	test('a zero p_min throws, as the Move division aborts', () => {
		expect(() => queue.cashNeedBudget(ONE_USDC, 0n)).toThrow(PredictInputError);
	});

	test('out-of-domain inputs throw instead of computing garbage', () => {
		expect(() => queue.cashNeedExactQuantity(-1n, P_HALF)).toThrow(PredictInputError);
		expect(() => queue.cashNeedSell(ONE_USDC, LAMBDA_ONE + 1n)).toThrow(PredictInputError);
	});

	test('mintCashNeed picks the formula the contract picks for each kind', () => {
		const p = P_MIN_ONE_PERCENT;
		expect(
			queue.mintCashNeed({
				kind: queue.ORDER_KIND.EXACT_QUANTITY,
				budgetRaw: 1n,
				quantityRaw: ONE_USDC,
				minEntryProbability: p,
			}),
		).toBe(990_001n);
		// Exact amount uses min(max_premium, budget): a large max_cost doesn't inflate the need.
		expect(
			queue.mintCashNeed({
				kind: queue.ORDER_KIND.EXACT_AMOUNT,
				budgetRaw: 50n * ONE_USDC,
				maxPremiumRaw: ONE_USDC,
				minEntryProbability: p,
			}),
		).toBe(queue.cashNeedBudget(ONE_USDC, p));
		expect(
			queue.mintCashNeed({
				kind: queue.ORDER_KIND.EXACT_COST,
				budgetRaw: ONE_USDC,
				minEntryProbability: p,
			}),
		).toBe(99_000_100n);
		expect(() =>
			queue.mintCashNeed({
				kind: queue.ORDER_KIND.REDEEM_OPEN,
				budgetRaw: 0n,
				minEntryProbability: p,
			}),
		).toThrow(PredictInputError);
	});
});

describe('fee and budget rules', () => {
	test('a mint needs available > fee, a sell available ≥ fee', () => {
		expect(queue.feeCovered('mint', 20_000n, 20_000n)).toBe(false);
		expect(queue.feeCovered('mint', 20_001n, 20_000n)).toBe(true);
		expect(queue.feeCovered('sell', 20_000n, 20_000n)).toBe(true);
		expect(queue.feeCovered('sell', 19_999n, 20_000n)).toBe(false);
	});

	test('the escrowed budget is min(max_cost, available − fee), and at most the quantity', () => {
		const base = { maxCostRaw: 6_000_000n, availableRaw: 5_020_000n, orderFeeRaw: 20_000n };
		expect(queue.mintBudget({ ...base, kind: queue.ORDER_KIND.EXACT_COST })).toBe(5_000_000n);
		expect(
			queue.mintBudget({ ...base, kind: queue.ORDER_KIND.EXACT_QUANTITY, quantityRaw: 3_000_000n }),
		).toBe(3_000_000n);
		expect(
			queue.mintBudget({ ...base, availableRaw: 20_000n, kind: queue.ORDER_KIND.EXACT_COST }),
		).toBe(null);
		expect(() => queue.mintBudget({ ...base, kind: queue.ORDER_KIND.EXACT_QUANTITY })).toThrow(
			PredictInputError,
		);
	});

	test('sellCashCheck flags a sell whose need is above spare cash', () => {
		expect(queue.sellCashCheck(ONE_USDC, 690_001n, LAMBDA_DEFAULT)).toEqual({
			needRaw: 690_001n,
			short: false,
		});
		expect(queue.sellCashCheck(ONE_USDC, 690_000n, LAMBDA_DEFAULT).short).toBe(true);
	});
});

describe('maxMintNow', () => {
	const lot = 10_000n;
	const spares = [0n, 1n, 2n, 3n, 999n, 1_000_000n, 123_456_789n, 10_000_000_000n];
	const probabilities = [1n, 10_000_000n, 300_000_000n, 500_000_000n, 990_000_000n];

	test('exact quantity: need(max) ≤ S < need(max + lot), on the lot grid', () => {
		for (const spare of spares) {
			for (const p of probabilities) {
				const r = queue.maxMintNow({
					shape: 'exact-quantity',
					spareCashRaw: spare,
					minEntryProbability: p,
					lotSize: lot,
					headroomBps: 0n,
				});
				const q = r.maxRaw!;
				expect(q % lot).toBe(0n);
				if (q > 0n) expect(queue.cashNeedExactQuantity(q, p) <= spare).toBe(true);
				expect(queue.cashNeedExactQuantity(q + lot, p) > spare).toBe(true);
			}
		}
	});

	test('budget: need(max) ≤ S < need(max + 1)', () => {
		for (const spare of spares) {
			for (const p of probabilities) {
				const r = queue.maxMintNow({
					shape: 'budget',
					spareCashRaw: spare,
					minEntryProbability: p,
					headroomBps: 0n,
				});
				const b = r.maxRaw!;
				if (b > 0n) expect(queue.cashNeedBudget(b, p) <= spare).toBe(true);
				expect(queue.cashNeedBudget(b + 1n, p) > spare).toBe(true);
			}
		}
	});

	test('the headroom leaves margin below spare cash', () => {
		const tight = queue.maxMintNow({
			shape: 'budget',
			spareCashRaw: 1_000_000n,
			minEntryProbability: P_HALF,
			headroomBps: 0n,
		});
		const margin = queue.maxMintNow({
			shape: 'budget',
			spareCashRaw: 1_000_000n,
			minEntryProbability: P_HALF,
		});
		expect(margin.maxRaw! < tight.maxRaw!).toBe(true);
	});

	test('the balance binds a budget at available − fee', () => {
		const r = queue.maxMintNow({
			shape: 'budget',
			spareCashRaw: 10_000_000_000n,
			minEntryProbability: P_HALF,
			availableRaw: 5_020_000n,
			orderFeeRaw: 20_000n,
		});
		expect(r).toMatchObject({ maxRaw: 5_000_000n, limitedBy: 'balance' });
	});

	test('p_min ≥ 1 means cash never binds; p_min = 0 takes no budget mints', () => {
		expect(
			queue.maxMintNow({
				shape: 'exact-quantity',
				spareCashRaw: 5n,
				minEntryProbability: 1_000_000_000n,
			}),
		).toMatchObject({ maxRaw: null, limitedBy: 'none' });
		expect(
			queue.maxMintNow({ shape: 'budget', spareCashRaw: 10n ** 12n, minEntryProbability: 0n }),
		).toMatchObject({ maxRaw: 0n, limitedBy: 'cash' });
	});
});

describe('timing preview', () => {
	const policy = { delayMs: 800n, stallTimeoutMs: 5_000n, pythChannel: 3 };
	const heads = { resolveHead: 0n, nextId: 0n, lastTauMs: 0n, lastCommittedTauMs: 0n };
	const expiryMs = 10_000_000n;

	test('τ is the channel tick at or before now + delay', () => {
		const t = queue.previewTiming({
			nowMs: 1_000_150n,
			policy,
			heads,
			expiryMs,
			noTradeWindowMs: 0n,
		});
		expect(t.tickMs).toBe(200n);
		expect(t.tauMs).toBe(1_000_800n);
		expect(t.deadlineMs).toBe(1_005_800n);
		const fast = queue.previewTiming({
			nowMs: 1_000_160n,
			policy: { ...policy, pythChannel: 2 },
			heads,
			expiryMs,
			noTradeWindowMs: 0n,
		});
		expect(fast.tauMs).toBe(1_000_950n);
	});

	test('τ never goes below the last τ and is pushed past the last committed τ', () => {
		const later = queue.previewTiming({
			nowMs: 1_000_000n,
			policy,
			heads: { ...heads, nextId: 3n, lastTauMs: 1_001_000n },
			expiryMs,
			noTradeWindowMs: 0n,
		});
		expect(later.tauMs).toBe(1_001_000n);
		const pushed = queue.previewTiming({
			nowMs: 1_000_000n,
			policy,
			heads: { ...heads, nextId: 3n, lastTauMs: 1_000_800n, lastCommittedTauMs: 1_000_800n },
			expiryMs,
			noTradeWindowMs: 0n,
		});
		expect(pushed.tauMs).toBe(1_001_000n);
	});

	test('a channel switch moves τ strictly past the last τ', () => {
		const t = queue.previewTiming({
			nowMs: 1_000_000n,
			policy: { ...policy, pythChannel: 2 },
			heads: { ...heads, nextId: 1n, lastTauMs: 1_000_800n },
			expiryMs,
			noTradeWindowMs: 0n,
			lastChannel: 3,
		});
		expect(t.tauMs).toBe(1_000_850n);
	});

	test('the cutoff is expiry − max(no-trade window, stall + 5 s)', () => {
		expect(queue.orderCutoffMs(100_000n, policy, 10_000n)).toBe(90_000n);
		expect(queue.orderCutoffMs(100_000n, policy, 2_000n)).toBe(90_000n);
		expect(queue.orderCutoffMs(100_000n, policy, 30_000n)).toBe(70_000n);
		expect(queue.orderCutoffMs(5_000n, policy, 0n)).toBe(0n);
		const late = queue.previewTiming({
			nowMs: 89_500n,
			policy,
			heads,
			expiryMs: 100_000n,
			noTradeWindowMs: 10_000n,
		});
		expect(late.beforeCutoff).toBe(false);
	});

	test('channelTickMs refuses an unsupported channel', () => {
		expect(queue.channelTickMs(2)).toBe(50n);
		expect(() => queue.channelTickMs(1)).toThrow(PredictInputError);
	});
});

describe('codes tolerate unknown values', () => {
	test('reason texts and fee treatment', () => {
		expect(queue.refundReason(1)).toMatchObject({ key: 'limits', feeKept: true, live: true });
		expect(queue.refundReason(2)).toMatchObject({ key: 'admission', feeKept: true });
		expect(queue.refundReason(3)).toMatchObject({ key: 'no-price', feeKept: false, live: false });
		expect(queue.refundReason(6)).toMatchObject({ key: 'freeze', live: false });
		expect(queue.refundReason(8)).toMatchObject({
			key: 'no-cash',
			feeKept: false,
			text: "The market couldn't pay right now. Refunded in full.",
		});
		for (const code of [4, 5, 7, 8]) expect(queue.refundReason(code).feeKept).toBe(false);
		expect(queue.refundReason(42)).toEqual({
			code: 42,
			key: 'unknown',
			text: 'Refunded (code 42).',
			feeKept: null,
			live: false,
		});
	});

	test('status and kind names', () => {
		expect(queue.orderStatusName(5)).toBe('refund-due');
		expect(queue.orderStatusName(9)).toBe('unknown');
		expect(queue.orderKindName(4)).toBe('redeem-open');
		expect(queue.orderKindName(7)).toBe('unknown');
		expect(queue.isMintKind(2)).toBe(true);
		expect(queue.isSellKind(4)).toBe(true);
		expect(queue.isSellKind(1)).toBe(false);
	});

	test('the policy maps from the generated layout', () => {
		expect(policyFromBcs(policyFields())).toMatchObject({
			delayMs: 800n,
			pythChannel: 3,
			orderFee: 20_000n,
			perAccountCap: 5n,
		});
	});
});

describe('orderView', () => {
	const tau = 1_000_800n;
	const deadline = 1_005_800n;

	test('Pending: placed, awaiting the price once τ has passed', () => {
		const before = queue.orderView(recordFields({ status: 0 }), tau - 1n);
		expect(before).toMatchObject({ state: 'placed', awaitingPrice: false, side: 'mint' });
		const after = queue.orderView(recordFields({ status: 0 }), tau);
		expect(after).toMatchObject({ state: 'placed', awaitingPrice: true, autoRefundByMs: deadline });
	});

	test('the refund button appears 5 s after the deadline', () => {
		expect(queue.orderView(recordFields(), deadline + 4_999n)).toMatchObject({
			canRequestRefund: false,
		});
		expect(queue.orderView(recordFields(), deadline + 5_000n)).toMatchObject({
			canRequestRefund: true,
		});
	});

	test('Committed: priced, with the committed price and a countdown', () => {
		const v = queue.orderView(
			recordFields({ status: 1, price: { spot: 65_000_000_000_000n, tick_ms: tau } }),
			tau + 300n,
		);
		expect(v).toMatchObject({
			state: 'priced',
			priceRaw: 65_000_000_000_000n,
			tickMs: tau,
			msToDeadline: deadline - tau - 300n,
		});
	});

	test('RefundDue: refunding with its stored reason', () => {
		const v = queue.orderView(recordFields({ status: 5, result: { reason: 7 } }), tau);
		expect(v).toMatchObject({ state: 'refunding' });
		expect(v.state === 'refunding' && v.reason.key).toBe('admin');
	});

	test('Open mint: filled, holding a sellable position until the cutoff', () => {
		const record = recordFields({
			status: 2,
			position: { order_id: 77n, root_id: 77n, opened_at_ms: tau },
			result: { quantity: 10_000_000n, amount: 4_100_000n, finished_at_ms: tau + 500n },
		});
		expect(queue.orderView(record, tau + 600n)).toMatchObject({
			state: 'filled',
			quantityRaw: 10_000_000n,
			position: { orderId: 77n },
			sellable: true,
		});
		expect(queue.orderView(record, 2_000_000n)).toMatchObject({ sellable: false });
		expect(queue.orderView(record, 0n, { cutoffMs: 0n })).toMatchObject({ sellable: false });
	});

	test('Open sell with a reason: refunded, the position back as an Open record', () => {
		const v = queue.orderView(
			recordFields({
				status: 2,
				kind: 4,
				position: { order_id: 77n },
				result: { reason: 8, finished_at_ms: tau + 500n },
			}),
			tau + 600n,
		);
		expect(v).toMatchObject({ state: 'refunded', positionBackAsOpenRecord: true, sellable: true });
		expect(v.state === 'refunded' && v.reason.key).toBe('no-cash');
	});

	test('Open sell without a reason: a partial fill holding the remainder', () => {
		const v = queue.orderView(
			recordFields({
				status: 2,
				kind: 4,
				position: { order_id: 78n },
				result: { quantity: 2_000_000n, amount: 790_000n },
			}),
			tau,
		);
		expect(v).toMatchObject({ state: 'filled', position: { orderId: 78n }, side: 'sell' });
	});

	test('Refunded mint and Closed records', () => {
		expect(queue.orderView(recordFields({ status: 3, result: { reason: 5 } }), tau)).toMatchObject({
			state: 'refunded',
			positionBackAsOpenRecord: false,
		});
		expect(
			queue.orderView(recordFields({ status: 4, kind: 4, result: { quantity: 5n } }), tau),
		).toMatchObject({ state: 'filled', sellable: false });
		expect(queue.orderView(recordFields({ status: 4, kind: 0 }), tau)).toMatchObject({
			state: 'closed',
		});
	});

	test('unknown status or kind codes map to unknown', () => {
		expect(queue.orderView(recordFields({ status: 9 }), tau)).toMatchObject({ state: 'unknown' });
		expect(queue.orderView(recordFields({ kind: 9 }), tau)).toMatchObject({
			state: 'unknown',
			kindName: 'unknown',
		});
	});
});

describe('reduceOrderEvents', () => {
	const market = '0x' + '11'.repeat(32);
	const timing = {
		placedAtMs: 0n,
		earliestPriceMs: 800n,
		tauMs: 800n,
		deadlineMs: 5_800n,
		cutoffMs: 9_000n,
		pythChannel: 3,
	};
	const enqueued = (recordId: bigint) =>
		({ type: 'enqueued', marketId: market, recordId, kind: 0, timing }) as unknown as QueueEvent;

	test('placed → priced at the cohort commit → filled or refunded', () => {
		const events = [
			enqueued(0n),
			enqueued(1n),
			enqueued(5n),
			{
				type: 'cohort-committed',
				marketId: market,
				firstRecordId: 0n,
				lastRecordId: 1n,
				price: 65_000.5,
				tickMs: 800n,
			},
			{
				type: 'filled',
				marketId: market,
				recordId: 0n,
				kind: 0,
				tickMs: 800n,
				position: { orderId: 9n, rootId: 9n, openedAtMs: 900n },
			},
			{
				type: 'refunded',
				marketId: market,
				recordId: 1n,
				kind: 0,
				reason: queue.refundReason(1),
				bySettlement: false,
			},
		] as unknown as QueueEvent[];
		const states = queue.reduceOrderEvents(events);
		expect(states.get(`${market}:0`)).toMatchObject({
			state: 'filled',
			price: 65_000.5,
			position: { orderId: 9n },
		});
		expect(states.get(`${market}:1`)).toMatchObject({ state: 'refunded', price: 65_000.5 });
		expect(states.get(`${market}:5`)).toMatchObject({ state: 'placed', price: null, tauMs: 800n });
	});

	test('settlement events: paid records settle, skipped ones stay unpaid', () => {
		const events = [
			{ type: 'open-record-settled', marketId: market, recordId: 2n, raw: { payout: 0n } },
			{ type: 'open-record-payout-skipped', marketId: market, recordId: 3n },
			{
				type: 'refunded',
				marketId: market,
				recordId: 4n,
				kind: 1,
				reason: queue.refundReason(5),
				bySettlement: true,
			},
		] as unknown as QueueEvent[];
		const states = queue.reduceOrderEvents(events);
		expect(states.get(`${market}:2`)).toMatchObject({ state: 'settled', payoutRaw: 0n });
		expect(states.get(`${market}:3`)).toMatchObject({ payoutSkipped: true });
		expect(states.get(`${market}:4`)).toMatchObject({ state: 'refunded', bySettlement: true });
	});
});

describe('slippageBand', () => {
	const base = { probability: 0.5, timeToExpiryMs: 3_600_000, delayMs: 800, tickMs: 200 };

	test('the band widens with the horizon and narrows with time to expiry', () => {
		const short = queue.slippageBand({ ...base, delayMs: 800 });
		const long = queue.slippageBand({ ...base, delayMs: 2_000 });
		expect(long.deltaProbability > short.deltaProbability).toBe(true);
		const near = queue.slippageBand({ ...base, timeToExpiryMs: 60_000 });
		expect(near.deltaProbability > short.deltaProbability).toBe(true);
		expect(short.horizonMs).toBe(800 + 200 + 500 + 500);
	});

	test('the band is widest at p = 0.5 and clamps to [0, 1]', () => {
		const mid = queue.slippageBand(base);
		const tail = queue.slippageBand({ ...base, probability: 0.05 });
		expect(mid.deltaProbability > tail.deltaProbability).toBe(true);
		const expiring = queue.slippageBand({ ...base, timeToExpiryMs: 1_000 });
		expect(expiring).toMatchObject({ maxProbability: 1, minProbability: 0 });
		expect(() => queue.slippageBand({ ...base, probability: 1 })).toThrow(PredictInputError);
	});
});
