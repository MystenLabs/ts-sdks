// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Order planning for a purchase form (`read.planMint`, `read.planSell`) and the pure limit helpers
// behind it. Slippage is cents per contract, an absolute price move, never a percentage.
import { describe, expect, test } from 'vitest';
import {
	PredictClient,
	type MarketDescriptor,
	type MintPlan,
	type SellPlan,
} from '../../src/predict/client.js';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import { SHIPPED_FEE_POLICY } from '../../src/predict/cost.js';
import {
	PredictInputError,
	PredictMoveError,
	PredictPreflightError,
} from '../../src/predict/errors.js';
import { snapStrike } from '../../src/predict/ticks.js';
import {
	budgetMintLimits,
	exactMintLimits,
	maxMintNow,
	sellLimits,
} from '../../src/predict/queue.js';
import { deriveAccountIdFrom } from '../../src/predict/tx/common.js';
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
const ACCOUNT_ID = deriveAccountIdFrom(toGeneratedConfig(cfg), OWNER);
const CENT = 10_000_000n; // 1¢ in the 1e9-scaled price per contract
// A position order ID holding `lots` 0.01 lots.
const orderIdWithLots = (lots: bigint) => (lots << 100n) | (10_500_000n << 70n) | (1n << 40n) | 1n;
// An Open record of OWNER's account holding 5 USDC of payout.
const openRecord = (overrides: Parameters<typeof recordFields>[0] = {}) =>
	recordFields({
		status: 2,
		accountId: ACCOUNT_ID,
		position: { order_id: orderIdWithLots(500n) },
		...overrides,
	});

function client(s: QueueScenario) {
	const q = queueClient(s);
	return { pc: new PredictClient({ network: 'testnet', client: q.client, config: cfg }), ...q };
}

function market(s: QueueScenario): MarketDescriptor {
	return { underlying: 'BTC', expiryMs: s.expiryMs, marketId: MARKET, side: 'up', strike: 105_000 };
}

// The scenario's account quote: 10 contracts for 4.083 USDC all-in once its 0.007 penalty is
// removed, 40.83¢ a contract. Its 0.02 fee subsidy makes it 4.103 USDC, 41.03¢ a contract, without
// the subsidy, which is what enqueue admission checks.
const QUOTE = { quoteCostRaw: 4_083_000n, quoteQuantityRaw: 10_000_000n };
const SUBSIDY = 20_000n;
const UNSUBSIDIZED_PRICE = 410_300_000n;
// What admission charges for a quantity at the quote's unsubsidized price.
const admissionCost = (quantityRaw: bigint) =>
	(quantityRaw * UNSUBSIDIZED_PRICE + 999_999_999n) / 1_000_000_000n;

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
		// At no slippage and a budget of exactly the quote's cost, the floor leaves the fill's
		// per-component rounding a few raw units, one lot below the quote.
		expect(
			budgetMintLimits({
				...QUOTE,
				entryProbabilityRaw: 400_000_000n,
				slippageRaw: 0n,
				budgetRaw: 4_083_000n,
			}).minQuantityRaw,
		).toBe(9_990_000n);
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

	test('the limits add the fee subsidy back, so they pass the unsubsidized admission', () => {
		const budget = budgetMintLimits({
			...QUOTE,
			entryProbabilityRaw: 400_000_000n,
			slippageRaw: 0n,
			feeIncentiveSubsidyRaw: SUBSIDY,
			budgetRaw: QUOTE.quoteCostRaw,
		});
		expect(budget.pricePerContract).toEqual({ nowRaw: 408_300_000n, worstRaw: UNSUBSIDIZED_PRICE });
		// The subsidized price would floor at 10 contracts, which admission can't buy for 4.083.
		expect(budget.minQuantityRaw).toBe(9_950_000n);
		expect(admissionCost(budget.minQuantityRaw)).toBeLessThanOrEqual(QUOTE.quoteCostRaw);

		for (const slippageRaw of [0n, CENT]) {
			const exact = exactMintLimits({
				...QUOTE,
				entryProbabilityRaw: 400_000_000n,
				slippageRaw,
				feeIncentiveSubsidyRaw: SUBSIDY,
			});
			expect(exact.maxCostRaw).toBe(4_103_000n + slippageRaw / 100n);
			expect(exact.maxCostRaw).toBeGreaterThanOrEqual(admissionCost(QUOTE.quoteQuantityRaw));
			expect(exact.maxProbabilityRaw).toBe(400_000_000n + slippageRaw);
		}
	});

	test("the floor leaves room for the fill's per-component rounding", () => {
		// The chain prices 34.73 contracts at 11.705354 without the subsidy, a raw unit above this
		// budget, so admission buys 34.72. Dividing by the average price alone gives 34.73.
		const limits = budgetMintLimits({
			quoteCostRaw: 11_704_493n,
			quoteQuantityRaw: 35_690_000n,
			entryProbabilityRaw: 291_589_290n,
			slippageRaw: 0n,
			feeIncentiveSubsidyRaw: 324_417n,
			budgetRaw: 11_705_353n,
		});
		expect(limits.minQuantityRaw).toBe(34_720_000n);
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
		// 4.98 at the unsubsidized 41.03¢ plus 10¢: 9.7589… contracts, floored to the 0.01 lot.
		expect(plan.minPayout).toBe(9.75);
		expect(plan.payoutMultiple).toBeCloseTo(10 / 4.103, 9);
		expect(plan.minPayoutMultiple).toBeCloseTo(9.75 / 5, 9);
		expect(plan.pricePerContract).toBe(0.4083);
		expect(plan.worstPricePerContract).toBe(0.5103);
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
			options: { spend: 4.98, minQuantity: 9.75 },
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
			options: { quantity: 10, maxCost: 5.103, maxProbability: 0.5 },
		});
		expect(plan.budget).toBe(5.103);
		expect(plan.totalDebit).toBe(5.123);
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
		// A visitor can't place it yet: the form prompts a deposit.
		expect(plan.accepting).toBe(false);
		expect(plan.refusal).toBe('fee');
		// At 42¢ a contract, 4.98 buys 11.85 contracts on the lot grid.
		expect(plan.potentialPayout).toBe(11.85);
		expect(plan.quote.cost).toBeLessThanOrEqual(4.98);
		const targets = q.simulated.flatMap(moveCallTargets);
		expect(targets).toContain('expiry_market::quote_mint');
		expect(targets).not.toContain('expiry_market::quote_mint_exact_cost_for_account');
		expect(targets).not.toContain('account::load_account');
	});

	test("a visitor's 5 USDC purchase at 10% seeds the search above the 1 USDC minimum premium", async () => {
		const base = scenario();
		const s = scenario({
			mintQuote: { ...base.mintQuote, entry_probability: 100_000_000n },
			anonymousPricePerContract: 105_000_000n,
		});
		const q = queueClient(s);
		const pc = new PredictClient({ network: 'testnet', client: q.client, config: cfg });
		s.missingObjects.add(pc.wrapperIdFor(OWNER));
		const plan = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		// Quantity as the first probe, 4.98 contracts, is a 0.498 premium, which the chain refuses.
		// The premium-budget seed buys 49.8, then 4.98 / 10.5¢ settles on 47.42.
		expect(plan.quoteForAccount).toBe(false);
		expect(plan.potentialPayout).toBe(47.42);
		expect(plan.quote.cost).toBeLessThanOrEqual(4.98);
		expect(plan.order.builder).toBe('enqueueMintCost');
	});

	test('a visitor budget below the 1 USDC minimum premium is refused', async () => {
		const base = scenario();
		const s = scenario({
			mintQuote: { ...base.mintQuote, entry_probability: 100_000_000n },
			anonymousPricePerContract: 105_000_000n,
		});
		const q = queueClient(s);
		const pc = new PredictClient({ network: 'testnet', client: q.client, config: cfg });
		s.missingObjects.add(pc.wrapperIdFor(OWNER));
		// 1.00 after the fee seeds at a 1.00 premium, but the next probe, 9.52 contracts, is a
		// 0.952 premium. 0.48 fails at the seed.
		for (const amount of [1.02, 0.5]) {
			const err = await pc.read
				.planMint(OWNER, market(s), { amount, slippageCents: 10 })
				.catch((e) => e);
			expect(err).toBeInstanceOf(PredictPreflightError);
			expect(err.code).toBe('min-premium');
			expect(err.message).toMatch(/at least 1 USDC/);
		}
	});

	test("an account's budget below the minimum premium is refused before any quote", async () => {
		const s = scenario();
		const { pc, simulated } = client(s);
		const before = simulated.length;
		const err = await pc.read
			.planMint(OWNER, market(s), { amount: 0.5, slippageCents: 10 })
			.catch((e) => e);
		expect(err).toBeInstanceOf(PredictPreflightError);
		expect(err.code).toBe('min-premium');
		expect(err.message).toMatch(/at least 1 USDC/);
		// The account's quote would abort EOrderFailsLimits, so the plan never sends it.
		expect(
			simulated
				.slice(before)
				.flatMap(moveCallTargets)
				.filter((t) => t.includes('quote_mint')),
		).toEqual([]);
	});

	test('subsidized limits pass the unsubsidized admission at zero and small slippage', async () => {
		const s = scenario();
		const { pc } = client(s);
		for (const slippageCents of [0, 1]) {
			const exact = await pc.read.planMint(OWNER, market(s), { quantity: 10, slippageCents });
			expect(exact.raw.maxCost).toBeGreaterThanOrEqual(admissionCost(10_000_000n));
			expect(exact.raw.maxProbability).toBeGreaterThanOrEqual(400_000_000n);
			// 4.103 inclusive is a 4.083 budget, exactly the subsidized cost of 10 contracts.
			const budget = await pc.read.planMint(OWNER, market(s), { amount: 4.103, slippageCents });
			expect(budget.budget).toBe(4.083);
			expect(budget.raw.minQuantity).toBeLessThan(10_000_000n);
			expect(admissionCost(budget.raw.minQuantity)).toBeLessThanOrEqual(4_083_000n);
		}
	});

	test('a balance below the order also falls back to the account-free quote', async () => {
		const s = scenario({ available: 1_000_000n });
		const plan = await client(s).pc.read.planMint(OWNER, market(s), {
			amount: 5,
			slippageCents: 10,
		});
		expect(plan.quoteForAccount).toBe(false);
		expect(plan.balance).toEqual({ hasAccount: true, available: 1, covers: false });
		expect(plan.refusal).toBe('fee');
	});

	test("'auto' slippage comes from the model band, in cents", async () => {
		const s = scenario();
		const plan = await client(s).pc.read.planMint(OWNER, market(s), { amount: 5 });
		expect(plan.slippage.source).toBe('auto');
		expect(plan.slippage.band).not.toBeNull();
		expect(plan.slippage.cents).toBe(Math.ceil(plan.slippage.band!.deltaProbability * 1e9) / 1e7);
		expect(plan.slippage.cents).toBeGreaterThan(0);
		// The worst price is the unsubsidized one, 0.2¢ above the quote, plus the slippage.
		expect(plan.worstPricePerContract - plan.pricePerContract).toBeCloseTo(
			plan.slippage.cents / 100 + 0.002,
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

	test('a budget whose unsubsidized fill is below the minimum premium is refused', async () => {
		const base = scenario();
		// 10 contracts at 10¢: a 1.00 premium, a 0.05 trading fee and a 0.01 subsidy, 1.04 all-in.
		const s = scenario({
			mintQuote: {
				...base.mintQuote,
				quantity: 10_000_000n,
				entry_probability: 100_000_000n,
				premium: 1_000_000n,
				trading_fee: 50_000n,
				fee_incentive_subsidy: 10_000n,
				penalty_fee: 0n,
				inventory_impact_charge: 0n,
				all_in_cost: 1_040_000n,
			},
		});
		// Admission prices without the subsidy, so 1.04 buys 9.90 contracts, a 0.99 premium.
		for (const slippageCents of [0, 1]) {
			const plan = await client(s).pc.read.planMint(OWNER, market(s), {
				amount: 1.06,
				slippageCents,
			});
			expect(plan.budget).toBe(1.04);
			expect(plan.accepting).toBe(false);
			expect(plan.refusal).toBe('min-premium');
		}
	});

	test('a raised probe the minimum premium still refuses reports min-premium', async () => {
		const base = scenario();
		// The budget quote prices at 50.25¢, so the minimum premium needs 2.00 contracts. By the
		// exact probes the price moved to 49.9¢: 1.96 and the raised 2.00 both miss the 1 USDC
		// premium, and the chain refuses both with EOrderFailsLimits, as it did on Testnet.
		const accountQuoteAt = (quantity: bigint) => {
			const premium = (quantity * 499_000_000n) / 1_000_000_000n;
			const trading = (quantity * 8n) / 100n;
			return {
				...base.mintQuote,
				quantity,
				entry_probability: 499_000_000n,
				premium,
				trading_fee: trading,
				fee_incentive_subsidy: 30_000n,
				penalty_fee: 0n,
				inventory_impact_charge: 0n,
				all_in_cost: premium + trading - 30_000n,
			};
		};
		const s = scenario({
			mintQuote: {
				...base.mintQuote,
				quantity: 1_960_000n,
				entry_probability: 502_500_000n,
				premium: 984_900n,
				trading_fee: 160_000n,
				fee_incentive_subsidy: 30_000n,
				penalty_fee: 0n,
				inventory_impact_charge: 0n,
				all_in_cost: 1_114_900n,
			},
			accountQuoteAt,
		});
		const plan = await client(s).pc.read.planMint(OWNER, market(s), {
			amount: 1.2,
			slippageCents: 10,
		});
		expect(plan.budget).toBe(1.18);
		expect(plan.accepting).toBe(false);
		expect(plan.refusal).toBe('min-premium');
	});

	test('a budget floor is checked with exact quotes, so convex impact never overshoots it', async () => {
		const base = scenario();
		// 50¢ contracts, a 5% trading fee half subsidized, and an impact charge that grows with
		// the square of the quantity, rounded per component like the chain.
		const accountQuoteAt = (quantity: bigint) => {
			const premium = quantity / 2n;
			const trading = (premium * 5n + 99n) / 100n;
			const subsidy = trading / 2n;
			const impact = (quantity * quantity) / 10_000_000_000n;
			return {
				...base.mintQuote,
				quantity,
				entry_probability: 500_000_000n,
				premium,
				trading_fee: trading,
				fee_incentive_subsidy: subsidy,
				builder_fee: 0n,
				penalty_fee: 0n,
				inventory_impact_charge: impact,
				all_in_cost: premium + trading - subsidy + impact,
			};
		};
		const unsubsidized = (quantity: bigint) => {
			const q = accountQuoteAt(quantity);
			return q.all_in_cost + q.fee_incentive_subsidy;
		};
		const s = scenario({
			cashBalance: 2_000_000_000n,
			// The budget's own quote shows no impact, so its average price is 52.5¢.
			mintQuote: {
				...accountQuoteAt(10_000_000n),
				inventory_impact_charge: 0n,
				all_in_cost: 5_125_000n,
			},
			accountQuoteAt,
		});
		const plan = await client(s).pc.read.planMint(OWNER, market(s), {
			amount: 5.27,
			slippageCents: 0,
		});
		expect(plan.budget).toBe(5.25);
		expect(plan.accepting).toBe(true);
		// The average price puts the floor at 9.99, which admission prices above the budget.
		expect(unsubsidized(9_990_000n)).toBeGreaterThan(5_250_000n);
		expect(plan.raw.minQuantity).toBe(9_980_000n);
		expect(unsubsidized(plan.raw.minQuantity)).toBeLessThanOrEqual(5_250_000n);
	});

	test('a minimum-sized budget is probed without the rounding allowance', async () => {
		const base = scenario();
		// Two contracts at 50¢: a 1.00 premium and a 0.025 trading fee, exactly a 1.025 budget.
		const s = scenario({
			mintQuote: {
				...base.mintQuote,
				quantity: 2_000_000n,
				entry_probability: 500_000_000n,
				premium: 1_000_000n,
				trading_fee: 25_000n,
				fee_incentive_subsidy: 0n,
				penalty_fee: 0n,
				inventory_impact_charge: 0n,
				all_in_cost: 1_025_000n,
			},
		});
		for (const slippageCents of [0, 1]) {
			const plan = await client(s).pc.read.planMint(OWNER, market(s), {
				amount: 1.045,
				slippageCents,
			});
			// Admission buys exactly 2, so the plan is accepted. 1.99 would be below the minimum.
			expect(plan.budget).toBe(1.025);
			expect(plan.refusal).toBeNull();
		}
	});

	test('a budget whose fill costs about its payout is refused', async () => {
		const base = scenario();
		// 96.9¢ contracts with a 3.09% trading fee, a fifth subsidized: about $1 a contract
		// without the subsidy, where admission's payout-bound search can't be previewed.
		const accountQuoteAt = (quantity: bigint) => {
			const premium = (quantity * 969_071_706n + 999_999_999n) / 1_000_000_000n;
			const trading = (premium * 30_928_390n + 999_999_999n) / 1_000_000_000n;
			const subsidy = trading / 5n;
			return {
				...base.mintQuote,
				quantity,
				entry_probability: 969_071_706n,
				premium,
				trading_fee: trading,
				fee_incentive_subsidy: subsidy,
				builder_fee: 0n,
				penalty_fee: 0n,
				inventory_impact_charge: 0n,
				all_in_cost: premium + trading - subsidy,
			};
		};
		const s = scenario({
			cashBalance: 5_000_000_000n,
			// The budget's quote: 14.36 contracts whose unsubsidized cost equals their payout.
			mintQuote: {
				...accountQuoteAt(14_360_000n),
				all_in_cost: 14_360_000n - accountQuoteAt(14_360_000n).fee_incentive_subsidy,
			},
			accountQuoteAt,
		});
		const { pc } = client(s);
		for (const slippageCents of [0, 0.01]) {
			const plan = await pc.read.planMint(OWNER, market(s), {
				amount: 14.292636,
				slippageCents,
			});
			expect(plan.budget).toBe(14.272636);
			expect(plan.refusal).toBe('cost-above-payout');
			const err = await pc.tx.enqueuePlan(OWNER, market(s), plan).catch((e) => e);
			expect(err).toBeInstanceOf(PredictPreflightError);
			expect(err.code).toBe('cost-above-payout');
		}
	});

	test('an exact plan whose unsubsidized cost is above its payout is refused', async () => {
		const base = scenario();
		// 10 contracts at 99¢ cost 9.99 with a 0.02 subsidy, 10.01 without it.
		const s = scenario({
			mintQuote: {
				...base.mintQuote,
				quantity: 10_000_000n,
				entry_probability: 990_000_000n,
				premium: 9_900_000n,
				trading_fee: 110_000n,
				fee_incentive_subsidy: 20_000n,
				penalty_fee: 0n,
				inventory_impact_charge: 0n,
				all_in_cost: 9_990_000n,
			},
		});
		const plan = await client(s).pc.read.planMint(OWNER, market(s), {
			quantity: 10,
			slippageCents: 0,
		});
		expect(plan.raw.maxCost).toBe(10_000_000n);
		expect(plan.accepting).toBe(false);
		expect(plan.refusal).toBe('cost-above-payout');
	});

	test('a plan reports the refusal its enqueue would get for market cash', async () => {
		const s = scenario({ cashBalance: 500_000_000n });
		const { pc } = client(s);
		const plan = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		expect(plan.accepting).toBe(false);
		expect(plan.refusal).toBe('market-cash');
		const err = await pc.tx.enqueuePlan(OWNER, market(s), plan).catch((e) => e);
		expect(err).toBeInstanceOf(PredictPreflightError);
		expect(err.code).toBe('market-cash');
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
		const s = scenario({ records: new Map([[7n, openRecord()]]) });
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

describe('read.planSell refusals', () => {
	test.each([
		['account-cap', { waitingOrders: 5n, records: new Map([[7n, openRecord()]]) }],
		[
			'not-record-owner',
			{ records: new Map([[7n, openRecord({ accountId: '0x' + '22'.repeat(32) })]]) },
		],
		['fee', { available: 10_000n, records: new Map([[7n, openRecord()]]) }],
	] as const)('reports %s, as the enqueue would', async (code, overrides) => {
		const s = scenario(overrides as Partial<QueueScenario>);
		const { pc } = client(s);
		const plan = await pc.read.planSell(OWNER, market(s), {
			recordId: 7n,
			quantity: 2,
			slippageCents: 10,
		});
		expect(plan.accepting).toBe(false);
		expect(plan.refusal).toBe(code);
		const err = await pc.tx.enqueuePlan(OWNER, market(s), plan).catch((e) => e);
		expect(err).toBeInstanceOf(PredictPreflightError);
		expect(err.code).toBe(code);
	});
});

describe('sell previews keep their sign', () => {
	test('a sell whose proceeds are below the order fee nets a loss', async () => {
		const base = scenario();
		const s = scenario({
			records: new Map([[7n, openRecord()]]),
			redeemQuote: { ...base.redeemQuote, proceeds: 4_490n },
		});
		const { pc } = client(s);
		const quote = await pc.read.quoteSell(OWNER, market(s), { recordId: 7n, quantity: 2 });
		// 0.00449 of proceeds less the 0.02 order fee, which is charged at enqueue regardless.
		expect(quote.net).toBeCloseTo(-0.01551, 9);
		const plan = await pc.read.planSell(OWNER, market(s), {
			recordId: 7n,
			quantity: 2,
			slippageCents: 10,
		});
		expect(plan.net).toBeCloseTo(-0.01551, 9);
		expect(plan.minNet).toBeCloseTo(-0.02, 9);
	});
});

describe('a plan the chain refuses to quote gets a typed refusal', () => {
	const band = { minEntryProbability: 250_000_000n, maxEntryProbability: 750_000_000n };
	function withPrices(pc: PredictClient, up: number) {
		pc.read.price = async () => ({ up, down: 1 - up });
		pc.read.feePolicy = async () => ({ ...SHIPPED_FEE_POLICY, ...band });
	}

	test('a strike outside the entry band is refused as entry-band, for both shapes', async () => {
		const s = scenario({ refuseQuotes: true });
		const { pc } = client(s);
		withPrices(pc, 0.88);
		for (const size of [{ amount: 5 }, { quantity: 10 }]) {
			const err = await pc.read
				.planMint(OWNER, market(s), { ...size, slippageCents: 10 })
				.catch((e) => e);
			expect(err).toBeInstanceOf(PredictPreflightError);
			expect(err.code).toBe('entry-band');
		}
	});

	test('an exact quantity whose premium is below the minimum is refused as min-premium', async () => {
		const s = scenario({ refuseQuotes: true });
		const { pc } = client(s);
		withPrices(pc, 0.5);
		const err = await pc.read
			.planMint(OWNER, market(s), { quantity: 1, slippageCents: 10 })
			.catch((e) => e);
		expect(err).toBeInstanceOf(PredictPreflightError);
		expect(err.code).toBe('min-premium');
	});

	test('an account budget the chain refuses is diagnosed by the account-free search', async () => {
		// Just above 1 USDC after the order fee: the account's budget quote is refused, and the
		// search finds no fill whose premium clears the minimum.
		const s = scenario({ refuseAccountBudgetQuote: true });
		const { pc } = client(s);
		withPrices(pc, 0.4);
		const err = await pc.read
			.planMint(OWNER, market(s), { amount: 1.05, slippageCents: 10 })
			.catch((e) => e);
		expect(err).toBeInstanceOf(PredictPreflightError);
		expect(err.code).toBe('min-premium');
		expect(err.message).toMatch(/at least 1 USDC/);
	});

	test('an account budget only account-free pricing can size is never planned', async () => {
		// The account's own pricing (a builder fee, say) refuses the budget, while the account-free
		// search would size it. The plan keeps the chain's refusal instead of an accepting plan
		// admission would abort.
		const s = scenario({ refuseAccountBudgetQuote: true });
		const { pc } = client(s);
		withPrices(pc, 0.4);
		const err = await pc.read
			.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 })
			.catch((e) => e);
		expect(err).toBeInstanceOf(PredictMoveError);
		expect(err.abortName).toBe('EOrderFailsLimits');
	});

	test('a budget no probe could price keeps the chain refusal, not min-premium', async () => {
		// Every quote is refused at an in-band price. A 5 USDC budget's first probe buys a premium
		// near 5, so the minimum premium didn't refuse it: cost above the payout, or a range the
		// pricer can't price, did. For a visitor and for an account.
		const visitor = scenario({ refuseQuotes: true });
		const { pc: visitorClient } = client(visitor);
		visitor.missingObjects.add(visitorClient.wrapperIdFor(OWNER));
		const account = scenario({ refuseQuotes: true });
		const { pc: accountClient } = client(account);
		for (const [pc, s] of [
			[visitorClient, visitor],
			[accountClient, account],
		] as const) {
			withPrices(pc, 0.5);
			const err = await pc.read
				.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 })
				.catch((e) => e);
			expect(err).toBeInstanceOf(PredictMoveError);
			expect(err.abortName).toBe('EOrderFailsLimits');
		}
	});

	test('an amount the order fee takes whole is refused as min-premium', async () => {
		const s = scenario();
		const { pc } = client(s);
		const err = await pc.read
			.planMint(OWNER, market(s), { amount: 0.02, slippageCents: 10 })
			.catch((e) => e);
		expect(err).toBeInstanceOf(PredictPreflightError);
		expect(err.code).toBe('min-premium');
	});

	test('a market past its expiry is refused as past-cutoff, for mints and sells', async () => {
		const s = scenario({ pastExpiry: true, records: new Map([[7n, openRecord()]]) });
		const { pc } = client(s);
		for (const size of [{ amount: 5 }, { quantity: 10 }]) {
			const err = await pc.read
				.planMint(OWNER, market(s), { ...size, slippageCents: 10 })
				.catch((e) => e);
			expect(err).toBeInstanceOf(PredictPreflightError);
			expect(err.code).toBe('past-cutoff');
		}
		const err = await pc.read
			.planSell(OWNER, market(s), { recordId: 7n, quantity: 2, slippageCents: 10 })
			.catch((e) => e);
		expect(err).toBeInstanceOf(PredictPreflightError);
		expect(err.code).toBe('past-cutoff');
	});

	test('a sell above what the record holds is refused before any quote', async () => {
		const s = scenario({ records: new Map([[7n, openRecord()]]) });
		const { pc, simulated } = client(s);
		const err = await pc.read
			.planSell(OWNER, market(s), { recordId: 7n, quantity: 6, slippageCents: 10 })
			.catch((e) => e);
		expect(err).toBeInstanceOf(PredictInputError);
		expect(err.message).toMatch(/above the record's 5/);
		expect(
			simulated.flatMap(moveCallTargets).filter((t) => t.includes('quote_redeem_open')),
		).toEqual([]);
	});
});

describe('a plan holds the fee and balance it was quoted with', () => {
	test('enqueuePlan refuses a mint or sell plan once the order fee rose', async () => {
		const s = scenario({ records: new Map([[7n, openRecord()]]) });
		const { pc } = client(s);
		const mint = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		const sell = await pc.read.planSell(OWNER, market(s), {
			recordId: 7n,
			quantity: 2,
			slippageCents: 10,
		});
		expect([mint.refusal, sell.refusal]).toEqual([null, null]);
		s.policy = { ...s.policy, order_fee: 50_000n };
		for (const plan of [mint, sell]) {
			const err = await pc.tx.enqueuePlan(OWNER, market(s), plan).catch((e) => e);
			expect(err).toBeInstanceOf(PredictInputError);
			expect(err.message).toMatch(/order fee rose from 0.02 to 0.05/);
		}
		// A fee that fell only debits less, so the plan still places.
		s.policy = { ...s.policy, order_fee: 10_000n };
		await expect(pc.tx.enqueuePlan(OWNER, market(s), mint)).resolves.toBeDefined();
	});

	test("an exact plan's maxNow is bounded by the balance at the worst price", async () => {
		const s = scenario({ available: 2_000_000n });
		const { pc } = client(s);
		const plan = await pc.read.planMint(OWNER, market(s), { quantity: 10, slippageCents: 10 });
		const lot = BigInt(cfg.units.positionLotSize);
		const byBalance =
			(((2_000_000n - 20_000n) * 1_000_000_000n) / plan.raw.worstPricePerContract / lot) * lot;
		expect(plan.maxNow).toBe(Number(byBalance) / 1e6);
		// The escrow of that quantity at the worst price fits what the balance spends.
		expect(
			(byBalance * plan.raw.worstPricePerContract + 999_999_999n) / 1_000_000_000n,
		).toBeLessThanOrEqual(2_000_000n - 20_000n);
		const empty = scenario({ available: 0n });
		const none = await client(empty).pc.read.planMint(OWNER, market(empty), {
			quantity: 10,
			slippageCents: 10,
		});
		expect(none.maxNow).toBe(0);
	});
});

describe('plans are bound to what they were quoted for', () => {
	test('a sell plan places with the coordinates planSell took, a mint plan needs its descriptor', async () => {
		const s = scenario({ records: new Map([[7n, openRecord()]]) });
		const { pc } = client(s);
		const coordinates = { underlying: 'BTC', expiryMs: s.expiryMs, marketId: MARKET };
		const sell = await pc.read.planSell(OWNER, coordinates, {
			recordId: 7n,
			quantity: 2,
			slippageCents: 10,
		});
		await expect(pc.tx.enqueuePlan(OWNER, coordinates, sell)).resolves.toBeDefined();
		const mint = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		const untyped = mint as MintPlan | SellPlan;
		const err = await pc.tx.enqueuePlan(OWNER, coordinates, untyped).catch((e) => e);
		expect(err).toBeInstanceOf(PredictInputError);
		expect(err.message).toMatch(/needs the market descriptor/);
	});

	test('a mint plan is refused for the other side or another owner', async () => {
		const s = scenario();
		const { pc } = client(s);
		const plan = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		expect(plan.target).toMatchObject({ expiryMarketId: MARKET });
		await expect(pc.tx.enqueuePlan(OWNER, { ...market(s), side: 'down' }, plan)).rejects.toThrow(
			PredictInputError,
		);
		await expect(pc.tx.enqueuePlan('0x' + 'cd'.repeat(32), market(s), plan)).rejects.toThrow(
			PredictInputError,
		);
		// The descriptor it was made for still builds.
		const placed = await pc.tx.enqueuePlan(OWNER, market(s), plan);
		expect(placed.preview.totalDebit).toBe(plan.totalDebit);
	});

	test('a sell plan is refused for another owner or record', async () => {
		const s = scenario({ records: new Map([[7n, openRecord()]]) });
		const { pc } = client(s);
		const plan = await pc.read.planSell(OWNER, market(s), {
			recordId: 7n,
			quantity: 2,
			slippageCents: 10,
		});
		expect(plan.target).toMatchObject({ expiryMarketId: MARKET, recordId: 7n });
		await expect(pc.tx.enqueuePlan('0x' + 'cd'.repeat(32), market(s), plan)).rejects.toThrow(
			PredictInputError,
		);
		const tampered = {
			...plan,
			order: { ...plan.order, options: { ...plan.order.options, recordId: 8n } },
		};
		await expect(pc.tx.enqueuePlan(OWNER, market(s), tampered)).rejects.toThrow(PredictInputError);
	});
});

describe('refusal parity', () => {
	test('a record that is not Open has no quote, so planSell throws the refusal', async () => {
		const s = scenario({ records: new Map([[7n, openRecord({ status: 4 })]]) });
		const { pc } = client(s);
		const opts = { recordId: 7n, quantity: 2 };
		const planned = await pc.read
			.planSell(OWNER, market(s), { ...opts, slippageCents: 10 })
			.catch((e) => e);
		const enqueued = await pc.tx
			.enqueueSell(OWNER, market(s), { ...opts, minProbability: 0.3, minProceeds: 0.5 })
			.catch((e) => e);
		for (const err of [planned, enqueued]) {
			expect(err).toBeInstanceOf(PredictPreflightError);
			expect(err.code).toBe('record-not-open');
		}
	});

	test('enqueuePlan refuses a refused plan with its code', async () => {
		const base = scenario();
		const cases: [Partial<QueueScenario>, { amount: number } | { quantity: number }, string][] = [
			[
				{
					mintQuote: {
						...base.mintQuote,
						entry_probability: 100_000_000n,
						premium: 1_000_000n,
						trading_fee: 50_000n,
						fee_incentive_subsidy: 10_000n,
						penalty_fee: 0n,
						inventory_impact_charge: 0n,
						all_in_cost: 1_040_000n,
					},
				},
				{ amount: 1.06 },
				'min-premium',
			],
			[
				{
					mintQuote: {
						...base.mintQuote,
						entry_probability: 990_000_000n,
						premium: 9_900_000n,
						trading_fee: 110_000n,
						fee_incentive_subsidy: 20_000n,
						penalty_fee: 0n,
						inventory_impact_charge: 0n,
						all_in_cost: 9_990_000n,
					},
				},
				{ quantity: 10 },
				'cost-above-payout',
			],
			[{ available: 3_000_000n }, { amount: 5 }, 'fee'],
		];
		for (const [overrides, size, code] of cases) {
			const s = scenario(overrides);
			const { pc } = client(s);
			const plan = await pc.read.planMint(OWNER, market(s), { ...size, slippageCents: 0 });
			expect(plan.refusal).toBe(code);
			const err = await pc.tx.enqueuePlan(OWNER, market(s), plan).catch((e) => e);
			expect(err).toBeInstanceOf(PredictPreflightError);
			expect(err.code).toBe(code);
		}
	});

	test('enqueuePlan refuses when the balance fell below the plan since it was made', async () => {
		const s = scenario();
		const { pc } = client(s);
		const plan = await pc.read.planMint(OWNER, market(s), { amount: 5, slippageCents: 10 });
		expect(plan.accepting).toBe(true);
		// The builder would escrow 2.98 of the planned 4.98, below what the limits assume.
		s.available = 3_000_000n;
		const err = await pc.tx.enqueuePlan(OWNER, market(s), plan).catch((e) => e);
		expect(err).toBeInstanceOf(PredictPreflightError);
		expect(err.code).toBe('fee');
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
