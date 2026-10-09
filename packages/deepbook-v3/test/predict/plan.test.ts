// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Order planning for a purchase form (`read.planMint`, `read.planSell`) and the pure limit helpers
// behind it. Slippage is cents per contract, an absolute price move, never a percentage.
import { describe, expect, test } from 'vitest';
import { PredictClient, type MarketDescriptor } from '../../src/predict/client.js';
import { PredictInputError } from '../../src/predict/errors.js';
import { snapStrike } from '../../src/predict/ticks.js';
import {
	budgetMintLimits,
	exactMintLimits,
	maxMintNow,
	sellLimits,
} from '../../src/predict/queue.js';
import {
	MARKET,
	QUEUE_CFG as cfg,
	moveCallTargets,
	queueClient,
	recordFields,
	scenario,
	type QueueScenario,
} from './queue-fixtures.js';

const OWNER = '0x' + 'ab'.repeat(32);
const CENT = 10_000_000n; // 1¢ in the 1e9-scaled price per contract

function client(s: QueueScenario) {
	const q = queueClient(s);
	return { pc: new PredictClient({ network: 'testnet', client: q.client, config: cfg }), ...q };
}

function market(s: QueueScenario): MarketDescriptor {
	return { underlying: 'BTC', expiryMs: s.expiryMs, marketId: MARKET, side: 'up', strike: 105_000 };
}

// The scenario's account quote: 10 contracts for 4.083 USDC all-in once its 0.007 penalty is
// removed, 40.83¢ a contract.
const QUOTE = { quoteCostRaw: 4_083_000n, quoteQuantityRaw: 10_000_000n };

describe('limit helpers', () => {
	test('slippage is cents per contract, added to the price, never a percentage', () => {
		for (const [cost, quantity] of [
			[4_083_000n, 10_000_000n],
			[8_166_000n, 10_000_000n],
		] as const) {
			const { pricePerContract } = budgetMintLimits({
				quoteCostRaw: cost,
				quoteQuantityRaw: quantity,
				entryProbabilityRaw: 400_000_000n,
				slippageRaw: 10n * CENT,
				budgetRaw: cost,
			});
			expect(pricePerContract.worstRaw - pricePerContract.nowRaw).toBe(10n * CENT);
		}
	});

	test('a budget mint floors its payout at the worst price, on the lot grid', () => {
		const limits = budgetMintLimits({
			...QUOTE,
			entryProbabilityRaw: 400_000_000n,
			slippageRaw: 10n * CENT,
			budgetRaw: 4_980_000n,
		});
		expect(limits.pricePerContract).toEqual({ nowRaw: 408_300_000n, worstRaw: 508_300_000n });
		// 4.98 / 0.5083 = 9.7973… contracts, floored to the 0.01 lot.
		expect(limits.minQuantityRaw).toBe(9_790_000n);
		expect(
			budgetMintLimits({
				...QUOTE,
				entryProbabilityRaw: 400_000_000n,
				slippageRaw: 0n,
				budgetRaw: 4_083_000n,
			}).minQuantityRaw,
		).toBe(10_000_000n);
	});

	test('an exact mint caps probability and cost at the worst price, and cost at the quantity', () => {
		expect(
			exactMintLimits({ ...QUOTE, entryProbabilityRaw: 400_000_000n, slippageRaw: 10n * CENT }),
		).toMatchObject({ maxCostRaw: 5_083_000n, maxProbabilityRaw: 500_000_000n });
		expect(
			exactMintLimits({ ...QUOTE, entryProbabilityRaw: 950_000_000n, slippageRaw: 100n * CENT }),
		).toMatchObject({ maxCostRaw: 10_000_000n, maxProbabilityRaw: 1_000_000_000n });
	});

	test('a sell floors proceeds and probability at the worst price, never below zero', () => {
		const base = {
			proceedsRaw: 790_000n,
			closeQuantityRaw: 2_000_000n,
			probabilityRaw: 400_000_000n,
		};
		expect(sellLimits({ ...base, slippageRaw: 10n * CENT })).toEqual({
			minProceedsRaw: 590_000n,
			minProbabilityRaw: 300_000_000n,
		});
		expect(sellLimits({ ...base, slippageRaw: 50n * CENT })).toEqual({
			minProceedsRaw: 0n,
			minProbabilityRaw: 0n,
		});
	});

	test('a quote that buys nothing sizes no limits', () => {
		expect(() =>
			budgetMintLimits({
				quoteCostRaw: 0n,
				quoteQuantityRaw: 0n,
				entryProbabilityRaw: 0n,
				slippageRaw: CENT,
				budgetRaw: 1n,
			}),
		).toThrow(PredictInputError);
	});
});

describe('read.planMint', () => {
	test('a purchase amount includes the order fee and plans a budget mint', async () => {
		const s = scenario();
		const { pc } = client(s);
		const plan = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		expect(plan.shape).toBe('budget');
		expect(plan.quoteForAccount).toBe(true);
		expect(plan.slippage).toEqual({ cents: 10, source: 'input', band: null });
		expect(plan.orderFee).toBe(0.02);
		expect(plan.budget).toBe(4.98);
		expect(plan.totalDebit).toBe(5);
		expect(plan.expectedDebit).toBeCloseTo(4.103, 9);
		expect(plan.potentialPayout).toBe(10);
		expect(plan.minPayout).toBe(9.79);
		expect(plan.payoutMultiple).toBeCloseTo(10 / 4.103, 9);
		expect(plan.minPayoutMultiple).toBeCloseTo(9.79 / 5, 9);
		expect(plan.pricePerContract).toBe(0.4083);
		expect(plan.worstPricePerContract).toBe(0.5083);
		expect(plan.balance).toEqual({ hasAccount: true, available: 100, covers: true });
		const max = maxMintNow({
			shape: 'budget',
			spareCashRaw: s.cashBalance - s.requiredCash,
			minEntryProbability: s.minEntryProbability,
			availableRaw: s.available,
			orderFeeRaw: 20_000n,
		}).maxRaw!;
		expect(plan.maxNow).toBe(Number(max + 20_000n) / 1e6);
		expect(plan.accepting).toBe(true);
		expect(plan.refusal).toBeNull();
		expect(plan.timing.beforeCutoff).toBe(true);
		expect(plan.order).toEqual({
			builder: 'enqueueMintCost',
			options: { spend: 4.98, minQuantity: 9.79 },
		});
	});

	test("'exclusive' charges the order fee on top of the amount", async () => {
		const s = scenario();
		const plan = await client(s).pc.read.planMint(OWNER, market(s), {
			amount: 5,
			orderFee: 'exclusive',
			slippageCents: 10,
		});
		expect(plan.budget).toBe(5);
		expect(plan.totalDebit).toBe(5.02);
	});

	test('an amount that does not cover the order fee is refused', async () => {
		const s = scenario();
		await expect(
			client(s).pc.read.planMint(OWNER, market(s), { amount: 0.02, slippageCents: 10 }),
		).rejects.toThrow(/order fee/);
	});

	test('a quantity plans an exact mint capped by probability and cost', async () => {
		const s = scenario();
		const plan = await client(s).pc.read.planMint(OWNER, market(s), {
			quantity: 10,
			slippageCents: 10,
		});
		expect(plan.shape).toBe('exact-quantity');
		expect(plan.order).toEqual({
			builder: 'enqueueMint',
			options: { quantity: 10, maxCost: 5.083, maxProbability: 0.5 },
		});
		expect(plan.budget).toBe(5.083);
		expect(plan.totalDebit).toBe(5.103);
		expect(plan.minPayout).toBe(10);
	});

	test('a visitor without an account gets a searched quote_mint plan', async () => {
		const s = scenario();
		const q = queueClient(s);
		const pc = new PredictClient({ network: 'testnet', client: q.client, config: cfg });
		s.missingObjects.add(pc.wrapperIdFor(OWNER));
		const plan = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		expect(plan.quoteForAccount).toBe(false);
		expect(plan.balance).toEqual({ hasAccount: false, available: null, covers: null });
		// At 42¢ a contract, 4.98 buys 11.85 contracts on the lot grid.
		expect(plan.potentialPayout).toBe(11.85);
		expect(plan.quote.cost).toBeLessThanOrEqual(4.98);
		const targets = q.simulated.flatMap(moveCallTargets);
		expect(targets).toContain('expiry_market::quote_mint');
		expect(targets).not.toContain('expiry_market::quote_mint_exact_cost_for_account');
		expect(targets).not.toContain('account::load_account');
	});

	test('a balance below the order also falls back to the account-free quote', async () => {
		const s = scenario({ available: 1_000_000n });
		const plan = await client(s).pc.read.planMint(OWNER, market(s), {
			amount: 5,
			slippageCents: 10,
		});
		expect(plan.quoteForAccount).toBe(false);
		expect(plan.balance).toEqual({ hasAccount: true, available: 1, covers: false });
	});

	test("'auto' slippage comes from the model band, in cents", async () => {
		const s = scenario();
		const plan = await client(s).pc.read.planMint(OWNER, market(s), { amount: 5 });
		expect(plan.slippage.source).toBe('auto');
		expect(plan.slippage.band).not.toBeNull();
		expect(plan.slippage.cents).toBe(Math.ceil(plan.slippage.band!.deltaProbability * 1e9) / 1e7);
		expect(plan.slippage.cents).toBeGreaterThan(0);
		expect(plan.worstPricePerContract - plan.pricePerContract).toBeCloseTo(
			plan.slippage.cents / 100,
			9,
		);
	});

	test('slippage outside 0 to 100 cents is refused', async () => {
		const s = scenario();
		const { pc } = client(s);
		for (const slippageCents of [-1, 101, Number.NaN]) {
			await expect(
				pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents }),
			).rejects.toThrow(PredictInputError);
		}
	});

	test('a paused market plans the order but reports the refusal', async () => {
		const s = scenario({ tradingPaused: true });
		const plan = await client(s).pc.read.planMint(OWNER, market(s), {
			amount: 5,
			slippageCents: 10,
		});
		expect(plan.accepting).toBe(false);
		expect(plan.refusal).toBe('paused');
	});

	test("the plan's options build the enqueue they describe", async () => {
		const s = scenario();
		const { pc } = client(s);
		const budget = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		if (budget.order.builder !== 'enqueueMintCost') throw new Error('expected a budget plan');
		const placed = await pc.tx.enqueueMintCost(OWNER, market(s), budget.order.options);
		expect(placed.preview.budget).toBe(budget.budget);
		expect(placed.preview.totalDebit).toBe(budget.totalDebit);

		const exact = await pc.read.planMint(OWNER, market(s), { quantity: 10, slippageCents: 10 });
		const placedExact = await pc.tx.enqueuePlan(OWNER, market(s), exact);
		expect(placedExact.preview.totalDebit).toBe(exact.totalDebit);
		expect(moveCallTargets(placedExact.transaction)).toContain('queue::enqueue_exact_quantity');
	});
});

describe('read.planSell', () => {
	test('floors proceeds and probability at the worst price, net of the order fee', async () => {
		const s = scenario({ records: new Map([[7n, recordFields({ status: 4 })]]) });
		const plan = await client(s).pc.read.planSell(OWNER, market(s), {
			recordId: 7n,
			quantity: 2,
			slippageCents: 10,
		});
		expect(plan.proceeds).toBe(0.79);
		expect(plan.net).toBe(0.77);
		expect(plan.minProceeds).toBe(0.59);
		expect(plan.minNet).toBe(0.57);
		expect(plan.orderFee).toBe(0.02);
		expect(plan.accepting).toBe(true);
		expect(plan.order).toEqual({
			builder: 'enqueueSell',
			options: { recordId: 7n, quantity: 2, minProbability: 0.3, minProceeds: 0.59 },
		});
	});
});

describe('snapStrike', () => {
	test('snaps bounds to the admission grid in exact integers', () => {
		expect(snapStrike(82_780, 25)).toBe(82_775);
		expect(snapStrike(82_790, 25)).toBe(82_800);
		expect(snapStrike(82_790, 25, 'down')).toBe(82_775);
		expect(snapStrike(82_801, 25, 'up')).toBe(82_825);
		expect(snapStrike(82_825, 25, 'up')).toBe(82_825);
		expect(snapStrike(0.3, 0.1)).toBe(0.3);
		expect(() => snapStrike(10, 25, 'down')).toThrow(PredictInputError);
		expect(() => snapStrike(-1, 25)).toThrow(PredictInputError);
	});
});
