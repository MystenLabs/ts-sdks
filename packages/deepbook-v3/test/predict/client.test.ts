// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { describe, expect, test } from 'vitest';
import { PredictClient } from '../../src/predict/client.js';
import { TESTNET_CONFIG as cfg } from '../../src/predict/config/index.js';
import { accountEvents } from '../../src/account.js';
import { PredictInputError, PredictMoveError } from '../../src/predict/errors.js';
import type { ReadClient } from '../../src/predict/reads/inspect.js';
import { toGeneratedConfig } from '../../src/predict/config/generated.js';
import { accountMoveCalls as account } from '../../src/account.js';
import { deriveAccountWrapperIdFrom, generateAuth } from '../../src/predict/tx/common.js';

// Account calls target the latest account package (a PTB can't call one older than Predict links);
// event and struct types keep the original `cfg.packages.account`.
const ACCOUNT_CALLS = cfg.packages.accountLatest ?? cfg.packages.account;

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

// A mock ReadClient that dispatches canned return values by the first command's
// move-call function, and counts how many times each function was simulated.
function mockClient(
	overrides: { admissionTickSizeRaw?: bigint; settlementPriceRaw?: bigint | null } = {},
) {
	const counts: Record<string, number> = {};
	const client = {
		core: {
			async simulateTransaction(opts: { transaction: Transaction }) {
				const cmds = opts.transaction.getData().commands;
				const fns = cmds.map((c) => ('MoveCall' in c && c.MoveCall ? c.MoveCall.function : '?'));
				const fn = fns[0];
				counts[fn] = (counts[fn] ?? 0) + 1;
				let results: Uint8Array[][];
				if (fn === 'active_expiry_markets') {
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
				} else if (fn === 'settlement_price') {
					// An unsettled market's getter aborts in std::option, which the read maps to null.
					if (overrides.settlementPriceRaw === null) {
						throw new PredictMoveError('option', 262145n, null);
					}
					results = [
						[
							bcs
								.u64()
								.serialize(overrides.settlementPriceRaw ?? 105_000_005_000_000n)
								.toBytes(),
						],
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
	test('an unrecorded network without config throws (no deployment)', () => {
		expect(() => new PredictClient({ network: 'devnet', client: mockClient().client })).toThrow();
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
		const accountLatest = `0x${'33'.repeat(32)}`;
		const accountRegistry = `0x${'22'.repeat(32)}`;

		config.packages.account = accountPackageId;
		config.packages.accountLatest = accountLatest;
		config.objects.accountRegistry = accountRegistry;

		// Derivation follows the original ID; calls follow the latest package.
		expect(pc.wrapperIdFor(OWNER)).toBe(
			deriveAccountWrapperIdFrom({ accountPackageId, accountRegistry }, OWNER),
		);
		expect(pc.wrapperIdFor(OWNER)).not.toBe(initialWrapper);
		expect(targets(pc.tx.createManager())).toEqual([
			`${accountLatest}::account_registry::new`,
			`${accountLatest}::account::share`,
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
		expect(targets(tx)).toContain(`${ACCOUNT_CALLS}::account::deposit_funds`);
		// auth is minted immediately before the deposit that consumes it, and the
		// deposit is typed to the quote coin
		const t = targets(tx);
		expect(t[t.length - 2]).toBe(`${ACCOUNT_CALLS}::account::generate_auth`);
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
			`${ACCOUNT_CALLS}::account::generate_auth`,
			`${ACCOUNT_CALLS}::account::withdraw_funds`,
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
		expect(targets(tx)).toContain(`${ACCOUNT_CALLS}::account::withdraw_funds`);
		expect(sendFundsCmd(tx)).toBeUndefined();
		const hasTransfer = tx
			.getData()
			.commands.some((c) => 'TransferObjects' in c && c.TransferObjects);
		expect(hasTransfer).toBe(true);
	});
});

describe('tx.mint (market resolution + unit conversion)', () => {
	test('unknown market → PredictInputError /no market/', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockNoMarket() });
		await expect(
			pc.tx.claimSettled(OWNER, { underlying: 'BTC', expiryMs: EXPIRY }, { orderId: 1n }),
		).rejects.toThrow(/no market/);
	});

	test('unknown underlying → PredictInputError on the paths with no feed lookup', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		// claimSettled resolves a market without ever asking for oracle feeds, so this
		// pins the lookup the market-id ladder itself performs.
		await expect(
			pc.tx.claimSettled(OWNER, { underlying: 'DOGE', expiryMs: EXPIRY }, { orderId: 1n }),
		).rejects.toBeInstanceOf(PredictInputError);
	});

	test('read.settlement: a settled market returns its price and tick size', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		const s = await pc.read.settlement({ underlying: 'BTC', expiryMs: EXPIRY });
		expect(s).toEqual({
			marketId: MARKET_ID,
			expiryMs: BigInt(EXPIRY),
			settled: true,
			settlementPrice: 105_000.005,
			settlementPriceRaw: 105_000_005_000_000n,
			tickSizeRaw: 10_000_000n,
		});
	});

	test('read.settlement: an unsettled market has no price', async () => {
		const pc = new PredictClient({
			network: 'testnet',
			client: mockClient({ settlementPriceRaw: null }).client,
		});
		const s = await pc.read.settlement({ underlying: 'BTC', expiryMs: EXPIRY });
		expect(s.settled).toBe(false);
		expect(s.settlementPrice).toBeNull();
		expect(s.settlementPriceRaw).toBeNull();
	});

	test('read.market: unknown underlying → PredictInputError', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(pc.read.market({ underlying: 'DOGE', expiryMs: EXPIRY })).rejects.toThrow(/DOGE/);
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

	test('market resolution is cached: a second build does not re-resolve', async () => {
		const { client, counts } = mockClient();
		const pc = new PredictClient({ network: 'testnet', client });
		const m = { underlying: 'BTC', expiryMs: EXPIRY } as const;
		await pc.tx.claimSettled(OWNER, m, { orderId: 1n });
		await pc.tx.claimSettled(OWNER, m, { orderId: 2n });
		expect(counts.expiry_market_id).toBe(1);
	});
});

describe('marketId pin', () => {
	test('skips the underlying+expiry ladder and reads the pinned market state', async () => {
		const { client, counts } = mockClient();
		const pc = new PredictClient({ network: 'testnet', client });
		const tx = await pc.tx.claimSettled(
			OWNER,
			{ underlying: 'BTC', expiryMs: EXPIRY, marketId: MARKET_ID },
			{ orderId: 1n },
		);
		expect(counts.expiry_market_id).toBeUndefined(); // no ladder resolution
		expect(counts.expiry).toBe(1); // the pinned market's state IS read (tickSizeRaw)
		expect(targets(tx)).toContain(`${cfg.packages.predict}::expiry_market::redeem_settled`);
	});

	test('pin disagreeing with the descriptor expiry → PredictInputError', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(
			pc.tx.claimSettled(
				OWNER,
				{ underlying: 'BTC', expiryMs: EXPIRY + 1, marketId: MARKET_ID },
				{ orderId: 1n },
			),
		).rejects.toThrow(/expires at/);
	});

	test('malformed marketId → PredictInputError, not a silent ladder fallback', async () => {
		const pc = new PredictClient({ network: 'testnet', client: mockClient().client });
		await expect(
			pc.tx.claimSettled(
				OWNER,
				{ underlying: 'BTC', expiryMs: EXPIRY, marketId: '' },
				{ orderId: 1n },
			),
		).rejects.toThrow(/invalid marketId/);
	});
});

describe('read facade', () => {
	// The NAV path, which prices the market off chain, is in `client-queue.test.ts`.
	test('market is null when absent', async () => {
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
