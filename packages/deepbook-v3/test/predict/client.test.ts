// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { describe, expect, test } from 'vitest';
import { PredictClient } from '../../src/predict/client.js';
import { TESTNET_CONFIG as cfg } from '../../src/predict/config/index.js';
import { accountEvents } from '../../src/account.js';
import * as orderEvents from '../../src/contracts/deepbook_predict/order_events.js';
import { PredictInputError } from '../../src/predict/errors.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';
import { POS_INF_TICK } from '../../src/predict/ticks.js';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import { accountMoveCalls as account } from '../../src/account.js';
import { deriveAccountWrapperIdFrom, generateAuth } from '../../src/predict/tx/common.js';

const OWNER = '0x' + 'ab'.repeat(32);
const MARKET_ID = '0x' + 'cd'.repeat(32);
const EXPIRY = 1_700_000_000_000;

// The moveCall targets in the order the builder emitted them.
function targets(tx: Transaction): string[] {
	return tx
		.getData()
		.commands.flatMap((c) =>
			'MoveCall' in c && c.MoveCall
				? [`${c.MoveCall.package}::${c.MoveCall.module}::${c.MoveCall.function}`]
				: [],
		);
}

function call(tx: Transaction, cmdIdx: number) {
	return tx.getData().commands[cmdIdx].MoveCall!;
}

// Resolve the base64 pure bytes an argument points at (undefined if not a pure input).
function argPureBytes(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const arg = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	if (arg.$kind !== 'Input' || arg.Input === undefined) return undefined;
	const input = tx.getData().inputs[arg.Input];
	return 'Pure' in input && input.Pure ? input.Pure.bytes : undefined;
}

const b64 = (v: bigint) => Buffer.from(bcs.u64().serialize(v).toBytes()).toString('base64');

// Canned trade events for quote dry-runs, serialized with the generated event structs
// so the layout matches what src/decode.ts parses (incl. the trailing timestamp fields).
const MINTED_EVENT = {
	eventType: `${cfg.packages.predict}::order_events::OrderMinted`,
	bcs: orderEvents.OrderMinted.serialize({
		expiry_market_id: MARKET_ID,
		account_id: MARKET_ID,
		order_id: 7n,
		position_root_id: 7n,
		owner: OWNER,
		lower_tick: 10_500_000n,
		higher_tick: (1n << 30n) - 1n,
		entry_probability: 340_000_000n, // 0.34
		quantity: 50_000_000n, // $50
		premium: 17_000_000n, // $17
		trading_fee: 100_000n, // $0.10
		fee_incentive_subsidy: 20_000n, // $0.02 sponsor-paid
		builder_fee: 30_000n, // $0.03
		penalty_fee: 5_000n, // $0.005
		referral_fee: 11_000n, // $0.011 — a PORTION of trading+penalty, never an extra debit
		inventory_impact_charge: 40_000n, // $0.04 — a SEPARATE charge, part of the all-in cost
		builder_code_id: null,
		referrer_account_id: null,
		onchain_timestamp_ms: 0n,
		pyth_spot_source_timestamp_ms: 0n,
		block_scholes_spot_source_timestamp_ms: 0n,
		block_scholes_forward_source_timestamp_ms: 0n,
		block_scholes_svi_source_timestamp_ms: 0n,
	}).toBytes(),
};
const REDEEMED_EVENT = {
	eventType: `${cfg.packages.predict}::order_events::LiveOrderRedeemed`,
	bcs: orderEvents.LiveOrderRedeemed.serialize({
		expiry_market_id: MARKET_ID,
		account_id: MARKET_ID,
		order_id: 7n,
		position_root_id: 7n,
		owner: OWNER,
		quantity_closed: 20_000_000n,
		remaining_quantity: 30_000_000n,
		replacement_order_id: 8n,
		redeem_amount: 6_000_000n, // gross $6
		trading_fee: 50_000n,
		builder_fee: 0n,
		penalty_fee: 0n,
		inventory_impact_rebate: 25_000n, // $0.025 credited back on the close
		builder_code_id: null,
		onchain_timestamp_ms: 0n,
		pyth_spot_source_timestamp_ms: 0n,
		block_scholes_spot_source_timestamp_ms: 0n,
		block_scholes_forward_source_timestamp_ms: 0n,
		block_scholes_svi_source_timestamp_ms: 0n,
	}).toBytes(),
};

// A mock ReadClient that dispatches canned return values by the first command's
// move-call function, and counts how many times each function was simulated.
function mockClient(overrides: { admissionTickSizeRaw?: bigint } = {}) {
	const counts: Record<string, number> = {};
	const client = {
		core: {
			async simulateTransaction(opts: { transaction: Transaction }) {
				const cmds = opts.transaction.getData().commands;
				const fns = cmds.map((c) => ('MoveCall' in c && c.MoveCall ? c.MoveCall.function : '?'));
				const fn = fns[0];
				counts[fn] = (counts[fn] ?? 0) + 1;
				// Quote dry-runs: a simulated trade returns its emitted events.
				if (fns.includes('mint_exact_quantity')) {
					counts.quote_mint_sim = (counts.quote_mint_sim ?? 0) + 1;
					return { $kind: 'Transaction', Transaction: { events: [MINTED_EVENT] } };
				}
				if (fns.includes('redeem_live')) {
					return { $kind: 'Transaction', Transaction: { events: [REDEEMED_EVENT] } };
				}
				let results: Uint8Array[][];
				if (fns.includes('range_price')) {
					// price PTB: load_live_pricer → strike_from_tick ×3 → range_price ×2.
					// read.price maps upRaw = commands[len-2], downRaw = commands[len-1].
					results = [
						[new Uint8Array(0)], // load_live_pricer
						[new Uint8Array(0)], // strike_from_tick — finite
						[new Uint8Array(0)], // strike_from_tick — +inf
						[new Uint8Array(0)], // strike_from_tick — -inf
						[bcs.u64().serialize(340_000_000n).toBytes()], // range_price up 0.34
						[bcs.u64().serialize(660_000_000n).toBytes()], // range_price down 0.66
					];
				} else if (fn === 'active_expiry_markets') {
					results = [[bcs.vector(bcs.Address).serialize([MARKET_ID]).toBytes()]];
				} else if (fn === 'expiry_market_id') {
					results = [[bcs.option(bcs.Address).serialize(MARKET_ID).toBytes()]];
				} else if (fn === 'expiry') {
					// marketState PTB: expiry, tick_size, admission_tick_size, mint_paused,
					// reference_tick. admission_tick_size is $0.01 here so existing fixtures'
					// strikes stay admitted; the admission-grid rejection has its own test.
					results = [
						[bcs.u64().serialize(BigInt(EXPIRY)).toBytes()],
						[bcs.u64().serialize(10_000_000n).toBytes()],
						[
							bcs
								.u64()
								.serialize(overrides.admissionTickSizeRaw ?? 10_000_000n)
								.toBytes(),
						],
						[bcs.bool().serialize(false).toBytes()],
						[bcs.option(bcs.u64()).serialize(10_500_000n).toBytes()],
					];
				} else if (fn === 'reference_tick') {
					// mint-at-reference fresh read: tick 10_500_000 (= $105,000 @ $0.01)
					results = [[bcs.option(bcs.u64()).serialize(10_500_000n).toBytes()]];
				} else {
					// e.g. currentNav's load_live_pricer → current_nav: one u64 per command.
					results = cmds.map(() => [bcs.u64().serialize(0n).toBytes()]);
				}
				return {
					$kind: 'Transaction',
					Transaction: {},
					commandResults: results.map((rvs) => ({
						returnValues: rvs.map((b) => ({ bcs: b })),
						mutatedReferences: [],
					})),
				};
			},
		},
	} as unknown as ReadClient;
	return { client, counts };
}

// A mock that reports NO market for the descriptor.
function mockNoMarket() {
	const client = {
		core: {
			async simulateTransaction() {
				return {
					$kind: 'Transaction',
					Transaction: {},
					commandResults: [
						{
							returnValues: [{ bcs: bcs.option(bcs.Address).serialize(null).toBytes() }],
							mutatedReferences: [],
						},
					],
				};
			},
		},
	} as unknown as ReadClient;
	return client;
}

describe('PredictClient constructor', () => {
	test('mainnet without config throws (no deployment)', () => {
		expect(() => new PredictClient({ network: 'mainnet', client: mockClient().client })).toThrow();
	});

	test('testnet resolves the bundled config; wrapperIdFor is deterministic', () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const id = pc.wrapperIdFor(OWNER);
		expect(id).toMatch(/^0x[0-9a-f]{64}$/);
		expect(pc.wrapperIdFor(OWNER)).toBe(id);
	});

	test('observes package and object config updates after construction', () => {
		const config = {
			...cfg,
			packages: { ...cfg.packages },
			objects: { ...cfg.objects },
			underlyings: { ...cfg.underlyings },
		};
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client, config });
		const initialWrapper = pc.wrapperIdFor(OWNER);
		const accountPackageId = `0x${'11'.repeat(32)}`;
		const accountRegistry = `0x${'22'.repeat(32)}`;

		config.packages.account = accountPackageId;
		config.objects.accountRegistry = accountRegistry;

		expect(pc.wrapperIdFor(OWNER)).toBe(
			deriveAccountWrapperIdFrom({ accountPackageId, accountRegistry }, OWNER),
		);
		expect(pc.wrapperIdFor(OWNER)).not.toBe(initialWrapper);
		expect(targets(pc.tx.createManager())).toEqual([
			`${accountPackageId}::account_registry::new`,
			`${accountPackageId}::account::share`,
		]);
	});
});

describe('tx.deposit / tx.withdraw', () => {
	test('deposit sources a coin via CoinWithBalance intent and calls deposit_funds; 12.5 → 12_500_000', () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const tx = pc.tx.deposit(OWNER, '12.5');
		// a CoinWithBalance $Intent command is present
		const hasIntent = tx
			.getData()
			.commands.some((c) => '$Intent' in c && c.$Intent?.name === 'CoinWithBalance');
		expect(hasIntent).toBe(true);
		expect(targets(tx)).toContain(`${cfg.packages.account}::account::deposit_funds`);
		// auth is minted immediately before the deposit that consumes it, and the
		// deposit is typed to the quote coin
		const t = targets(tx);
		expect(t[t.length - 2]).toBe(`${cfg.packages.account}::account::generate_auth`);
		const deposit = tx.getData().commands.at(-1)!;
		expect('MoveCall' in deposit && deposit.MoveCall!.typeArguments).toEqual([cfg.quoteCoinType]);
	});

	const sendFundsCmd = (tx: Transaction) =>
		tx
			.getData()
			.commands.find(
				(c) =>
					'MoveCall' in c && c.MoveCall?.module === 'coin' && c.MoveCall.function === 'send_funds',
			);

	test('withdraw defaults to depositing into the owner address balance (coin::send_funds)', () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const tx = pc.tx.withdraw(OWNER, '5');
		// auth → withdraw_funds<USDC>, amount converted to raw in the u64 slot
		expect(targets(tx).slice(0, 2)).toEqual([
			`${cfg.packages.account}::account::generate_auth`,
			`${cfg.packages.account}::account::withdraw_funds`,
		]);
		expect(call(tx, 1).typeArguments).toEqual([cfg.quoteCoinType]);
		expect(argPureBytes(tx, 1, 2)).toBe(b64(5_000_000n));
		// send_funds<USDC> deposits the withdrawn coin into the owner's address balance
		const sf = sendFundsCmd(tx);
		expect(sf).toBeDefined();
		expect(sf && 'MoveCall' in sf && sf.MoveCall?.typeArguments).toEqual([cfg.quoteCoinType]);
		// and no coin object is left owned by the sender
		const hasTransfer = tx
			.getData()
			.commands.some((c) => 'TransferObjects' in c && c.TransferObjects);
		expect(hasTransfer).toBe(false);
	});

	test('deposit({ create: true }) composes coin → new → auth → deposit_funds → share', () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const tx = pc.tx.deposit(OWNER, 100, { create: true });
		const cmds = tx.getData().commands;
		expect(cmds).toHaveLength(5);
		// exact order; the coin intent resolves in place at build time
		expect('$Intent' in cmds[0] && cmds[0].$Intent?.name).toBe('CoinWithBalance');
		expect('MoveCall' in cmds[1] && cmds[1].MoveCall!.function).toBe('new');
		expect('MoveCall' in cmds[2] && cmds[2].MoveCall!.function).toBe('generate_auth');
		expect('MoveCall' in cmds[3] && cmds[3].MoveCall!.function).toBe('deposit_funds');
		expect('MoveCall' in cmds[4] && cmds[4].MoveCall!.function).toBe('share');
		// deposit_funds addresses the wrapper through the `new` RESULT HANDLE — not a
		// pure/object input (an input could only reference a pre-existing object) —
		// and share consumes the same handle, last.
		const wrapperArg = call(tx, 3).arguments[0] as { $kind: string; Result?: number };
		expect(wrapperArg).toMatchObject({ $kind: 'Result', Result: 1 });
		const shareArg = call(tx, 4).arguments[0] as { $kind: string; Result?: number };
		expect(shareArg).toMatchObject({ $kind: 'Result', Result: 1 });
	});

	test('deposit without create is unchanged (regression pin)', () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const tx = pc.tx.deposit(OWNER, 100);
		// Pin against the pre-`create` construction, byte for byte.
		const expected = new Transaction();
		const coin = expected.add(
			coinWithBalance({ type: cfg.quoteCoinType, balance: 100_000_000n, useGasCoin: false }),
		);
		const config = toGeneratedConfig(cfg);
		const auth = expected.add(generateAuth(cfg));
		expected.add(
			account.depositFunds({
				config,
				arguments: { wrapper: pc.wrapperIdFor(OWNER), auth, coin },
				typeArguments: [cfg.quoteCoinType],
			}),
		);
		const json = (v: unknown) =>
			JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? `${x}n` : x));
		expect(json(tx.getData())).toBe(json(expected.getData()));
	});

	test('decode.createManager and decode.deposit both resolve from one combined result', () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const wrapperId = pc.wrapperIdFor(OWNER);
		const result = {
			events: [
				{
					eventType: `${cfg.packages.account}::account_events::AccountCreated`,
					bcs: accountEvents.AccountCreated.serialize({
						account_id: MARKET_ID,
						wrapper_id: wrapperId,
						owner: OWNER,
						self_owned: false,
						referrer_account_id: null,
					}).toBytes(),
				},
				{
					eventType: `${cfg.packages.account}::account_events::Deposited`,
					bcs: accountEvents.Deposited.serialize({
						account_id: MARKET_ID,
						coin_type: cfg.quoteCoinType,
						amount: 100_000_000n,
						new_balance: 100_000_000n,
					}).toBytes(),
				},
			],
		};
		expect(pc.decode.createManager(result).wrapperId).toBe(wrapperId);
		expect(pc.decode.deposit(result).amount).toBe(100);
	});

	test('withdraw({ toCoinObject: true }) returns a discrete Coin via TransferObjects', () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const tx = pc.tx.withdraw(OWNER, '5', { toCoinObject: true });
		expect(targets(tx)).toContain(`${cfg.packages.account}::account::withdraw_funds`);
		expect(sendFundsCmd(tx)).toBeUndefined();
		const hasTransfer = tx
			.getData()
			.commands.some((c) => 'TransferObjects' in c && c.TransferObjects);
		expect(hasTransfer).toBe(true);
	});
});

describe('tx.mint (market resolution + unit conversion)', () => {
	test('converts quantity and ticks against a resolved market', async () => {
		const { client } = mockClient();
		const pc = new PredictClient({ network: 'testnet', client });
		const tx = await pc.tx.mint(
			OWNER,
			{ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' },
			{ quantity: 50 },
		);
		expect(targets(tx)).toEqual([
			`${cfg.packages.predict}::expiry_market::load_live_pricer`,
			`${cfg.packages.account}::account::generate_auth`,
			`${cfg.packages.predict}::expiry_market::mint_exact_quantity`,
		]);
		// mint args: [market, wrapper, auth, config, pricer, lower, higher, quantity, maxCost, ...]
		expect(argPureBytes(tx, 2, 5)).toBe(b64(10_500_000n)); // lower tick = strike/tickSize
		expect(argPureBytes(tx, 2, 6)).toBe(b64(POS_INF_TICK)); // higher tick (up)
		expect(argPureBytes(tx, 2, 7)).toBe(b64(50_000_000n)); // quantity 50 → 1e6
	});

	test('unknown market → PredictInputError /no market/', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockNoMarket() });
		await expect(
			pc.tx.mint(
				OWNER,
				{ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' },
				{ quantity: 50 },
			),
		).rejects.toThrow(/no market/);
	});

	test('unknown underlying → PredictInputError', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(
			pc.tx.mint(
				OWNER,
				{ underlying: 'DOGE', expiryMs: EXPIRY, strike: 1, side: 'up' },
				{ quantity: 50 },
			),
		).rejects.toBeInstanceOf(PredictInputError);
	});

	test('unknown underlying → PredictInputError on the paths with no feed lookup', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		// claimSettled resolves a market without ever asking for oracle feeds, so this
		// pins the lookup the market-id ladder itself performs.
		await expect(
			pc.tx.claimSettled(OWNER, { underlying: 'DOGE', expiryMs: EXPIRY }, { orderId: 1n }),
		).rejects.toBeInstanceOf(PredictInputError);
	});

	test('read.market: unknown underlying → PredictInputError', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(pc.read.market({ underlying: 'DOGE', expiryMs: EXPIRY })).rejects.toThrow(/DOGE/);
	});

	test('strike off the coarser ADMISSION grid throws before the chain sees it', async () => {
		// The mock market reports tick_size $0.01 and admission_tick_size $0.01, so
		// override the admission step to $100 the way the live deployment does: a strike
		// on the fine grid but not the admission grid must be rejected locally rather
		// than aborting on chain with EInvalidAdmissionTick.
		const { client } = mockClient({ admissionTickSizeRaw: 100_000_000_000n });
		const pc = new PredictClient({ network: 'testnet', client });
		await expect(
			pc.tx.mint(
				OWNER,
				{ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000.01, side: 'up' },
				{ quantity: 50 },
			),
		).rejects.toThrow(/admission grid/);
		// a strike ON the $100 admission grid passes the check
		await expect(
			pc.tx.mint(
				OWNER,
				{ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' },
				{ quantity: 50 },
			),
		).resolves.toBeDefined();
	});

	test('sub-lot quantity throws /lot/', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(
			pc.tx.mint(
				OWNER,
				{ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' },
				{ quantity: 0.001 },
			),
		).rejects.toThrow(/lot/);
	});

	test('sub-lot close quantity throws /lot/ on redeem', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const m = { underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' } as const;
		await expect(pc.tx.redeem(OWNER, m, { orderId: 1n, quantity: 0.001 })).rejects.toThrow(/lot/);
	});

	test('mintAmount minQuantity is a floor — sub-lot values are accepted', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const tx = await pc.tx.mintAmount(
			OWNER,
			{ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' },
			{ spend: 10, minQuantity: 0.015 },
		);
		expect(tx).toBeTruthy();
	});

	test('read.markets returns tradeable summaries', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const markets = await pc.read.markets();
		expect(markets).toEqual([
			{
				id: MARKET_ID,
				expiryMs: BigInt(EXPIRY),
				tickSize: 0.01,
				admissionTickSize: 0.01,
				mintPaused: false,
				referencePrice: 105_000, // tick 10_500_000 × $0.01
			},
		]);
	});

	test('mint at the reference strike uses the on-chain reference tick directly', async () => {
		const { client, counts } = mockClient();
		const pc = new PredictClient({ network: 'testnet', client });
		const tx = await pc.tx.mint(
			OWNER,
			{ underlying: 'BTC', expiryMs: EXPIRY, strike: 'reference', side: 'up' },
			{ quantity: 50 },
		);
		// The fresh reference read must have happened (never served from cache).
		expect(counts.reference_tick).toBe(1);
		// lowerTick input = the reference tick itself; higherTick = +inf sentinel.
		const inputs = tx.getData().inputs;
		const pureB64 = inputs
			.filter((i) => 'Pure' in i && i.Pure)
			.map((i) => (i as { Pure: { bytes: string } }).Pure.bytes);
		expect(pureB64).toContain(b64(10_500_000n)); // reference tick
		expect(pureB64).toContain(b64((1n << 30n) - 1n)); // POS_INF_TICK
	});

	test('mint at reference: DOWN side puts the tick on the higher bound', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const tx = await pc.tx.mint(
			OWNER,
			{ underlying: 'BTC', expiryMs: EXPIRY, strike: 'reference', side: 'down' },
			{ quantity: 50 },
		);
		const pureB64 = tx
			.getData()
			.inputs.filter((i) => 'Pure' in i && i.Pure)
			.map((i) => (i as { Pure: { bytes: string } }).Pure.bytes);
		expect(pureB64).toContain(b64(0n)); // -inf sentinel on the lower bound
		expect(pureB64).toContain(b64(10_500_000n)); // reference tick on the higher
	});

	test('mint at reference: unset reference → PredictInputError', async () => {
		const base = mockClient().client as unknown as {
			core: { simulateTransaction: (o: { transaction: Transaction }) => Promise<unknown> };
		};
		// Wrap the mock: reference_tick returns None; everything else passes through.
		const client = {
			core: {
				async simulateTransaction(opts: { transaction: Transaction }) {
					const cmds = opts.transaction.getData().commands;
					const fn = 'MoveCall' in cmds[0] && cmds[0].MoveCall ? cmds[0].MoveCall.function : '?';
					if (fn === 'reference_tick') {
						return {
							$kind: 'Transaction',
							Transaction: {},
							commandResults: [
								{
									returnValues: [{ bcs: bcs.option(bcs.u64()).serialize(null).toBytes() }],
									mutatedReferences: [],
								},
							],
						};
					}
					return base.core.simulateTransaction(opts);
				},
			},
		} as never;
		const pc = new PredictClient({ network: 'testnet', client });
		await expect(
			pc.tx.mint(
				OWNER,
				{ underlying: 'BTC', expiryMs: EXPIRY, strike: 'reference', side: 'up' },
				{ quantity: 50 },
			),
		).rejects.toThrow(/reference price not set/);
	});

	test("read.price returns both sides from the chain's range_price", async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const p = await pc.read.price({ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000 });
		expect(p).toEqual({ up: 0.34, down: 0.66 });
	});

	test('read.price rejects off-grid strikes', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(
			pc.read.price({ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000.005 }),
		).rejects.toThrow(/tick grid/);
	});

	test('read.price rejects sentinel strikes (same domain rule as mint)', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(pc.read.price({ underlying: 'BTC', expiryMs: EXPIRY, strike: 0 })).rejects.toThrow(
			/finite tick domain/,
		);
	});

	test('read.quoteMint dry-runs the mint and computes the all-in cost', async () => {
		const { client, counts } = mockClient();
		const pc = new PredictClient({ network: 'testnet', client });
		const q = await pc.read.quoteMint(
			OWNER,
			{ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' },
			{ quantity: 50 },
		);
		expect(counts.quote_mint_sim).toBe(1);
		expect(q.entryProbability).toBeCloseTo(0.34);
		expect(q.premium).toBe(17);
		// Mirrors the deployed all_in_cost: premium + (trading − subsidy) + builder +
		// penalty + inventoryImpact. `referral_fee` is a PORTION of the trader-paid fees
		// and must NOT appear here — the non-zero fixture values make both halves of that
		// statement falsifiable.
		expect(q.raw.cost).toBe(17_000_000n + 80_000n + 30_000n + 5_000n + 40_000n);
		expect(q.cost).toBeCloseTo(17.155);
		expect(q.fees.inventoryImpact).toBeCloseTo(0.04);
		expect(q.fees.referral).toBeCloseTo(0.011);
		expect(q.quantity).toBe(50);
		expect(q.feesExact).toBe(true);
	});

	test('read.quoteRedeem dry-runs the close and returns NET proceeds', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const q = await pc.read.quoteRedeem(
			OWNER,
			{ underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' },
			{ orderId: 7n, quantity: 0.02 },
		);
		expect(q.gross).toBe(6);
		// gross + rebate − trading − builder − penalty (the expression the chain asserts
		// `min_proceeds` against); the non-zero rebate makes the term falsifiable.
		expect(q.proceeds).toBe(5.975);
		expect(q.fees.inventoryImpactRebate).toBeCloseTo(0.025);
		expect(q.remaining).toBe(30);
		expect(q.feesExact).toBe(true);
	});

	test('market resolution is cached: a second mint does not re-resolve', async () => {
		const { client, counts } = mockClient();
		const pc = new PredictClient({ network: 'testnet', client });
		const m = { underlying: 'BTC', expiryMs: EXPIRY, strike: 105_000, side: 'up' } as const;
		await pc.tx.mint(OWNER, m, { quantity: 50 });
		await pc.tx.mint(OWNER, m, { quantity: 50 });
		expect(counts.expiry_market_id).toBe(1);
	});
});

describe('range markets', () => {
	const RANGE = {
		underlying: 'BTC',
		expiryMs: EXPIRY,
		side: 'range',
		lower: 104_000,
		upper: 106_000,
	} as const;

	test('mint converts both bounds to finite grid ticks', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const tx = await pc.tx.mint(OWNER, RANGE, { quantity: 50 });
		expect(targets(tx)).toContain(`${cfg.packages.predict}::expiry_market::mint_exact_quantity`);
		// mint args: [market, wrapper, auth, config, pricer, lower, higher, ...]
		expect(argPureBytes(tx, 2, 5)).toBe(b64(10_400_000n)); // 104,000 / $0.01
		expect(argPureBytes(tx, 2, 6)).toBe(b64(10_600_000n)); // 106,000 / $0.01 — finite, not +inf
	});

	test('off-grid bound → PredictInputError /tick grid/', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const bad = { ...RANGE, upper: 106_000.005 };
		await expect(pc.tx.mint(OWNER, bad, { quantity: 50 })).rejects.toBeInstanceOf(
			PredictInputError,
		);
		await expect(pc.tx.mint(OWNER, bad, { quantity: 50 })).rejects.toThrow(/tick grid/);
	});

	test('inverted or empty range → PredictInputError', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const inverted = { ...RANGE, lower: 106_000, upper: 104_000 };
		await expect(pc.tx.mint(OWNER, inverted, { quantity: 50 })).rejects.toBeInstanceOf(
			PredictInputError,
		);
		await expect(pc.tx.mint(OWNER, inverted, { quantity: 50 })).rejects.toThrow(/below upper/);
		const empty = { ...RANGE, lower: 104_000, upper: 104_000 };
		await expect(pc.tx.mint(OWNER, empty, { quantity: 50 })).rejects.toThrow(/below upper/);
	});

	test('bounds outside the finite tick domain → PredictInputError', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(pc.tx.mint(OWNER, { ...RANGE, lower: 0 }, { quantity: 50 })).rejects.toThrow(
			/finite tick domain/,
		);
	});
});

describe('marketId pin', () => {
	test('skips the underlying+expiry ladder and reads the pinned market state', async () => {
		const { client, counts } = mockClient();
		const pc = new PredictClient({ network: 'testnet', client });
		const tx = await pc.tx.mint(
			OWNER,
			{ underlying: 'BTC', expiryMs: EXPIRY, marketId: MARKET_ID, strike: 105_000, side: 'up' },
			{ quantity: 50 },
		);
		expect(counts.expiry_market_id).toBeUndefined(); // no ladder resolution
		expect(counts.expiry).toBe(1); // the pinned market's state IS read (tickSizeRaw)
		expect(targets(tx)).toContain(`${cfg.packages.predict}::expiry_market::mint_exact_quantity`);
	});

	test('pin disagreeing with the descriptor expiry → PredictInputError', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(
			pc.tx.mint(
				OWNER,
				{
					underlying: 'BTC',
					expiryMs: EXPIRY + 1,
					marketId: MARKET_ID,
					strike: 105_000,
					side: 'up',
				},
				{ quantity: 50 },
			),
		).rejects.toThrow(/expires at/);
	});

	test('malformed marketId → PredictInputError, not a silent ladder fallback', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(
			pc.tx.mint(
				OWNER,
				{ underlying: 'BTC', expiryMs: EXPIRY, marketId: '', strike: 105_000, side: 'up' },
				{ quantity: 50 },
			),
		).rejects.toThrow(/invalid marketId/);
	});
});

describe('read facade', () => {
	test('market returns id + converted fields, or null when absent', async () => {
		const { client } = mockClient();
		const pc = new PredictClient({ network: 'testnet', client });
		const m = await pc.read.market({ underlying: 'BTC', expiryMs: EXPIRY });
		expect(m).not.toBeNull();
		expect(m!.id).toBe(MARKET_ID);
		expect(m!.expiryMs).toBe(BigInt(EXPIRY));
		expect(m!.mintPaused).toBe(false);

		const none = await new PredictClient({
			network: 'testnet',
			client: mockNoMarket(),
		}).read.market({
			underlying: 'BTC',
			expiryMs: 1,
		});
		expect(none).toBeNull();
	});
});
