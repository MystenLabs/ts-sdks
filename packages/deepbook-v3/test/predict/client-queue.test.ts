// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the facade's queued-order builders, preflight, reads and quotes,
// against a mocked chain. Each preflight code is driven from the one chain fact behind it. Every
// queued-order call goes to the order-flow companion (`queue::*`) at the market's derived queue.
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, test, vi } from 'vitest';
import { ProtocolConfig } from '../../src/contracts/deepbook_predict/protocol_config.js';
import { PredictClient, type MarketDescriptor } from '../../src/predict/client.js';
import { TESTNET_CONFIG } from '../../src/predict/config/index.js';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import { PredictInputError, PredictPreflightError } from '../../src/predict/errors.js';
import { cashNeedBudget, cashNeedExactQuantity } from '../../src/predict/queue.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';
import { deriveAccountIdFrom } from '../../src/predict/tx/common.js';
import { localMintQuote, localSellQuote } from '../../src/predict/quotes.js';
import { readMarketObject } from '../../src/predict/reads/book.js';
import {
	LEGACY_CFG,
	MARKET,
	QUEUE,
	QUEUE_CFG as cfg,
	fixedPricer,
	moveCallTargets,
	policyFields,
	queueClient,
	recordFields,
	scenario,
	testProvider,
	type QueueScenario,
} from './queue-fixtures.js';

// The pricer is fixed (`pricerAt` is tested in `inputs.test.ts`), and the quotes run the real
// off-chain engine on the fixture market.
vi.mock('../../src/predict/inputs.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../src/predict/inputs.js')>();
	return { ...actual, pricerAt: vi.fn(() => fixedPricer()) };
});

const OWNER = '0x' + 'ab'.repeat(32);
// The commands every facade enqueue starts with: they hold the desk's fee at execution to the
// previewed one.
const FEE_GUARD = [
	'desk::policy',
	'delayed_execution_config::order_fee',
	'u64::checked_sub',
	'option::destroy_some',
];
const ACCOUNT_ID = deriveAccountIdFrom(toGeneratedConfig(cfg), OWNER);

// The scenario's required cash is 500 USDC, so spare cash is whatever cash sits above it.
const spare = (raw: bigint): Partial<QueueScenario> => ({ cashBalance: 500_000_000n + raw });

// An order ID carrying `lots` payout lots (the quantity field sits at bit 100).
const orderIdWithLots = (lots: bigint) => (lots << 100n) | (10_500_000n << 70n) | (1n << 40n) | 1n;

function client(s: QueueScenario, config = cfg) {
	const q = queueClient(s);
	const pc = new PredictClient({
		network: 'testnet',
		client: q.client,
		config,
		pricingInputs: testProvider(),
	});
	return { pc, ...q };
}

// What the off-chain engine quotes on the fixture market at the fixed pricer.
async function expectedMint(
	s: QueueScenario,
	request: Parameters<typeof localMintQuote>[0]['request'],
	availableRaw?: bigint,
) {
	const object = await readMarketObject(queueClient(s).client, MARKET);
	const pricer = fixedPricer();
	return localMintQuote({
		market: { ...object, feeBands: [] },
		pricer,
		lowerTick: 10_500_000n,
		higherTick: (1n << 30n) - 1n,
		request,
		nowMs: pricer.pricedAtMs,
		feeIncentiveSubsidyRate: s.subsidyRate,
		availableRaw,
	});
}

function market(s: QueueScenario): MarketDescriptor {
	return { underlying: 'BTC', expiryMs: s.expiryMs, marketId: MARKET, side: 'up', strike: 105_000 };
}

async function preflightCode(promise: Promise<unknown>): Promise<string> {
	try {
		await promise;
	} catch (e) {
		if (e instanceof PredictPreflightError) return e.code;
		throw e;
	}
	return 'none';
}

describe('gating', () => {
	test('without a delayed-execution record the queue surface refuses, typed', async () => {
		const s = scenario();
		const pc = new PredictClient({
			network: 'testnet',
			client: queueClient(s).client,
			config: LEGACY_CFG,
		});
		await expect(
			pc.tx.enqueueMintCost(OWNER, market(s), { spend: 5, minQuantity: 0 }),
		).rejects.toThrow(PredictInputError);
		await expect(pc.read.queue(market(s))).rejects.toThrow(PredictInputError);
		await expect(pc.tx.refund(market(s))).rejects.toThrow(PredictInputError);
		expect(() => pc.queueIdFor(MARKET)).toThrow(PredictInputError);
	});

	test('the Predict upgrade alone is not enough: the companion and its desk are needed too', async () => {
		const s = scenario();
		const noDesk = new PredictClient({
			network: 'testnet',
			client: queueClient(s).client,
			config: { ...cfg, objects: { ...cfg.objects, orderDesk: undefined } },
		});
		await expect(noDesk.read.queue(market(s))).rejects.toThrow(/orderDesk/);
		expect(() => noDesk.queueIdFor(MARKET)).toThrow(PredictInputError);
		const noRegistry = new PredictClient({
			network: 'testnet',
			client: queueClient(s).client,
			config: { ...cfg, objects: { ...cfg.objects, queueRegistry: undefined } },
		});
		await expect(noRegistry.tx.claimParked(market(s), 1n)).rejects.toThrow(/queueRegistry/);
	});

	test('queueIdFor derives the queue from the registry, with no chain read', () => {
		const { pc, simulated, existenceChecks } = client(scenario());
		expect(pc.queueIdFor(MARKET)).toBe(QUEUE);
		expect(simulated).toHaveLength(0);
		expect(existenceChecks).toHaveLength(0);
	});

	test('a market without a queue is refused typed, and an existing queue is checked once', async () => {
		const missing = scenario({ queueExists: false });
		const m = client(missing);
		expect(await preflightCode(m.pc.read.queue(market(missing)))).toBe('no-queue');
		expect(
			await preflightCode(
				m.pc.tx.enqueueMintCost(OWNER, market(missing), { spend: 5, minQuantity: 0 }),
			),
		).toBe('no-queue');
		// Only the market lookup simulated: no queue read was attempted.
		expect(m.simulated.flatMap(moveCallTargets).filter((t) => t.startsWith('queue::'))).toEqual([]);

		const s = scenario();
		const { pc, existenceChecks } = client(s);
		await pc.read.queue(market(s));
		await pc.read.orders(market(s), [1n]);
		await pc.tx.refund(market(s));
		expect(existenceChecks).toEqual([QUEUE]);
	});
});

describe('queued mints', () => {
	test('enqueueMintCost builds fee guard → auth → enqueue and previews the escrow', async () => {
		const s = scenario({ available: 5_020_000n, ...spare(10_000_000_000n) });
		const { pc } = client(s);
		const { transaction, preview } = await pc.tx.enqueueMintCost(OWNER, market(s), {
			spend: 8,
			minQuantity: 1,
		});
		expect(moveCallTargets(transaction)).toEqual([
			...FEE_GUARD,
			'account::generate_auth',
			'queue::enqueue_exact_cost',
		]);
		const data = transaction.getData();
		// The guard holds the fee charged at execution to the previewed 0.02.
		const bound = data.commands[2].MoveCall!.arguments[0] as { Input: number };
		expect(bcs.u64().parse(Buffer.from(data.inputs[bound.Input].Pure!.bytes, 'base64'))).toBe(
			'20000',
		);
		// The enqueue names the market's derived queue first.
		const first = data.commands[5].MoveCall!.arguments[0] as { Input: number };
		expect(data.inputs[first.Input].UnresolvedObject?.objectId).toBe(QUEUE);
		// Escrow is min(spend, available − fee) = 5 USDC, plus the 0.02 order fee.
		expect(preview).toMatchObject({
			kindName: 'exact-cost',
			budget: 5,
			orderFee: 0.02,
			totalDebit: 5.02,
			cashNeedRaw: cashNeedBudget(5_000_000n, s.minEntryProbability),
			needsFunding: false,
			fundedInTransaction: false,
		});
		expect(preview.timing.beforeCutoff).toBe(true);
		expect(preview.timing.tauMs % 200n).toBe(0n);
	});

	test('enqueueMint escrows at most the quantity and checks its cash need', async () => {
		const s = scenario();
		const { pc } = client(s);
		const { transaction, preview } = await pc.tx.enqueueMint(OWNER, market(s), {
			quantity: 3,
			maxCost: 10,
			maxProbability: 0.6,
		});
		expect(moveCallTargets(transaction)[5]).toBe('queue::enqueue_exact_quantity');
		expect(preview).toMatchObject({
			budget: 3,
			cashNeedRaw: cashNeedExactQuantity(3_000_000n, s.minEntryProbability),
		});
		await expect(
			pc.tx.enqueueMint(OWNER, market(s), { quantity: 3.001, maxCost: 10, maxProbability: 0.6 }),
		).rejects.toThrow(PredictInputError);
		await expect(
			pc.tx.enqueueMint(OWNER, market(s), { quantity: 3, maxCost: 10, maxProbability: 0 }),
		).rejects.toThrow(PredictInputError);
	});

	test('enqueueMintAmount sizes its cash need from min(max_premium, budget)', async () => {
		const s = scenario();
		const { pc } = client(s);
		const { preview } = await pc.tx.enqueueMintAmount(OWNER, market(s), {
			spend: 2,
			minQuantity: 1,
			maxCost: 50,
		});
		expect(preview.cashNeedRaw).toBe(cashNeedBudget(2_000_000n, s.minEntryProbability));
	});

	test('enqueueMintAmount refuses a spend below the minimum premium before any read', async () => {
		const s = scenario({ ...spare(10_000_000_000n) });
		const { pc, simulated } = client(s);
		expect(
			await preflightCode(
				pc.tx.enqueueMintAmount(OWNER, market(s), { spend: 0.5, maxCost: 5, minQuantity: 0 }),
			),
		).toBe('min-premium');
		expect(simulated).toHaveLength(0);
		expect(
			await preflightCode(
				pc.tx.enqueueMintAmount(OWNER, market(s), { spend: 1, maxCost: 5, minQuantity: 0 }),
			),
		).toBe('none');
	});

	test.each([
		['not-live', { watermark: 3n }],
		['not-live', { orderFlowEnabled: false }],
		['retired', { deskWatermark: 3n }],
		['retired', { watermark: 6n }],
		['paused', { frozen: true }],
		['paused', { tradingPaused: true }],
		['paused', { mintPaused: true }],
		['stuck', { stuck: true }],
		['queue-full', { pending: [100n, 0n] as [bigint, bigint] }],
		['account-cap', { waitingOrders: 5n }],
		['fee', { available: 20_000n }],
		['min-premium', { available: 520_000n }],
		['market-cash', spare(1_000n)],
	] as [string, Partial<QueueScenario>][])('preflight refuses with %s', async (code, overrides) => {
		const s = scenario({ ...spare(10_000_000_000n), ...overrides });
		const { pc } = client(s);
		expect(
			await preflightCode(pc.tx.enqueueMintCost(OWNER, market(s), { spend: 8, minQuantity: 0 })),
		).toBe(code);
	});

	test('the Version 5 watermarks (Predict 5, desk 2) still queue', async () => {
		// The batch that opens builder fees moves both floors to the code constants these bindings
		// compile, so this SDK must keep queuing there, not report its own code retired.
		const s = scenario({ ...spare(10_000_000_000n), watermark: 5n, deskWatermark: 2n });
		const { pc } = client(s);
		expect(
			await preflightCode(pc.tx.enqueueMintCost(OWNER, market(s), { spend: 8, minQuantity: 0 })),
		).toBe('none');
	});

	test('the retirement guard follows the version the configured call target compiles', async () => {
		// Mainnet's configured Predict v4 compiles 4 and its orders v1 compiles 1, so watermarks 5 and
		// 2 retire them, while Testnet's Version 5 targets keep queuing there.
		const s = scenario({ ...spare(10_000_000_000n), watermark: 5n, deskWatermark: 2n });
		const q = queueClient(s);
		const asMainnet = {
			...cfg,
			packages: { ...cfg.packages, predictCurrentVersion: 4n, predictOrdersCurrentVersion: 1n },
		};
		const pc = new PredictClient({ network: 'testnet', client: q.client, config: asMainnet });
		expect(
			await preflightCode(pc.tx.enqueueMintCost(OWNER, market(s), { spend: 8, minQuantity: 0 })),
		).toBe('retired');
		const deskOnly = scenario({ ...spare(10_000_000_000n), watermark: 4n, deskWatermark: 2n });
		const pcDesk = new PredictClient({
			network: 'testnet',
			client: queueClient(deskOnly).client,
			config: asMainnet,
		});
		expect(
			await preflightCode(
				pcDesk.tx.enqueueMintCost(OWNER, market(deskOnly), { spend: 8, minQuantity: 0 }),
			),
		).toBe('retired');
	});

	test('preflight refuses an order whose τ lands past the cutoff', async () => {
		// Expiry 12 s out: the cutoff is expiry − max(10 s, 5 s + 5 s) = now + 2 s, τ ≈ now + 0.8 s.
		const ok = scenario({ expiryMs: BigInt(Date.now()) + 12_000n });
		expect(
			await preflightCode(
				client(ok).pc.tx.enqueueMintCost(OWNER, market(ok), { spend: 2, minQuantity: 0 }),
			),
		).toBe('none');
		const late = scenario({ expiryMs: BigInt(Date.now()) + 10_500n });
		expect(
			await preflightCode(
				client(late).pc.tx.enqueueMintCost(OWNER, market(late), { spend: 2, minQuantity: 0 }),
			),
		).toBe('past-cutoff');
	});

	test('sells pass the mint-only gates: pauses and market cash', async () => {
		const s = scenario({
			tradingPaused: true,
			mintPaused: true,
			...spare(0n),
			records: new Map([
				[
					3n,
					recordFields({
						status: 2,
						accountId: ACCOUNT_ID,
						position: { order_id: orderIdWithLots(500n) },
					}),
				],
			]),
		});
		const { pc } = client(s);
		const { preview } = await pc.tx.enqueueSell(OWNER, market(s), {
			recordId: 3n,
			quantity: 2,
			minProbability: 0.3,
			minProceeds: 0.5,
		});
		expect(preview.needsFunding).toBe(true);
	});
});

describe('queued sells', () => {
	const open = (overrides: Parameters<typeof recordFields>[0] = {}) =>
		recordFields({
			status: 2,
			accountId: ACCOUNT_ID,
			position: { order_id: orderIdWithLots(500n) }, // 5 USDC held
			...overrides,
		});
	const sell = (s: QueueScenario, quantity: number, extra: Record<string, unknown> = {}) =>
		client(s).pc.tx.enqueueSell(OWNER, market(s), {
			recordId: 3n,
			quantity,
			minProbability: 0.3,
			minProceeds: 0.5,
			...extra,
		});

	test('a short market gets rebalance_expiry_cash AFTER the enqueue', async () => {
		const s = scenario({ ...spare(100n), records: new Map([[3n, open()]]) });
		const { transaction, preview } = await sell(s, 2);
		expect(moveCallTargets(transaction)).toEqual([
			...FEE_GUARD,
			'account::generate_auth',
			'queue::enqueue_redeem_open',
			'plp::rebalance_expiry_cash',
		]);
		expect(preview).toMatchObject({
			kindName: 'redeem-open',
			budget: 0,
			totalDebit: 0.02,
			needsFunding: true,
			fundedInTransaction: true,
		});
	});

	test('a covered sell adds no rebalance unless asked; never means never', async () => {
		const s = scenario({ records: new Map([[3n, open()]]) });
		expect(moveCallTargets((await sell(s, 2)).transaction)).toHaveLength(6);
		expect(moveCallTargets((await sell(s, 2, { fundMarket: 'always' })).transaction)).toHaveLength(
			7,
		);
		const short = scenario({ ...spare(0n), records: new Map([[3n, open()]]) });
		const never = await sell(short, 2, { fundMarket: 'never' });
		expect(moveCallTargets(never.transaction)).toHaveLength(6);
		expect(never.preview.needsFunding).toBe(true);
	});

	test.each([
		['record-not-open', new Map()],
		['record-not-open', new Map([[3n, recordFields({ status: 0, accountId: ACCOUNT_ID })]])],
		[
			'not-record-owner',
			new Map([[3n, recordFields({ status: 2, position: { order_id: orderIdWithLots(500n) } })]]),
		],
	] as [string, QueueScenario['records']][])('preflight refuses with %s', async (code, records) => {
		expect(await preflightCode(sell(scenario({ records }), 2))).toBe(code);
	});

	test('the fee check is ≥ for sells', async () => {
		const records = new Map([[3n, open()]]);
		expect(await preflightCode(sell(scenario({ records, available: 20_000n }), 2))).toBe('none');
		expect(await preflightCode(sell(scenario({ records, available: 19_999n }), 2))).toBe('fee');
	});

	test('the minimum sell and the remainder it leaves', async () => {
		const records = new Map([[3n, open()]]);
		// min_sell_quantity is 1 USDC, the record holds 5.
		expect(await preflightCode(sell(scenario({ records }), 0.5))).toBe('below-min-sell');
		expect(await preflightCode(sell(scenario({ records }), 4.5))).toBe('below-min-sell');
		expect(await preflightCode(sell(scenario({ records }), 5))).toBe('none');
		expect(await preflightCode(sell(scenario({ records }), 4))).toBe('none');
		await expect(sell(scenario({ records }), 6)).rejects.toThrow(PredictInputError);
	});
});

describe('reads', () => {
	test('read.queue derives timing, acceptance and the largest mint', async () => {
		// p_min 0.5: spare cash admits a ~495 USDC budget, so the 10 USDC balance binds.
		const s = scenario({ available: 10_020_000n, minEntryProbability: 500_000_000n });
		const view = await client(s).pc.read.queue(market(s), OWNER);
		expect(view).toMatchObject({
			mode: 'delayed',
			acceptingMints: true,
			acceptingSells: true,
			refusal: { mint: null, sell: null },
		});
		expect(view.queueId).toBe(QUEUE);
		expect(view.timing.tickMs).toBe(200n);
		expect(view.maxMint.budget).toMatchObject({ limitedBy: 'balance', maxRaw: 10_000_000n });
		expect(view.maxMint.exactQuantity.limitedBy).toBe('cash');
		// Before Predict allowlists the companion, nothing is accepted, but the view still reads.
		const disabled = scenario({ orderFlowEnabled: false });
		expect(await client(disabled).pc.read.queue(market(disabled))).toMatchObject({
			mode: 'delayed',
			acceptingMints: false,
			acceptingSells: false,
			refusal: { mint: 'not-live', sell: 'not-live' },
		});
	});

	test.each([
		['mints full, sells open', { pending: [100n, 0n] }, 'queue-full', null],
		['sells full, mints open', { pending: [0n, 100n] }, null, 'queue-full'],
		['both sides full', { pending: [100n, 100n] }, 'queue-full', 'queue-full'],
		['minting paused, sells open', { mintPaused: true }, 'paused', null],
		['trading paused, sells open', { tradingPaused: true }, 'paused', null],
		['pricing delayed', { stuck: true }, 'stuck', 'stuck'],
		['frozen', { frozen: true }, 'paused', 'paused'],
		['watermark not raised', { watermark: 3n }, 'not-live', 'not-live'],
		['order flow not allowlisted', { orderFlowEnabled: false }, 'not-live', 'not-live'],
		['the desk floor retired this companion', { deskWatermark: 3n }, 'retired', 'retired'],
		['a Predict upgrade retired the code this SDK calls', { watermark: 6n }, 'retired', 'retired'],
		['the account at its cap', { waitingOrders: 5n }, 'account-cap', 'account-cap'],
	] as [string, Partial<QueueScenario>, string | null, string | null][])(
		'read.queue acceptance matches the builder gates: %s',
		async (_name, overrides, mint, sell) => {
			const s = scenario(overrides);
			const view = await client(s).pc.read.queue(market(s), OWNER);
			expect(view.refusal).toEqual({ mint, sell });
			expect(view.acceptingMints).toBe(mint == null);
			expect(view.acceptingSells).toBe(sell == null);
		},
	);

	test('read.queue acceptance past the cutoff', async () => {
		const late = scenario({ expiryMs: BigInt(Date.now()) + 10_500n });
		expect((await client(late).pc.read.queue(market(late))).refusal).toEqual({
			mint: 'past-cutoff',
			sell: 'past-cutoff',
		});
	});

	test('read.orders returns views aligned with the IDs', async () => {
		const s = scenario({ records: new Map([[1n, recordFields({ status: 1 })]]) });
		const [one, two] = await client(s).pc.read.orders(market(s), [1n, 2n]);
		expect(one).toMatchObject({ recordId: 1n, view: { state: 'priced' } });
		expect(two).toBeNull();
	});

	test('waitForOutcome polls until the record finishes, or reports it gone', async () => {
		const s = scenario({ records: new Map([[1n, recordFields({ status: 0 })]]) });
		const { pc, simulated } = client(s);
		let polls = 0;
		const original = s.records;
		// Fill the order on the third read of the record.
		const records = new Proxy(original, {
			get(target, prop) {
				if (prop === 'get') {
					return (id: bigint) => {
						polls += 1;
						return polls >= 3
							? recordFields({
									status: 2,
									position: { order_id: 9n },
									result: { quantity: 1n, amount: 1n },
								})
							: target.get(id);
					};
				}
				return Reflect.get(target, prop, target);
			},
		});
		s.records = records;
		const outcome = await pc.read.waitForOutcome(market(s), 1n, { pollMs: 1 });
		expect(outcome.outcome).toBe('filled');
		expect(simulated.length).toBeGreaterThanOrEqual(3);
		// A record never seen is polled until the timeout, since the fullnode can trail execution.
		const gone = scenario();
		const goneClient = client(gone);
		expect(
			(await goneClient.pc.read.waitForOutcome(market(gone), 7n, { pollMs: 1, timeoutMs: 20 }))
				.outcome,
		).toBe('gone');
		expect(goneClient.simulated.length).toBeGreaterThan(1);
		const pending = scenario({ records: new Map([[1n, recordFields({ status: 0 })]]) });
		expect(
			(
				await client(pending).pc.read.waitForOutcome(market(pending), 1n, {
					pollMs: 1,
					timeoutMs: 5,
				})
			).outcome,
		).toBe('timeout');
	});

	test('waitForOutcome waits for a record the fullnode shows late, and ends once a seen one goes', async () => {
		// Missing on the first two reads (the fullnode trails the enqueue), filled on the third.
		const late = scenario();
		let reads = 0;
		late.records = new Proxy(new Map(), {
			get(target, prop) {
				if (prop === 'get') {
					return () => {
						reads += 1;
						return reads >= 3
							? recordFields({
									status: 2,
									position: { order_id: 9n },
									result: { quantity: 1n, amount: 1n },
								})
							: undefined;
					};
				}
				return Reflect.get(target, prop, target);
			},
		}) as typeof late.records;
		expect(
			(await client(late).pc.read.waitForOutcome(market(late), 1n, { pollMs: 1 })).outcome,
		).toBe('filled');
		// Seen waiting, then missing (cleaned up): 'gone' at once, not at the timeout.
		const cleaned = scenario();
		let seen = 0;
		cleaned.records = new Proxy(new Map(), {
			get(target, prop) {
				if (prop === 'get') {
					return () => (++seen === 1 ? recordFields({ status: 0 }) : undefined);
				}
				return Reflect.get(target, prop, target);
			},
		}) as typeof cleaned.records;
		const started = Date.now();
		expect(
			(
				await client(cleaned).pc.read.waitForOutcome(market(cleaned), 1n, {
					pollMs: 1,
					timeoutMs: 10_000,
				})
			).outcome,
		).toBe('gone');
		expect(Date.now() - started).toBeLessThan(5_000);
	});

	test('read.executionMode reads the watermark from ProtocolConfig', async () => {
		const zero = ProtocolConfig.parse(new Uint8Array(4096));
		const at = (watermark: bigint, config = cfg) =>
			new PredictClient({
				network: 'testnet',
				config,
				client: {
					core: {
						async getObject() {
							return {
								object: {
									type: 'x',
									content: ProtocolConfig.serialize({
										...zero,
										version_watermark: watermark,
									}).toBytes(),
								},
							};
						},
					},
				} as unknown as ReadClient,
			}).read.executionMode();
		expect(await at(4n)).toBe('delayed');
		expect(await at(3n)).toBe('awaiting-cutover');
		expect(await at(3n, LEGACY_CFG)).toBe('immediate');
		expect(await at(4n, LEGACY_CFG)).toBe('unsupported');
		// Testnet records its v5 rollout, so it queues once the cutover lands.
		expect(await at(3n, TESTNET_CONFIG)).toBe('awaiting-cutover');
		expect(await at(4n, TESTNET_CONFIG)).toBe('delayed');
		// A config that records the Predict upgrade but not the order-flow package can't queue, and
		// its Predict call target has retired the immediate trades.
		const noOrders = { ...cfg, packages: { ...cfg.packages, predictOrders: undefined } };
		expect(await at(4n, noOrders)).toBe('unsupported');
		expect(await at(3n, noOrders)).toBe('awaiting-cutover');
	});
});

describe('quotes', () => {
	test('a config with the Predict upgrade but no order-flow package refuses rather than quote a retired mint', async () => {
		const s = scenario();
		const q = queueClient(s);
		const partial = new PredictClient({
			network: 'testnet',
			client: q.client,
			config: { ...cfg, packages: { ...cfg.packages, predictOrders: undefined } },
		});
		await expect(partial.read.quoteMint(OWNER, market(s), { quantity: 10 })).rejects.toThrow(
			/predictOrders/,
		);
		await expect(
			partial.read.quoteMintCost(OWNER, market(s), { spend: 8, minQuantity: 0 }),
		).rejects.toThrow(PredictInputError);
		expect(q.simulated.flatMap(moveCallTargets)).not.toContain(
			'expiry_market::mint_exact_quantity',
		);
	});

	test('quoteMint prices the queued fill off chain, with the order fee apart', async () => {
		const s = scenario();
		const { pc, simulated } = client(s);
		const q = await pc.read.quoteMint(OWNER, market(s), { quantity: 10 });
		// One simulate for the desk, the protocol's subsidy rate and builder cap, and the balance.
		// No retired view is called.
		const targets = simulated.flatMap(moveCallTargets);
		expect(targets).not.toContain('expiry_market::load_live_pricer');
		expect(targets).not.toContain('expiry_market::quote_mint_for_account');
		expect(moveCallTargets(simulated.at(-1)!)).toEqual([
			'desk::policy',
			'protocol_config::fee_incentive_subsidy_rate',
			'protocol_config::builder_fee_cap',
			'account::load_account',
			'account::balance',
		]);
		const expected = await expectedMint(
			s,
			{ shape: 'exact-quantity', quantityRaw: 10_000_000n },
			s.available,
		);
		expect(q).toMatchObject({ queued: true, orderFee: 0.02, fees: { penalty: 0 } });
		expect(q.raw.cost).toBe(expected.allInCost);
		expect(q.raw.entryProbability).toBe(expected.entryProbability);
		expect(q.raw.quantity).toBe(10_000_000n);
	});

	test('quoteMintCost quotes at the escrowable budget, min(spend, available − fee)', async () => {
		const s = scenario({ available: 3_020_000n });
		const { pc } = client(s);
		const q = await pc.read.quoteMintCost(OWNER, market(s), { spend: 8, minQuantity: 0 });
		const expected = await expectedMint(
			s,
			{ shape: 'exact-cost', maxCostRaw: 3_000_000n, minQuantityRaw: 0n },
			s.available,
		);
		expect(q.raw.cost).toBe(expected.allInCost);
		expect(q.raw.cost).toBeLessThanOrEqual(3_000_000n);
		expect(q.raw.quantity).toBe(expected.quantity);
	});

	test('quoteSell nets the order fee off the proceeds, and refuses a record that is not Open', async () => {
		// 5 USDC of an UP position at $105,000: lots, lower tick, +∞ higher tick, sequence.
		const POS_INF = (1n << 30n) - 1n;
		const held = (500n << 100n) | (10_500_000n << 70n) | (POS_INF << 40n) | 1n;
		const s = scenario({
			records: new Map([
				[3n, recordFields({ status: 2, position: { order_id: held } })],
				[4n, recordFields({ status: 1 })],
			]),
		});
		const { pc } = client(s);
		const q = await pc.read.quoteSell(OWNER, market(s), { recordId: 3n, quantity: 2 });
		const object = await readMarketObject(queueClient(s).client, MARKET);
		const pricer = fixedPricer();
		const expected = localSellQuote({
			market: { ...object, feeBands: [] },
			pricer,
			order: { lowerTick: 10_500_000n, higherTick: POS_INF, quantity: 5_000_000n },
			closeQuantityRaw: 2_000_000n,
			nowMs: pricer.pricedAtMs,
		});
		expect(q.raw.proceeds).toBe(expected.proceeds);
		expect(q.raw.probability).toBe(expected.probability);
		expect(q.quantityClosed).toBe(2);
		expect(q.fees.order).toBe(0.02);
		expect(q.net).toBeCloseTo(q.proceeds - 0.02, 9);
		expect(q.proceeds).toBeGreaterThan(0);
		await expect(
			pc.read.quoteSell(OWNER, market(s), { recordId: 4n, quantity: 2 }),
		).rejects.toMatchObject({ abortName: 'ERecordNotOpen' });
	});

	test('a quote without signed inputs is refused, typed', async () => {
		const s = scenario();
		const q = queueClient(s);
		const bare = new PredictClient({ network: 'testnet', client: q.client, config: cfg });
		await expect(bare.read.quoteMint(OWNER, market(s), { quantity: 10 })).rejects.toThrow(
			/pricingInputs/,
		);
		await expect(bare.read.price({ ...market(s), strike: 105_000 })).rejects.toThrow(
			PredictInputError,
		);
		// A call's own inputs stand in for the provider.
		const { TEST_INPUTS } = await import('./queue-fixtures.js');
		const prices = await bare.read.price(
			{ underlying: 'BTC', expiryMs: s.expiryMs, marketId: MARKET, strike: 105_000 },
			{ inputs: TEST_INPUTS },
		);
		expect(prices.up + prices.down).toBeCloseTo(1, 9);
	});
});

describe('refund and fill builders', () => {
	test('claimParked and payOpen address the existing queue and the record', async () => {
		const s = scenario();
		const { pc } = client(s);
		const claim = await pc.tx.claimParked(market(s), 4n);
		expect(moveCallTargets(claim)).toEqual(['queue::claim_parked']);
		const pay = await pc.tx.payOpen(market(s), 4n);
		expect(moveCallTargets(pay)).toEqual(['queue::pay_open']);
		for (const tx of [claim, pay]) {
			const data = tx.getData();
			const first = data.commands[0].MoveCall!.arguments[0] as { Input: number };
			expect(data.inputs[first.Input].UnresolvedObject?.objectId).toBe(QUEUE);
		}
		const missing = scenario({ queueExists: false });
		expect(await preflightCode(client(missing).pc.tx.claimParked(market(missing), 4n))).toBe(
			'no-queue',
		);
	});

	test('refund defaults to 100 visited records', async () => {
		const s = scenario();
		const tx = await client(s).pc.tx.refund(market(s));
		expect(moveCallTargets(tx)).toEqual(['queue::refund']);
		const maxOrders = tx.getData().commands[0].MoveCall!.arguments[4] as { Input: number };
		const bytes = tx.getData().inputs[maxOrders.Input].Pure!.bytes;
		expect(Buffer.from(bytes, 'base64').readBigUInt64LE()).toBe(100n);
	});

	test('fill reads Lazer State first, then builds verify → commit → resolve', async () => {
		const s = scenario();
		const q = queueClient(s);
		const lazerClient = {
			core: {
				simulateTransaction: q.client.core.simulateTransaction,
				getObjects: q.client.core.getObjects,
				async getObject() {
					// Minimal State prefix: id, no signers, an upgrade cap pointing at the current package.
					const bytes = new Uint8Array(32 + 1 + 32 + 32 + 8 + 1);
					bytes.set(Array(32).fill(0x2b), 65);
					return { object: { type: `0x${'3c'.repeat(32)}::state::State`, content: bytes } };
				},
			},
		} as unknown as ReadClient;
		const pc = new PredictClient({ network: 'testnet', client: lazerClient, config: cfg });
		const tx: Transaction = await pc.tx.fill(market(s), { payloads: [new Uint8Array([1])] });
		expect(moveCallTargets(tx)).toEqual([
			'pyth_lazer::parse_and_verify_le_ecdsa_update',
			'queue::commit',
			'queue::resolve',
		]);
		const noState = new PredictClient({
			network: 'testnet',
			client: q.client,
			config: { ...cfg, oracle: undefined },
		});
		await expect(noState.tx.fill(market(s), { payloads: [new Uint8Array([1])] })).rejects.toThrow(
			PredictInputError,
		);
	});
});

test('the launch policy fixture matches the queued fee the previews report', () => {
	expect(policyFields().order_fee).toBe(20_000n);
});

test('the queued-order surface is on the public /predict entry point', async () => {
	const predict = await import('../../src/predict/index.js');
	expect(predict.queue.REFUND_REASONS[8].key).toBe('no-cash');
	expect(typeof predict.queueTx.enqueueRedeemOpen).toBe('function');
	expect(typeof predict.queueTx.fill).toBe('function');
	expect(typeof predict.queueTx.settleStep).toBe('function');
	expect(typeof predict.queueTx.createQueue).toBe('function');
	expect(predict.queue.SETTLE_PHASE).toEqual({ DRAIN: 0, PAY: 1, DONE: 2 });
	expect(typeof predict.describePredictError).toBe('function');
	expect(predict.deriveQueueId(cfg.objects.queueRegistry!, MARKET)).toBe(QUEUE);
	expect(predict.queue.REFUND_REASONS[9].key).toBe('recipient-denied');
	expect(typeof predict.queueTx.payOpen).toBe('function');
	expect(typeof predict.queueTx.claimParked).toBe('function');
	expect(predict.toOrdersConfig(cfg).orderDesk).toBe(cfg.objects.orderDesk);
	expect(typeof predict.orderFlowWitnessType).toBe('function');
	// The companion's and the math library's generated bindings.
	expect(typeof predict.queueMoveCalls.enqueueExactCost).toBe('function');
	expect(typeof predict.queueMoveCalls.settleStep).toBe('function');
	expect(typeof predict.deskMoveCalls.setOrderFee).toBe('function');
	expect(typeof predict.orderQueueMoveCalls.statusOpen).toBe('function');
	expect(typeof predict.delayedExecutionConfigMoveCalls.orderFee).toBe('function');
	expect(typeof predict.queueEvents.OrderEnqueued.parse).toBe('function');
	expect(typeof predict.predictMathMoveCalls.orderTerms).toBe('function');
	expect(typeof predict.lazerPriceMoveCalls.spot).toBe('function');
	// Predict no longer has a desk constructor, policy setters or queue entry points.
	expect('createAndShare' in predict.deskMoveCalls).toBe(false);
	expect('initDelayedExecutionPolicy' in predict.protocolConfigMoveCalls).toBe(false);
	expect('setOrderFee' in predict.protocolConfigMoveCalls).toBe(false);
	expect('enqueueExactCost' in predict.expiryMarketMoveCalls).toBe(false);
	expect('isPreviewUnavailable' in predict).toBe(false);
});

// Market resolution and strike conversion, through the queued mint (the immediate trades that
// used to carry these checks are retired).
describe('market resolution and strikes', () => {
	const POS_INF = (1n << 30n) - 1n;
	// The version 5 placement: queue, market, wrapper, auth, desk, config, the four Propbook
	// objects, then lower tick (10), higher tick (11) and quantity (12).
	function placed(tx: Transaction) {
		const data = tx.getData();
		const idx = data.commands.findIndex((c) =>
			c.MoveCall?.function.startsWith('enqueue_exact_quantity'),
		);
		const u64At = (arg: number) => {
			const a = data.commands[idx].MoveCall!.arguments[arg] as { Input: number };
			return Buffer.from(data.inputs[a.Input].Pure!.bytes, 'base64').readBigUInt64LE();
		};
		return { lower: u64At(10), higher: u64At(11), quantity: u64At(12) };
	}
	const mint = (pc: PredictClient, m: MarketDescriptor, quantity = 50) =>
		pc.tx.enqueueMint(OWNER, m, { quantity, maxCost: quantity, maxProbability: 0.99 });

	test('converts quantity and ticks against a resolved market', async () => {
		const s = scenario();
		const { transaction } = await mint(client(s).pc, market(s));
		expect(placed(transaction)).toEqual({
			lower: 10_500_000n,
			higher: POS_INF,
			quantity: 50_000_000n,
		});
	});

	test('a strike off the coarser admission grid is refused before the chain sees it', async () => {
		const s = scenario({ admissionTickSizeRaw: 100_000_000_000n });
		const { pc } = client(s);
		await expect(mint(pc, { ...market(s), strike: 105_000.01 })).rejects.toThrow(/admission grid/);
		await expect(mint(pc, market(s))).resolves.toBeDefined();
	});

	test('a sub-lot quantity is refused, for mints and sells', async () => {
		const s = scenario({ records: new Map([[3n, recordFields({ status: 2 })]]) });
		const { pc } = client(s);
		await expect(mint(pc, market(s), 0.001)).rejects.toThrow(/lot/);
		await expect(
			pc.tx.enqueueSell(OWNER, market(s), {
				recordId: 3n,
				quantity: 0.001,
				minProbability: 0,
				minProceeds: 0,
			}),
		).rejects.toThrow(/lot/);
	});

	test('the reference strike uses the market reference tick, on either bound', async () => {
		const s = scenario();
		const { pc } = client(s);
		const up = await mint(pc, { ...market(s), strike: 'reference' });
		expect(placed(up.transaction)).toMatchObject({ lower: 10_500_000n, higher: POS_INF });
		const down = await mint(pc, { ...market(s), strike: 'reference', side: 'down' });
		expect(placed(down.transaction)).toMatchObject({ lower: 0n, higher: 10_500_000n });
		const unset = scenario({ referenceTick: null });
		await expect(mint(client(unset).pc, { ...market(unset), strike: 'reference' })).rejects.toThrow(
			/reference price not set/,
		);
	});

	test('a range converts both bounds to finite grid ticks, and refuses bad bounds', async () => {
		const s = scenario();
		const { pc } = client(s);
		const range = {
			underlying: 'BTC',
			expiryMs: s.expiryMs,
			marketId: MARKET,
			side: 'range',
			lower: 104_000,
			upper: 106_000,
		} as const;
		const { transaction } = await mint(pc, range);
		expect(placed(transaction)).toMatchObject({ lower: 10_400_000n, higher: 10_600_000n });
		await expect(mint(pc, { ...range, upper: 106_000.005 })).rejects.toThrow(/tick grid/);
		await expect(mint(pc, { ...range, lower: 106_000, upper: 104_000 })).rejects.toThrow(
			/below upper/,
		);
		await expect(mint(pc, { ...range, upper: 104_000 })).rejects.toThrow(/below upper/);
		await expect(mint(pc, { ...range, lower: 0 })).rejects.toThrow(/finite tick domain/);
	});
});

// The reads that price a market off chain, at the fixed pricer.
describe('off-chain prices and NAV', () => {
	test('read.price prices both sides of a strike from one pricer', async () => {
		const s = scenario();
		const { pc } = client(s);
		const p = await pc.read.price({
			underlying: 'BTC',
			expiryMs: s.expiryMs,
			marketId: MARKET,
			strike: 105_000,
		});
		const { upProbability } = await import('../../src/predict/pricing.js');
		expect(p.up).toBeCloseTo(upProbability(fixedPricer(), 105_000), 9);
		expect(p.up + p.down).toBeCloseTo(1, 9);
		const board = await pc.read.pricer({
			underlying: 'BTC',
			expiryMs: s.expiryMs,
			marketId: MARKET,
		});
		expect(board.up(105_000)).toBeCloseTo(p.up, 9);
		expect(board.asOf.blockScholesSviMs).toBe(3_000);
	});

	test('read.market reports the NAV mark: free cash less the marked liability', async () => {
		const s = scenario({ cashBalance: 750_000_000n });
		const q = queueClient(s);
		const pc = new PredictClient({
			network: 'testnet',
			client: q.client,
			config: cfg,
			pricingInputs: testProvider(),
		});
		const summary = await pc.read.market({ underlying: 'BTC', expiryMs: s.expiryMs });
		// The fixture market's payout tree is empty, so the whole free cash is the mark.
		expect(summary).toMatchObject({ id: MARKET, nav: 750, mintPaused: false });
	});
});

// Predict version 6, `deepbook_predict_orders` version 3 and the math library with
// `block_scholes`: placement takes no Propbook object, and every call targets the new packages.
describe('Predict version 6', () => {
	const V6 = '0x' + '66'.repeat(32);
	const O3 = '0x' + '03'.repeat(32);
	const M3 = '0x' + '3b'.repeat(32);
	const V6_CFG = {
		...cfg,
		packages: { ...cfg.packages, predictV6: V6, predictOrdersV3: O3, predictMathV3: M3 },
	};
	const propbookIds = [
		cfg.objects.oracleRegistry,
		cfg.underlyings.BTC.pythFeed,
		cfg.underlyings.BTC.blockScholesValueStore,
		cfg.underlyings.BTC.blockScholesSviStore,
	].map((id) => normalizeSuiAddress(id));
	const objectInputs = (tx: Transaction) =>
		tx
			.getData()
			.inputs.flatMap((i) =>
				i.UnresolvedObject ? [normalizeSuiAddress(i.UnresolvedObject.objectId)] : [],
			);
	const packagesOf = (tx: Transaction) =>
		tx
			.getData()
			.commands.flatMap((c) =>
				c.MoveCall
					? [
							`${normalizeSuiAddress(c.MoveCall.package)}::${c.MoveCall.module}::${c.MoveCall.function}`,
						]
					: [],
			);

	test('a queued mint places with enqueue_*_v2 on orders v3, naming no Propbook object', async () => {
		const s = scenario({ watermark: 6n, deskWatermark: 3n });
		const { pc } = client(s, V6_CFG);
		const { transaction } = await pc.tx.enqueueMintCost(OWNER, market(s), {
			spend: 5,
			minQuantity: 0,
		});
		const calls = packagesOf(transaction);
		expect(calls).toContain(`${O3}::queue::enqueue_exact_cost_v2`);
		expect(calls).toContain(`${O3}::desk::policy`);
		expect(objectInputs(transaction).filter((id) => propbookIds.includes(id))).toEqual([]);
	});

	test('a funded sell places with enqueue_redeem_open_v2 and funds through Predict version 6', async () => {
		const held = (500n << 100n) | (10_500_000n << 70n) | (((1n << 30n) - 1n) << 40n) | 1n;
		const s = scenario({
			watermark: 6n,
			deskWatermark: 3n,
			records: new Map([
				[7n, recordFields({ status: 2, accountId: ACCOUNT_ID, position: { order_id: held } })],
			]),
		});
		const { pc } = client(s, V6_CFG);
		const { transaction } = await pc.tx.enqueueSell(OWNER, market(s), {
			recordId: 7n,
			quantity: 2,
			minProbability: 0,
			minProceeds: 0,
			fundMarket: 'always',
		});
		const calls = packagesOf(transaction);
		expect(calls).toContain(`${O3}::queue::enqueue_redeem_open_v2`);
		expect(calls).toContain(`${V6}::plp::rebalance_expiry_cash`);
		expect(objectInputs(transaction).filter((id) => propbookIds.includes(id))).toEqual([]);
	});

	test('the version guards expect Predict 6 and orders 3 once the config records them', async () => {
		const s = scenario({ watermark: 6n, deskWatermark: 3n });
		expect((await client(s, V6_CFG).pc.read.queue(market(s))).refusal.mint).toBeNull();
		// The same watermarks retire a config still calling the version 5 packages.
		expect((await client(s).pc.read.queue(market(s))).refusal.mint).toBe('retired');
		const later = scenario({ watermark: 7n, deskWatermark: 3n });
		expect((await client(later, V6_CFG).pc.read.queue(market(later))).refusal.mint).toBe('retired');
	});

	test('a config recording only one of Predict 6 and orders 3 is refused', () => {
		const s = scenario();
		const q = queueClient(s);
		for (const packages of [
			{ ...cfg.packages, predictV6: V6 },
			{ ...cfg.packages, predictOrdersV3: O3 },
		]) {
			const pc = new PredictClient({
				network: 'testnet',
				client: q.client,
				config: { ...cfg, packages },
			});
			expect(() => pc.queueIdFor(MARKET)).toThrow(/version 6/);
		}
	});

	test('the version 6 fill needs the math library with block_scholes and the Block Scholes batches', async () => {
		const s = scenario({ watermark: 6n, deskWatermark: 3n });
		const noMath = client(s, {
			...V6_CFG,
			packages: { ...V6_CFG.packages, predictMathV3: undefined },
		});
		const lazerClient = {
			core: {
				...noMath.client.core,
				async getObject() {
					const bytes = new Uint8Array(32 + 1 + 32 + 32 + 8 + 1);
					return { object: { type: `0x${'3c'.repeat(32)}::state::State`, content: bytes } };
				},
			},
		} as unknown as ReadClient;
		const pc = new PredictClient({
			network: 'testnet',
			client: lazerClient,
			config: { ...V6_CFG, packages: { ...V6_CFG.packages, predictMathV3: undefined } },
		});
		await expect(pc.tx.fill(market(s), { payloads: [new Uint8Array([1])] })).rejects.toThrow(
			/predictMathV3/,
		);
	});
});
