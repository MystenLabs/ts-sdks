// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the PTB each queued-order thunk emits, and its static checks.
import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { describe, expect, test } from 'vitest';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import { PredictInputError } from '../../src/predict/errors.js';
import {
	enqueueExactAmount,
	enqueueExactCost,
	enqueueExactQuantity,
	enqueueRedeemOpen,
	fill,
	rebalanceExpiryCash,
	refund,
} from '../../src/predict/tx/queue.js';
import { U64_MAX } from '../../src/predict/units.js';
import { QUEUE_CFG as cfg, moveCallTargets } from './queue-fixtures.js';

const config = toGeneratedConfig(cfg);
const btc = cfg.underlyings.BTC;
const MARKET = '0x' + 'cd'.repeat(32);
const WRAPPER = '0x' + 'ef'.repeat(32);
const target = {
	expiryMarketId: MARKET,
	wrapperId: WRAPPER,
	pythFeed: btc.pythFeed,
	blockScholesValueStore: btc.blockScholesValueStore,
	blockScholesSviStore: btc.blockScholesSviStore,
};
const b64 = (v: bigint) => Buffer.from(bcs.u64().serialize(v).toBytes()).toString('base64');

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

describe('queued mints', () => {
	test('enqueueExactQuantity: auth then enqueue on the latest package, oracle objects by id', () => {
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
			'expiry_market::enqueue_exact_quantity',
		]);
		const enqueue = call(tx, 1);
		expect(normalizeSuiObjectId(enqueue.package)).toBe(normalizeSuiObjectId(cfg.packages.predict));
		// market, wrapper, auth, config, propbook_registry, pyth, bs_values, bs_svi, …
		expect(objectId(tx, 1, 0)).toBe(normalizeSuiObjectId(MARKET));
		expect(objectId(tx, 1, 1)).toBe(normalizeSuiObjectId(WRAPPER));
		expect(enqueue.arguments[2]).toEqual({ $kind: 'Result', Result: 0 });
		expect(objectId(tx, 1, 3)).toBe(normalizeSuiObjectId(cfg.objects.protocolConfig));
		expect(objectId(tx, 1, 4)).toBe(normalizeSuiObjectId(cfg.objects.oracleRegistry));
		expect(objectId(tx, 1, 5)).toBe(normalizeSuiObjectId(btc.pythFeed));
		expect(objectId(tx, 1, 6)).toBe(normalizeSuiObjectId(btc.blockScholesValueStore));
		expect(objectId(tx, 1, 7)).toBe(normalizeSuiObjectId(btc.blockScholesSviStore));
		expect([8, 9, 10, 11, 12].map((i) => pure(tx, 1, i))).toEqual([
			b64(10_500_000n),
			b64(10_600_000n),
			b64(10_000_000n),
			b64(6_000_000n),
			b64(600_000_000n),
		]);
		// AccumulatorRoot and Clock are injected; no load_live_pricer is needed.
		expect(objectId(tx, 1, 13)).toBe(normalizeSuiObjectId('0xacc'));
		expect(objectId(tx, 1, 14)).toBe(normalizeSuiObjectId('0x6'));
		expect(enqueue.arguments).toHaveLength(15);
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
		expect(moveCallTargets(amount)[1]).toBe('expiry_market::enqueue_exact_amount');
		expect([10, 11, 12].map((i) => pure(amount, 1, i))).toEqual([
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
		expect(moveCallTargets(costTx)[1]).toBe('expiry_market::enqueue_exact_cost');
		expect([10, 11].map((i) => pure(costTx, 1, i))).toEqual([b64(5_000_000n), b64(7_000_000n)]);
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
		expect(moveCallTargets(tx)).toEqual([
			'account::generate_auth',
			'expiry_market::enqueue_redeem_open',
		]);
		expect([8, 9, 10, 11].map((i) => pure(tx, 1, i))).toEqual([
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

describe('refund, rebalance and the filler', () => {
	test('refund needs no auth: market, config, max_orders, clock', () => {
		const tx = build(refund(config, { expiryMarketId: MARKET, maxOrders: 100n }));
		expect(moveCallTargets(tx)).toEqual(['expiry_market::refund']);
		expect(objectId(tx, 0, 0)).toBe(normalizeSuiObjectId(MARKET));
		expect(objectId(tx, 0, 1)).toBe(normalizeSuiObjectId(cfg.objects.protocolConfig));
		expect(pure(tx, 0, 2)).toBe(b64(100n));
	});

	test('rebalanceExpiryCash takes the vault from config and no target', () => {
		const tx = build(rebalanceExpiryCash(config, { expiryMarketId: MARKET }));
		expect(moveCallTargets(tx)).toEqual(['plp::rebalance_expiry_cash']);
		expect(objectId(tx, 0, 0)).toBe(normalizeSuiObjectId(cfg.objects.poolVault));
		expect(objectId(tx, 0, 1)).toBe(normalizeSuiObjectId(MARKET));
		expect(objectId(tx, 0, 2)).toBe(normalizeSuiObjectId(cfg.objects.protocolConfig));
	});

	test('fill: verify each payload, collect typed updates, commit, resolve, then refund', () => {
		const lazer = {
			stateId: '0x' + '1a'.repeat(32),
			packageId: '0x' + '2b'.repeat(32),
			originalId: '0x' + '3c'.repeat(32),
		};
		const tx = build(
			fill(config, {
				expiryMarketId: MARKET,
				payloads: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])],
				lazer,
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
		expect(`${normalizeSuiObjectId(verify.package)}::${verify.module}::${verify.function}`).toBe(
			`${normalizeSuiObjectId(lazer.packageId)}::pyth_lazer::parse_and_verify_le_ecdsa_update`,
		);
		expect(objectId(tx, 0, 0)).toBe(normalizeSuiObjectId(lazer.stateId));
		expect(objectId(tx, 0, 1)).toBe(normalizeSuiObjectId('0x6'));
		const vec = commands[2].MakeMoveVec!;
		expect(vec.type).toBe(`${normalizeSuiObjectId(lazer.originalId)}::update::Update`);
		expect(vec.elements).toEqual([
			{ $kind: 'Result', Result: 0 },
			{ $kind: 'Result', Result: 1 },
		]);
		expect(moveCallTargets(tx).slice(2)).toEqual([
			'expiry_market::commit',
			'expiry_market::resolve',
			'expiry_market::refund',
		]);
		expect(call(tx, 3).arguments[2]).toEqual({ $kind: 'Result', Result: 2 });
		expect(pure(tx, 4, 2)).toBe(b64(12n));
	});

	test('fill without payloads is refused', () => {
		expect(() =>
			fill(config, {
				expiryMarketId: MARKET,
				payloads: [],
				lazer: { stateId: '0x1', packageId: '0x2', originalId: '0x3' },
				maxOrders: 1n,
			}),
		).toThrow(PredictInputError);
	});
});
