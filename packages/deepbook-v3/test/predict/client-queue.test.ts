// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the facade's queued-order builders, preflight, reads and quotes,
// against a mocked chain. Each preflight code is driven from the one chain fact behind it.
import type { Transaction } from '@mysten/sui/transactions';
import { describe, expect, test } from 'vitest';
import { ProtocolConfig } from '../../src/contracts/deepbook_predict/protocol_config.js';
import { PredictClient, type MarketDescriptor } from '../../src/predict/client.js';
import { TESTNET_CONFIG } from '../../src/predict/config/index.js';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import { PredictInputError, PredictPreflightError } from '../../src/predict/errors.js';
import { cashNeedBudget, cashNeedExactQuantity } from '../../src/predict/queue.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';
import { deriveAccountIdFrom } from '../../src/predict/tx/common.js';
import {
	QUEUE_CFG as cfg,
	moveCallTargets,
	policyFields,
	queueClient,
	recordFields,
	scenario,
	type QueueScenario,
} from './queue-fixtures.js';

const OWNER = '0x' + 'ab'.repeat(32);
const MARKET = '0x' + 'cd'.repeat(32);
const ACCOUNT_ID = deriveAccountIdFrom(toGeneratedConfig(cfg), OWNER);

// An order ID carrying `lots` payout lots (the quantity field sits at bit 100).
const orderIdWithLots = (lots: bigint) => (lots << 100n) | (10_500_000n << 70n) | (1n << 40n) | 1n;

function client(s: QueueScenario) {
	const q = queueClient(s);
	return { pc: new PredictClient({ network: 'testnet', client: q.client, config: cfg }), ...q };
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
			config: TESTNET_CONFIG,
		});
		await expect(
			pc.tx.enqueueMintCost(OWNER, market(s), { spend: 5, minQuantity: 0 }),
		).rejects.toThrow(PredictInputError);
		await expect(pc.read.queue(market(s))).rejects.toThrow(PredictInputError);
		await expect(pc.tx.refund(market(s))).rejects.toThrow(PredictInputError);
	});
});

describe('queued mints', () => {
	test('enqueueMintCost builds auth → enqueue and previews the escrow', async () => {
		const s = scenario({ available: 5_020_000n, spareCash: 10_000_000_000n });
		const { pc } = client(s);
		const { transaction, preview } = await pc.tx.enqueueMintCost(OWNER, market(s), {
			spend: 8,
			minQuantity: 1,
		});
		expect(moveCallTargets(transaction)).toEqual([
			'account::generate_auth',
			'expiry_market::enqueue_exact_cost',
		]);
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
		expect(moveCallTargets(transaction)[1]).toBe('expiry_market::enqueue_exact_quantity');
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

	test.each([
		['not-live', { watermark: 3n }],
		['not-live', { policy: null }],
		['paused', { frozen: true }],
		['paused', { tradingPaused: true }],
		['paused', { mintPaused: true }],
		['stuck', { stuck: true }],
		['queue-full', { pending: [100n, 0n] as [bigint, bigint] }],
		['account-cap', { waitingOrders: 5n }],
		['fee', { available: 20_000n }],
		['min-premium', { available: 520_000n }],
		['market-cash', { spareCash: 1_000n }],
	] as [string, Partial<QueueScenario>][])('preflight refuses with %s', async (code, overrides) => {
		const s = scenario({ spareCash: 10_000_000_000n, ...overrides });
		const { pc } = client(s);
		expect(
			await preflightCode(pc.tx.enqueueMintCost(OWNER, market(s), { spend: 8, minQuantity: 0 })),
		).toBe(code);
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
			spareCash: 0n,
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
		const s = scenario({ spareCash: 100n, records: new Map([[3n, open()]]) });
		const { transaction, preview } = await sell(s, 2);
		expect(moveCallTargets(transaction)).toEqual([
			'account::generate_auth',
			'expiry_market::enqueue_redeem_open',
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
		expect(moveCallTargets((await sell(s, 2)).transaction)).toHaveLength(2);
		expect(moveCallTargets((await sell(s, 2, { fundMarket: 'always' })).transaction)).toHaveLength(
			3,
		);
		const short = scenario({ spareCash: 0n, records: new Map([[3n, open()]]) });
		const never = await sell(short, 2, { fundMarket: 'never' });
		expect(moveCallTargets(never.transaction)).toHaveLength(2);
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
		expect(view.timing!.tickMs).toBe(200n);
		expect(view.maxMint!.budget).toMatchObject({ limitedBy: 'balance', maxRaw: 10_000_000n });
		expect(view.maxMint!.exactQuantity.limitedBy).toBe('cash');
		const unset = scenario({ policy: null });
		expect(await client(unset).pc.read.queue(market(unset))).toMatchObject({
			timing: null,
			maxMint: null,
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
		const gone = scenario();
		expect((await client(gone).pc.read.waitForOutcome(market(gone), 7n)).outcome).toBe('gone');
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
		expect(await at(3n, TESTNET_CONFIG)).toBe('immediate');
		expect(await at(4n, TESTNET_CONFIG)).toBe('unsupported');
	});
});

describe('quotes', () => {
	test('quoteMint previews a queued fill: no penalty in the cost, the order fee apart', async () => {
		const s = scenario();
		const { pc, simulated } = client(s);
		const q = await pc.read.quoteMint(OWNER, market(s), { quantity: 10 });
		expect(moveCallTargets(simulated.at(-1)!)).toEqual([
			'expiry_market::load_live_pricer',
			'expiry_market::quote_mint_for_account',
			'protocol_config::delayed_execution_policy',
		]);
		// all_in_cost 4.09 includes a 0.007 penalty a queued fill doesn't pay.
		expect(q).toMatchObject({ queued: true, cost: 4.083, orderFee: 0.02, fees: { penalty: 0 } });
		expect(q.raw.cost).toBe(4_083_000n);
	});

	test('quoteMintCost quotes at the escrowable budget, min(spend, available − fee)', async () => {
		const s = scenario({ available: 3_020_000n });
		const { pc, simulated } = client(s);
		await pc.read.quoteMintCost(OWNER, market(s), { spend: 8, minQuantity: 0 });
		const quoteTx = simulated.at(-1)!;
		expect(moveCallTargets(quoteTx)[1]).toBe('expiry_market::quote_mint_exact_cost_for_account');
		const maxCostArg = quoteTx.getData().commands[1].MoveCall!.arguments[6] as { Input: number };
		const bytes = quoteTx.getData().inputs[maxCostArg.Input].Pure!.bytes;
		expect(Buffer.from(bytes, 'base64').readBigUInt64LE()).toBe(3_000_000n);
	});

	test('quoteSell nets the order fee off the proceeds', async () => {
		const s = scenario();
		const q = await client(s).pc.read.quoteSell(OWNER, market(s), { recordId: 3n, quantity: 2 });
		expect(q).toMatchObject({
			proceeds: 0.79,
			net: 0.77,
			fees: { order: 0.02 },
			quantityClosed: 2,
		});
	});
});

describe('refund and fill builders', () => {
	test('refund defaults to 100 visited records', async () => {
		const s = scenario();
		const tx = await client(s).pc.tx.refund(market(s));
		expect(moveCallTargets(tx)).toEqual(['expiry_market::refund']);
	});

	test('fill reads Lazer State first, then builds verify → commit → resolve', async () => {
		const s = scenario();
		const q = queueClient(s);
		const lazerClient = {
			core: {
				simulateTransaction: q.client.core.simulateTransaction,
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
			'expiry_market::commit',
			'expiry_market::resolve',
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
	expect(typeof predict.describePredictError).toBe('function');
	expect(typeof predict.orderQueueMoveCalls.statusOpen).toBe('function');
	expect(typeof predict.delayedExecutionConfigMoveCalls.orderFee).toBe('function');
});
