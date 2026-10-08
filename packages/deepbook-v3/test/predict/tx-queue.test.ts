// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the PTB each queued-order thunk emits, and its static checks. Every
// queued-order call targets the order-flow companion (`deepbook_predict_orders::queue`) and names
// the market's `MarketQueue` and the companion's `OrderDesk` next to the market.
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { describe, expect, test } from 'vitest';
import { toGeneratedConfig, toOrdersConfig } from '../../src/predict/config/generated.js';
import { PredictInputError } from '../../src/predict/errors.js';
import {
	adminRefund,
	cleanup,
	commit,
	createQueue,
	enqueueExactAmount,
	enqueueExactCost,
	enqueueExactQuantity,
	enqueueRedeemOpen,
	fill,
	rebalanceExpiryCash,
	refund,
	resolve,
	settleStep,
} from '../../src/predict/tx/queue.js';
import { U64_MAX } from '../../src/predict/units.js';
import {
	DESK,
	MARKET,
	ORDERS_PKG,
	QUEUE,
	QUEUE_CFG as cfg,
	moveCallTargets,
} from './queue-fixtures.js';

const config = toOrdersConfig(cfg);
const btc = cfg.underlyings.BTC;
const WRAPPER = '0x' + 'ef'.repeat(32);
const target = {
	expiryMarketId: MARKET,
	wrapperId: WRAPPER,
	pythFeed: btc.pythFeed,
	blockScholesValueStore: btc.blockScholesValueStore,
	blockScholesSviStore: btc.blockScholesSviStore,
};
const b64 = (v: bigint) => Buffer.from(bcs.u64().serialize(v).toBytes()).toString('base64');
const LAZER = {
	stateId: '0x' + '1a'.repeat(32),
	packageId: '0x' + '2b'.repeat(32),
	originalId: '0x' + '3c'.repeat(32),
};

function call(tx: Transaction, cmdIdx: number) {
	return tx.getData().commands[cmdIdx].MoveCall!;
}

function arg(tx: Transaction, cmdIdx: number, argIdx: number) {
	const a = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	return a.$kind === 'Input' ? tx.getData().inputs[a.Input!] : undefined;
}

function objectId(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const input = arg(tx, cmdIdx, argIdx);
	return input?.UnresolvedObject?.objectId ?? input?.Object?.SharedObject?.objectId;
}

const pure = (tx: Transaction, cmdIdx: number, argIdx: number) =>
	arg(tx, cmdIdx, argIdx)?.Pure?.bytes;

function build(thunk: (tx: Transaction) => unknown): Transaction {
	const tx = new Transaction();
	tx.add(thunk as never);
	return tx;
}

const id = normalizeSuiObjectId;

describe('the orders config', () => {
	test('carries the companion package, its original ID, the math library and the desk', () => {
		expect(config.predictOrdersPackageId).toBe(ORDERS_PKG);
		expect(config.predictOrdersPackageIdV1).toBe(ORDERS_PKG);
		expect(config.orderDesk).toBe(DESK);
		expect(config.predictMathPackageId).toBe(cfg.packages.predictMath);
		// Predict's own keys are still there, for the calls the companion makes into it.
		expect(config.predictPackageId).toBe(cfg.packages.predict);
		expect(config.protocolConfig).toBe(cfg.objects.protocolConfig);
	});

	test('the original ID follows predictOrdersV1 once the companion is upgraded', () => {
		const upgraded = toOrdersConfig({
			...cfg,
			packages: { ...cfg.packages, predictOrders: '0x' + '77'.repeat(32) },
		});
		expect(upgraded.predictOrdersPackageIdV1).toBe('0x' + '77'.repeat(32));
		const pinned = toOrdersConfig({
			...cfg,
			packages: {
				...cfg.packages,
				predictOrders: '0x' + '77'.repeat(32),
				predictOrdersV1: ORDERS_PKG,
			},
		});
		expect(pinned.predictOrdersPackageId).toBe('0x' + '77'.repeat(32));
		expect(pinned.predictOrdersPackageIdV1).toBe(ORDERS_PKG);
	});

	test('throws, naming what is missing, while delayed execution is unrecorded', () => {
		expect(() =>
			toOrdersConfig({ ...cfg, objects: { ...cfg.objects, orderDesk: undefined } }),
		).toThrow(/objects\.orderDesk/);
		expect(() =>
			toOrdersConfig({ ...cfg, packages: { ...cfg.packages, predictOrders: undefined } }),
		).toThrow(/packages\.predictOrders/);
		expect(() =>
			toOrdersConfig({ ...cfg, packages: { ...cfg.packages, predictDelayedExecution: undefined } }),
		).toThrow(PredictInputError);
	});
});

describe('queued mints', () => {
	test('enqueueExactQuantity: auth, then the companion call with queue, market and desk', () => {
		const tx = build(
			enqueueExactQuantity(config, {
				...target,
				lowerTick: 10_500_000n,
				higherTick: 10_600_000n,
				quantityRaw: 10_000_000n,
				maxCostRaw: 6_000_000n,
				maxProbabilityRaw: 600_000_000n,
			}),
		);
		expect(moveCallTargets(tx)).toEqual([
			'account::generate_auth',
			'queue::enqueue_exact_quantity',
		]);
		const enqueue = call(tx, 1);
		expect(id(enqueue.package)).toBe(id(ORDERS_PKG));
		// queue, market, wrapper, auth, desk, config, propbook_registry, pyth, bs_values, bs_svi, …
		expect(objectId(tx, 1, 0)).toBe(id(QUEUE));
		expect(objectId(tx, 1, 1)).toBe(id(MARKET));
		expect(objectId(tx, 1, 2)).toBe(id(WRAPPER));
		expect(enqueue.arguments[3]).toEqual({ $kind: 'Result', Result: 0 });
		expect(objectId(tx, 1, 4)).toBe(id(DESK));
		expect(objectId(tx, 1, 5)).toBe(id(cfg.objects.protocolConfig));
		expect(objectId(tx, 1, 6)).toBe(id(cfg.objects.oracleRegistry));
		expect(objectId(tx, 1, 7)).toBe(id(btc.pythFeed));
		expect(objectId(tx, 1, 8)).toBe(id(btc.blockScholesValueStore));
		expect(objectId(tx, 1, 9)).toBe(id(btc.blockScholesSviStore));
		expect([10, 11, 12, 13, 14].map((i) => pure(tx, 1, i))).toEqual([
			b64(10_500_000n),
			b64(10_600_000n),
			b64(10_000_000n),
			b64(6_000_000n),
			b64(600_000_000n),
		]);
		// AccumulatorRoot and Clock are injected; no load_live_pricer is needed.
		expect(objectId(tx, 1, 15)).toBe(id('0xacc'));
		expect(objectId(tx, 1, 16)).toBe(id('0x6'));
		expect(enqueue.arguments).toHaveLength(17);
	});

	test('the queue ID defaults to the derived one, and an explicit queueId wins', () => {
		const other = '0x' + '99'.repeat(32);
		const tx = build(
			enqueueExactCost(config, {
				...target,
				queueId: other,
				lowerTick: 1n,
				higherTick: 2n,
				maxCostRaw: 5_000_000n,
				minQuantityRaw: 0n,
			}),
		);
		expect(objectId(tx, 1, 0)).toBe(id(other));
	});

	test('enqueueExactAmount and enqueueExactCost pass their limits in Move order', () => {
		const amount = build(
			enqueueExactAmount(config, {
				...target,
				lowerTick: 1n,
				higherTick: 2n,
				maxPremiumRaw: 3_000_000n,
				minQuantityRaw: 4_000_000n,
				maxCostRaw: 3_500_000n,
			}),
		);
		expect(moveCallTargets(amount)[1]).toBe('queue::enqueue_exact_amount');
		expect([12, 13, 14].map((i) => pure(amount, 1, i))).toEqual([
			b64(3_000_000n),
			b64(4_000_000n),
			b64(3_500_000n),
		]);
		const costTx = build(
			enqueueExactCost(config, {
				...target,
				lowerTick: 1n,
				higherTick: 2n,
				maxCostRaw: 5_000_000n,
				minQuantityRaw: 7_000_000n,
			}),
		);
		expect(moveCallTargets(costTx)[1]).toBe('queue::enqueue_exact_cost');
		expect([12, 13].map((i) => pure(costTx, 1, i))).toEqual([b64(5_000_000n), b64(7_000_000n)]);
	});

	test('a zero or unlimited max_cost is refused before any PTB is built', () => {
		for (const maxCostRaw of [0n, U64_MAX, -1n]) {
			expect(() =>
				enqueueExactCost(config, {
					...target,
					lowerTick: 1n,
					higherTick: 2n,
					maxCostRaw,
					minQuantityRaw: 0n,
				}),
			).toThrow(PredictInputError);
			expect(() =>
				enqueueExactAmount(config, {
					...target,
					lowerTick: 1n,
					higherTick: 2n,
					maxPremiumRaw: 1_000_000n,
					minQuantityRaw: 0n,
					maxCostRaw,
				}),
			).toThrow(PredictInputError);
		}
		expect(() =>
			enqueueExactCost(config, {
				...target,
				lowerTick: 1n,
				higherTick: 2n,
				maxCostRaw: U64_MAX - 1n,
				minQuantityRaw: 0n,
			}),
		).not.toThrow();
	});

	test('exact amount refuses a premium cap below the minimum premium', () => {
		const base = {
			...target,
			lowerTick: 1n,
			higherTick: 2n,
			minQuantityRaw: 0n,
			maxCostRaw: 5_000_000n,
		};
		expect(() => enqueueExactAmount(config, { ...base, maxPremiumRaw: 999_999n })).toThrow(
			/minimum premium/,
		);
		expect(() => enqueueExactAmount(config, { ...base, maxPremiumRaw: 1_000_000n })).not.toThrow();
	});

	test('exact quantity requires a probability cap in (0, 1e9]', () => {
		const base = {
			...target,
			lowerTick: 1n,
			higherTick: 2n,
			quantityRaw: 10_000n,
			maxCostRaw: 10_000n,
		};
		expect(() => enqueueExactQuantity(config, { ...base, maxProbabilityRaw: 0n })).toThrow(
			PredictInputError,
		);
		expect(() =>
			enqueueExactQuantity(config, { ...base, maxProbabilityRaw: 1_000_000_001n }),
		).toThrow(PredictInputError);
		expect(() =>
			enqueueExactQuantity(config, { ...base, maxProbabilityRaw: 1_000_000_000n }),
		).not.toThrow();
	});
});

describe('queued sells', () => {
	test('enqueueRedeemOpen takes the record ID (u64), the close quantity and both floors', () => {
		const tx = build(
			enqueueRedeemOpen(config, {
				...target,
				recordId: 42n,
				closeQuantityRaw: 2_000_000n,
				minProbabilityRaw: 350_000_000n,
				minProceedsRaw: 700_000n,
			}),
		);
		expect(moveCallTargets(tx)).toEqual(['account::generate_auth', 'queue::enqueue_redeem_open']);
		expect(objectId(tx, 1, 0)).toBe(id(QUEUE));
		expect(objectId(tx, 1, 4)).toBe(id(DESK));
		expect([10, 11, 12, 13].map((i) => pure(tx, 1, i))).toEqual([
			b64(42n),
			b64(2_000_000n),
			b64(350_000_000n),
			b64(700_000n),
		]);
	});

	test('a zero close quantity is refused; zero floors are allowed on purpose', () => {
		const base = { ...target, recordId: 1n, minProbabilityRaw: 0n, minProceedsRaw: 0n };
		expect(() => enqueueRedeemOpen(config, { ...base, closeQuantityRaw: 0n })).toThrow(
			PredictInputError,
		);
		expect(() => enqueueRedeemOpen(config, { ...base, closeQuantityRaw: 1n })).not.toThrow();
	});
});

describe('refunds, rebalance and the keeper steps', () => {
	test('refund needs no auth: queue, market, desk, config, max_orders, clock', () => {
		const tx = build(refund(config, { expiryMarketId: MARKET, maxOrders: 100n }));
		expect(moveCallTargets(tx)).toEqual(['queue::refund']);
		expect(id(call(tx, 0).package)).toBe(id(ORDERS_PKG));
		expect(objectId(tx, 0, 0)).toBe(id(QUEUE));
		expect(objectId(tx, 0, 1)).toBe(id(MARKET));
		expect(objectId(tx, 0, 2)).toBe(id(DESK));
		expect(objectId(tx, 0, 3)).toBe(id(cfg.objects.protocolConfig));
		expect(pure(tx, 0, 4)).toBe(b64(100n));
		expect(objectId(tx, 0, 5)).toBe(id('0x6'));
	});

	test('adminRefund takes the AdminCap after the market, then the record IDs', () => {
		const cap = '0x' + 'ad'.repeat(32);
		const tx = build(
			adminRefund(config, { expiryMarketId: MARKET, adminCapId: cap, recordIds: [3n, 5n] }),
		);
		expect(moveCallTargets(tx)).toEqual(['queue::admin_refund']);
		expect(objectId(tx, 0, 0)).toBe(id(QUEUE));
		expect(objectId(tx, 0, 1)).toBe(id(MARKET));
		expect(objectId(tx, 0, 2)).toBe(id(cap));
		expect(objectId(tx, 0, 3)).toBe(id(DESK));
		expect(objectId(tx, 0, 4)).toBe(id(cfg.objects.protocolConfig));
		expect(pure(tx, 0, 5)).toBe(
			Buffer.from(bcs.vector(bcs.u64()).serialize([3n, 5n]).toBytes()).toString('base64'),
		);
	});

	test('cleanup and settleStep address the derived queue', () => {
		const clean = build(cleanup(config, { expiryMarketId: MARKET, recordIds: [1n] }));
		expect(moveCallTargets(clean)).toEqual(['queue::cleanup']);
		// queue, market, desk, record_ids, clock: no ProtocolConfig.
		expect(objectId(clean, 0, 0)).toBe(id(QUEUE));
		expect(objectId(clean, 0, 2)).toBe(id(DESK));
		expect(call(clean, 0).arguments).toHaveLength(5);
		const step = build(settleStep(config, { expiryMarketId: MARKET }));
		expect(moveCallTargets(step)).toEqual(['queue::settle_step']);
		expect([0, 1, 2, 3].map((i) => objectId(step, 0, i))).toEqual(
			[QUEUE, MARKET, DESK, cfg.objects.protocolConfig].map((v) => id(v)),
		);
	});

	test('createQueue takes the desk mutably and the market, and no queue', () => {
		const tx = build(createQueue(config, { expiryMarketId: MARKET }));
		expect(moveCallTargets(tx)).toEqual(['queue::create_and_share']);
		expect(objectId(tx, 0, 0)).toBe(id(DESK));
		expect(objectId(tx, 0, 1)).toBe(id(MARKET));
		expect(call(tx, 0).arguments).toHaveLength(2);
	});

	test('rebalanceExpiryCash stays a Predict call: the vault from config and no target', () => {
		const tx = build(rebalanceExpiryCash(toGeneratedConfig(cfg), { expiryMarketId: MARKET }));
		expect(moveCallTargets(tx)).toEqual(['plp::rebalance_expiry_cash']);
		expect(id(call(tx, 0).package)).toBe(id(cfg.packages.predict));
		expect(objectId(tx, 0, 0)).toBe(id(cfg.objects.poolVault));
		expect(objectId(tx, 0, 1)).toBe(id(MARKET));
		expect(objectId(tx, 0, 2)).toBe(id(cfg.objects.protocolConfig));
	});

	test('fill: verify each payload, collect typed updates, commit, resolve, then refund', () => {
		const tx = build(
			fill(config, {
				expiryMarketId: MARKET,
				payloads: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])],
				lazer: LAZER,
				maxOrders: 12n,
				refundOverdue: true,
			}),
		);
		const commands = tx.getData().commands;
		expect(commands.map((c) => c.$kind)).toEqual([
			'MoveCall',
			'MoveCall',
			'MakeMoveVec',
			'MoveCall',
			'MoveCall',
			'MoveCall',
		]);
		const verify = call(tx, 0);
		expect(`${id(verify.package)}::${verify.module}::${verify.function}`).toBe(
			`${id(LAZER.packageId)}::pyth_lazer::parse_and_verify_le_ecdsa_update`,
		);
		expect(objectId(tx, 0, 0)).toBe(id(LAZER.stateId));
		expect(objectId(tx, 0, 1)).toBe(id('0x6'));
		const vec = commands[2].MakeMoveVec!;
		expect(vec.type).toBe(`${id(LAZER.originalId)}::update::Update`);
		expect(vec.elements).toEqual([
			{ $kind: 'Result', Result: 0 },
			{ $kind: 'Result', Result: 1 },
		]);
		expect(moveCallTargets(tx).slice(2)).toEqual([
			'queue::commit',
			'queue::resolve',
			'queue::refund',
		]);
		// commit: queue, market, desk, config, updates, clock.
		expect([0, 1, 2, 3].map((i) => objectId(tx, 3, i))).toEqual(
			[QUEUE, MARKET, DESK, cfg.objects.protocolConfig].map((v) => id(v)),
		);
		expect(call(tx, 3).arguments[4]).toEqual({ $kind: 'Result', Result: 2 });
		// resolve: queue, market, desk, config, max_orders, clock.
		expect(pure(tx, 4, 4)).toBe(b64(12n));
	});

	test('commit and resolve compose on their own', () => {
		const tx = new Transaction();
		tx.add(
			commit(config, { expiryMarketId: MARKET, payloads: [new Uint8Array([7])], lazer: LAZER }),
		);
		tx.add(resolve(config, { expiryMarketId: MARKET, maxOrders: 450 }));
		expect(moveCallTargets(tx)).toEqual([
			'pyth_lazer::parse_and_verify_le_ecdsa_update',
			'queue::commit',
			'queue::resolve',
		]);
		expect(pure(tx, 3, 4)).toBe(b64(450n));
	});

	test('fill and commit without payloads are refused', () => {
		const lazer = { stateId: '0x1', packageId: '0x2', originalId: '0x3' };
		expect(() =>
			fill(config, { expiryMarketId: MARKET, payloads: [], lazer, maxOrders: 1n }),
		).toThrow(PredictInputError);
		expect(() => commit(config, { expiryMarketId: MARKET, payloads: [], lazer })).toThrow(
			PredictInputError,
		);
	});
});
