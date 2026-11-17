// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Live-testnet smoke suite — the SDK's first contact with the real deployment.
// Network-gated: runs only under `pnpm test:e2e` (PREDICT_SDK_TESTNET=1).
//
// What this proves that the offline suite cannot:
//  1. The real gRPC SimulateTransactionResult shape matches what reads/inspect.ts
//     codes against (commandResults[i].returnValues[j].bcs).
//  2. Every config object id resolves on chain (a read returning data uses the
//     registry, pool vault, feeds, protocol config, and the USDC coin type).
//  3. The arity guard: the queued-order placement executes against the DEPLOYED
//     entrypoint far enough that any failure is a semantic Move abort — never a
//     VM verification / argument-arity error. This detects deployed-surface
//     signature drift (argument count/type). It cannot detect swaps between
//     same-typed arguments; those are pinned by the offline slot tests.
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, test } from 'vitest';
import { PredictClient, PredictMoveError, TESTNET_CONFIG } from '../../../src/predict/index.js';
import { toGeneratedConfig, toOrdersConfig } from '../../../src/predict/config/generated.js';
import { PredictInputError } from '../../../src/predict/errors.js';
// The queued-order thunks: the arity guard drives the placement directly.
import { enqueueExactQuantity, enqueueExactQuantityV2 } from '../../../src/predict/tx/queue.js';
// Pricer-free registry read, to assert the (underlying, expiry) → id mapping.
import { expiryMarketId } from '../../../src/predict/reads/markets.js';
// Generated move-calls: build the fresh wrapper (`account_registry::new`) and share it
// (`account::share`) the same way `@mysten/deepbook-v3/account`'s `AccountContract` does, no hand-rolled targets.
import { accountMoveCalls as account } from '../../../src/account.js';
import { accountRegistryMoveCalls as accountRegistry } from '../../../src/account.js';

const TESTNET_GRPC_URL = 'https://fullnode.testnet.sui.io:443';

// A fixed, arbitrary sender for dry-runs. Deliberately not the zero address so
// `account_registry::new` derives a wrapper id no real user owns.
const SMOKE_SENDER = '0x51de1e01c51dc51dc51dc51dc51dc51dc51dc51dc51dc51dc51dc51dc51dc51d';

const cfg = TESTNET_CONFIG;
// Account calls target the latest account package: a PTB can't call account at an older version
// than Predict links (InvalidLinkage). Derived addresses and types keep `cfg.packages.account`.
const ACCOUNT_CALLS = cfg.packages.accountLatest ?? cfg.packages.account;
const config = toGeneratedConfig(cfg);
const client = new SuiGrpcClient({ network: 'testnet', baseUrl: TESTNET_GRPC_URL });
const predict = new PredictClient({ network: 'testnet', client });

// Shared across tests (vitest runs a file's tests sequentially by default).
let liveMarkets: Awaited<ReturnType<typeof predict.read.markets>> = [];

// Build a PTB that creates a FRESH AccountWrapper and threads it straight into a
// trade builder, then shares it. The facade derives wrapper ids for existing
// accounts, which a throwaway sender does not have — simulation would then fail at
// input resolution, before the VM ever checks the call's arity. Creating the
// wrapper in-PTB guarantees execution reaches the deployed Move entrypoint.
// The generated `_new` call returns the wrapper as a result handle (a
// TransactionArgument); it threads through the builders and `share` unchanged at
// runtime, and the cast bridges their string-typed wrapperId.
function freshWrapperTx(): { tx: Transaction; wrapper: string } {
	const tx = new Transaction();
	const wrapper = tx.add(
		accountRegistry._new({
			package: ACCOUNT_CALLS,
			arguments: { registry: cfg.objects.accountRegistry },
		}),
	);
	return { tx, wrapper: wrapper as unknown as string };
}

function shareWrapper(tx: Transaction, wrapper: string): void {
	tx.add(
		account.share({
			package: ACCOUNT_CALLS,
			arguments: { self: wrapper },
		}),
	);
}

// Simulate and classify the failure. Returns null on success, the error otherwise.
async function simulate(tx: Transaction): Promise<unknown> {
	tx.setSender(SMOKE_SENDER);
	try {
		const result = await client.simulateTransaction({
			transaction: tx,
			checksEnabled: false,
		});
		return result.$kind === 'FailedTransaction' ? result.FailedTransaction : null;
	} catch (e) {
		return e;
	}
}

// The guard: a failure is acceptable only if it is a semantic Move abort (or a
// typed PredictMoveError our own plumbing decoded). Arity/type drift surfaces as
// VMVerificationOrDeserializationError / CommandArgumentError instead — fail loud.
function expectSemanticOrSuccess(outcome: unknown, label: string): void {
	if (outcome === null) return; // full success is also proof of matching arity
	const text =
		outcome instanceof PredictMoveError
			? `MoveAbort:${outcome.module}:${outcome.code}`
			: JSON.stringify(outcome, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
	expect(text, `${label}: expected semantic Move abort, got: ${text}`).not.toMatch(
		/VMVerificationOrDeserialization|CommandArgumentError|InvalidPublicFunctionReturnType|arity|number of arguments/i,
	);
	expect(text, `${label}: expected a Move abort, got: ${text}`).toMatch(/MoveAbort/i);
}

describe('testnet smoke (live deployment)', () => {
	test('read.markets() — tradeable summaries, simulate plumbing end-to-end', async () => {
		liveMarkets = await predict.read.markets();
		expect(Array.isArray(liveMarkets)).toBe(true);
		for (const m of liveMarkets) {
			expect(m.id).toMatch(/^0x[0-9a-f]{64}$/);
			expect(m.expiryMs > 0n).toBe(true);
			expect(m.tickSize).toBeGreaterThan(0);
			expect(typeof m.mintPaused).toBe('boolean');
			// Option parse validated live: unset → null, seeded → a positive USD price.
			if (m.referencePrice !== null) expect(m.referencePrice).toBeGreaterThan(0);
		}
	});

	test('read.pool() — pool objects resolve, pool is bootstrapped', async () => {
		const pool = await predict.read.pool();
		expect(pool.plpTotalSupply > 0n).toBe(true);
		expect(pool.idleUsdc).toBeGreaterThanOrEqual(0);
		expect(pool.supplyRequestsPending).toBeGreaterThanOrEqual(0);
		expect(Number.isInteger(pool.supplyRequestsPending)).toBe(true);
		expect(pool.withdrawRequestsPending).toBeGreaterThanOrEqual(0);
		expect(Number.isInteger(pool.withdrawRequestsPending)).toBe(true);
	});

	test('registry maps (BTC, expiry) → the listed market id', async () => {
		if (liveMarkets.length === 0) return; // no live expiry right now — skip
		const m = liveMarkets[0];
		// BTC is the only registered underlying on testnet, so the registry must map
		// (BTC, this expiry) back to this exact market object. This resolution is
		// pricer-free, so it holds regardless of oracle liveness.
		expect(await expiryMarketId(client, config, cfg.underlyings.BTC, m.expiryMs)).toBe(m.id);
		// The full facade summary computes NAV off chain from signed inputs, which this suite
		// has no provider for: it refuses typed rather than reading a retired view.
		await expect(predict.read.market({ underlying: 'BTC', expiryMs: m.expiryMs })).rejects.toThrow(
			PredictInputError,
		);
	});

	test('arity guard: the queued placement matches the deployed surface', async () => {
		if (liveMarkets.length === 0) return;
		const id = liveMarkets[0].id;
		const orders = toOrdersConfig(cfg);
		// The market's queue is created by a keeper after the market: skip until it exists.
		const {
			objects: [queue],
		} = await client.core.getObjects({ objectIds: [predict.queueIdFor(id)] });
		if (queue instanceof Error) return;
		const { tx, wrapper } = freshWrapperTx();
		const order = {
			expiryMarketId: id,
			wrapperId: wrapper,
			// tick 1_000 is deep in the finite domain for any sane tick size
			lowerTick: 1_000n,
			higherTick: 1_001n,
			quantityRaw: 1_000_000n, // $1 payout, 100 lots
			maxCostRaw: 1_000_000n,
			maxProbabilityRaw: 1_000_000_000n,
		};
		// A config on the version 6 packages places with no Propbook object.
		tx.add(
			cfg.packages.predictV6
				? enqueueExactQuantityV2(orders, order)
				: enqueueExactQuantity(orders, { ...order, ...predictFeeds() }),
		);
		shareWrapper(tx, wrapper);
		expectSemanticOrSuccess(await simulate(tx), `enqueue on ${id}`);
	});

	test('read.price prices off chain, so it needs signed inputs', async () => {
		if (liveMarkets.length === 0) return;
		const m = liveMarkets[0];
		const strike = m.admissionTickSize * 1_000;
		await expect(
			predict.read.price({ underlying: 'BTC', expiryMs: m.expiryMs, strike }),
		).rejects.toThrow(/pricingInputs/);
	});

	test('read.quoteMint: unfunded owner fails as a typed semantic abort (preflight)', async () => {
		if (liveMarkets.length === 0) return;
		const m = liveMarkets[0];
		// SMOKE_SENDER never onboarded, so its derived wrapper doesn't exist: the quote's
		// balance read fails at input resolution ("Object 0x… " from the node) —
		// while a funded-but-broke owner would surface a typed Move abort. Either
		// way the quote fails EXACTLY like the real trade would (preflight), and
		// this proves the build → simulate-with-events → error path live.
		//
		// The strike must sit on the market's ADMISSION grid, or the SDK rejects it
		// locally and we would never reach the chain — which is a different code path
		// than the one this test exists to pin (that rejection has its own unit test).
		const strike =
			m.referencePrice ??
			Math.round((m.admissionTickSize * 1_000) / m.admissionTickSize) * m.admissionTickSize;
		await expect(
			predict.read.quoteMint(
				SMOKE_SENDER,
				{ underlying: 'BTC', expiryMs: m.expiryMs, strike, side: 'up' },
				{ quantity: 1 },
			),
		).rejects.toThrow(/Object|Move abort|aborted|not found|no market/i);
	});

	test('read.positions: never-onboarded owner resolves to [] against the live chain', async () => {
		// Validates the wrapper-derivation + not-found path with real node errors.
		expect(await predict.read.positions(SMOKE_SENDER)).toEqual([]);
	});

	test('read.positions: real owner enumerates from the live account table (opt-in)', async () => {
		// Set PREDICT_SDK_SMOKE_OWNER to a funded testnet owner to validate the
		// full BCS walk (wrapper → PredictData → positions table) against real
		// objects. Kept out of the repo: no fixture addresses in public code.
		const owner = process.env.PREDICT_SDK_SMOKE_OWNER;
		if (!owner) return;
		const out = await predict.read.positions(owner);
		expect(Array.isArray(out)).toBe(true);
		for (const p of out) {
			expect(p.marketId).toMatch(/^0x[0-9a-f]{64}$/);
			expect(p.orderId > 0n).toBe(true);
			// Cross-validate a sample against the on-chain membership check.
		}
		if (out.length > 0) {
			expect(await predict.read.hasPosition(owner, out[0].marketId, out[0].orderId)).toBe(true);
		}
	});

	test('createManager simulates clean AND its real event decodes', async () => {
		const tx = predict.tx.createManager();
		tx.setSender(SMOKE_SENDER);
		// include events: this validates decode.createManager against a REAL
		// emitted event (BCS layout, type matching, byte handling) — the live
		// anchor for the decoder layer's field-order assumptions.
		const result = await client.simulateTransaction({
			transaction: tx,
			checksEnabled: false,
			include: { events: true },
		});
		expect(result.$kind).toBe('Transaction'); // fresh sender: create+share succeeds
		const receipt = predict.decode.createManager({
			events: result.Transaction?.events ?? [],
		});
		expect(receipt.owner).toBe(SMOKE_SENDER);
		// The decoded on-chain wrapper id must equal the client-side derivation.
		expect(receipt.wrapperId).toBe(predict.wrapperIdFor(SMOKE_SENDER));
	});
});

function predictFeeds() {
	const u = cfg.underlyings.BTC;
	return {
		pythFeed: u.pythFeed,
		blockScholesValueStore: u.blockScholesValueStore,
		blockScholesSviStore: u.blockScholesSviStore,
	};
}
