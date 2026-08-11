import { bcs } from '@mysten/sui/bcs';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { expect, test } from 'vitest';
import { toGeneratedConfig } from '../src/config/generated.js';
import { TESTNET_CONFIG as cfg } from '../src/config/index.js';
import { U64_MAX } from '../src/units.js';
import {
	loadLivePricer,
	mintExactAmount,
	mintExactQuantity,
	redeemLive,
	redeemSettled,
} from '../src/tx/trade.js';

const config = toGeneratedConfig(cfg);
const btc = cfg.underlyings.BTC;
// The live-pricer feed bundle, keyed as the migrated `MarketFeeds` builder expects
// (see src/config/testnet.ts): one Pyth feed plus the two Block-Scholes stores.
const feeds = {
	pythFeed: btc.pythFeed,
	blockScholesValueStore: btc.blockScholesValueStore,
	blockScholesSviStore: btc.blockScholesSviStore,
};

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

// Resolve the base64 pure bytes an argument points at, or undefined if the
// argument is not a pure input (e.g. it's an object or a command result).
function argPureBytes(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const arg = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	if (arg.$kind !== 'Input' || arg.Input === undefined) return undefined;
	const input = tx.getData().inputs[arg.Input];
	return 'Pure' in input && input.Pure ? input.Pure.bytes : undefined;
}

// Resolve the object id an argument points at, or undefined if it is not an
// object input (e.g. it's a pure value or a command result).
function argObjectId(tx: Transaction, cmdIdx: number, argIdx: number): string | undefined {
	const arg = call(tx, cmdIdx).arguments[argIdx] as { $kind: string; Input?: number };
	if (arg.$kind !== 'Input' || arg.Input === undefined) return undefined;
	const input = tx.getData().inputs[arg.Input];
	if ('Object' in input && input.Object) {
		const o = input.Object;
		if ('ImmOrOwnedObject' in o && o.ImmOrOwnedObject) return o.ImmOrOwnedObject.objectId;
		if ('SharedObject' in o && o.SharedObject) return o.SharedObject.objectId;
	}
	if ('UnresolvedObject' in input && input.UnresolvedObject) return input.UnresolvedObject.objectId;
	return undefined;
}

// True when the argument at (cmdIdx, argIdx) is an object input pointing at `expected`,
// comparing in normalized 32-byte form (moveCall pads short ids like "0xabc").
function expectObject(tx: Transaction, cmdIdx: number, argIdx: number, expected: string) {
	expect(argObjectId(tx, cmdIdx, argIdx)).toBe(normalizeSuiObjectId(expected));
}

const u64B64 = (v: bigint) => Buffer.from(bcs.u64().serialize(v).toBytes()).toString('base64');
const u256B64 = (v: bigint) => Buffer.from(bcs.u256().serialize(v).toBytes()).toString('base64');
const U64_MAX_B64 = u64B64(U64_MAX);

test('loadLivePricer: 6 feed args + auto clock = 7, oracleRegistry as propbook_registry', () => {
	const tx = new Transaction();
	tx.add(loadLivePricer(config, { expiryMarketId: '0xabc', ...feeds }));
	expect(targets(tx)).toEqual([`${cfg.packages.predict}::expiry_market::load_live_pricer`]);
	// deployed sig: (market, config, propbook_registry, pyth, bs_values, bs_svi, clock)
	// → 6 passed args + auto-injected clock = 7 moveCall args (all objects, no pure/Result)
	const pricer = call(tx, 0);
	expect(pricer.arguments).toHaveLength(7);
	expectObject(tx, 0, 0, '0xabc'); // market
	expectObject(tx, 0, 1, cfg.objects.protocolConfig); // config
	expectObject(tx, 0, 2, cfg.objects.oracleRegistry); // propbook_registry = oracleRegistry
	expectObject(tx, 0, 3, btc.pythFeed); // pyth
	expectObject(tx, 0, 4, btc.blockScholesValueStore); // bs_values
	expectObject(tx, 0, 5, btc.blockScholesSviStore); // bs_svi
	expectObject(tx, 0, 6, '0x6'); // clock (auto-injected)
	// none of the pricer args are pure — it borrows only shared/immutable objects
	for (let i = 0; i < 7; i++) expect(argPureBytes(tx, 0, i)).toBeUndefined();
});

test('mintExactQuantity: pricer → auth → mint, 13 args', () => {
	const tx = new Transaction();
	tx.add(
		mintExactQuantity(config, {
			expiryMarketId: '0xabc',
			wrapperId: '0xdef',
			lowerTick: 10n,
			higherTick: 20n,
			quantityRaw: 1_000_000n,
			leverageRaw: 1_000_000_000n,
			...feeds,
		}),
	);
	expect(targets(tx)).toEqual([
		`${cfg.packages.predict}::expiry_market::load_live_pricer`,
		`${cfg.packages.account}::account::generate_auth`,
		`${cfg.packages.predict}::expiry_market::mint_exact_quantity`,
	]);
	const mint = call(tx, 2);
	// arg order: [market, wrapper, auth(Result), config, pricer(Result), lower, higher,
	//             quantity, leverage, maxCost, maxProbability, root, clock] → 13 args
	expect(mint.arguments).toHaveLength(13);
	expect(mint.arguments[2].$kind).toBe('Result'); // auth
	expect(mint.arguments[4].$kind).toBe('Result'); // pricer
	// defaults: maxCost (idx 9) and maxProbability (idx 10) = U64_MAX
	expect(argPureBytes(tx, 2, 9)).toBe(U64_MAX_B64);
	expect(argPureBytes(tx, 2, 10)).toBe(U64_MAX_B64);
});

test('mintExactQuantity: explicit maxCost/maxProbability override defaults', () => {
	const tx = new Transaction();
	tx.add(
		mintExactQuantity(config, {
			expiryMarketId: '0xabc',
			wrapperId: '0xdef',
			lowerTick: 10n,
			higherTick: 20n,
			quantityRaw: 1_000_000n,
			leverageRaw: 1_000_000_000n,
			maxCostRaw: 5_000_000n,
			maxProbabilityRaw: 900_000_000n,
			...feeds,
		}),
	);
	expect(argPureBytes(tx, 2, 9)).toBe(u64B64(5_000_000n));
	expect(argPureBytes(tx, 2, 10)).toBe(u64B64(900_000_000n));
	expect(argPureBytes(tx, 2, 9)).not.toBe(U64_MAX_B64);
});

test('mintExactAmount: pricer → auth → mint, 13 args, budget/min-quantity slots', () => {
	const tx = new Transaction();
	tx.add(
		mintExactAmount(config, {
			expiryMarketId: '0xabc',
			wrapperId: '0xdef',
			lowerTick: 10n,
			higherTick: 20n,
			maxPremiumRaw: 5_000_000n,
			minQuantityRaw: 1_000_000n,
			leverageRaw: 1_000_000_000n,
			...feeds,
		}),
	);
	expect(targets(tx)).toEqual([
		`${cfg.packages.predict}::expiry_market::load_live_pricer`,
		`${cfg.packages.account}::account::generate_auth`,
		`${cfg.packages.predict}::expiry_market::mint_exact_amount`,
	]);
	const mint = call(tx, 2);
	// arg order: [market, wrapper, auth(Result), config, pricer(Result), lower, higher,
	//             maxPremium, minQuantity, leverage, maxCost, root, clock] → 13 args
	expect(mint.arguments).toHaveLength(13);
	expect(mint.arguments[2].$kind).toBe('Result'); // auth
	expect(mint.arguments[4].$kind).toBe('Result'); // pricer
	// maxPremium (idx 7), minQuantity (idx 8), leverage (idx 9) are the passed raw values
	expect(argPureBytes(tx, 2, 7)).toBe(u64B64(5_000_000n));
	expect(argPureBytes(tx, 2, 8)).toBe(u64B64(1_000_000n));
	expect(argPureBytes(tx, 2, 9)).toBe(u64B64(1_000_000_000n));
	// maxCost (idx 10) defaults to U64_MAX when maxCostRaw is omitted
	expect(argPureBytes(tx, 2, 10)).toBe(U64_MAX_B64);
});

test('redeemLive: pricer → auth → redeem, 11 args, min-probability/min-proceeds floors', () => {
	const tx = new Transaction();
	tx.add(
		redeemLive(config, {
			expiryMarketId: '0xabc',
			wrapperId: '0xdef',
			orderId: 42n,
			closeQuantityRaw: 500_000n,
			...feeds,
		}),
	);
	expect(targets(tx)).toEqual([
		`${cfg.packages.predict}::expiry_market::load_live_pricer`,
		`${cfg.packages.account}::account::generate_auth`,
		`${cfg.packages.predict}::expiry_market::redeem_live`,
	]);
	const redeem = call(tx, 2);
	// deployed: market, wrapper, auth, config, pricer, order_id u256, close_quantity u64,
	//           min_probability u64, min_proceeds u64, root, clock → 11 moveCall args
	expect(redeem.arguments).toHaveLength(11);
	expect(redeem.arguments[2].$kind).toBe('Result'); // auth
	expect(redeem.arguments[4].$kind).toBe('Result'); // pricer
	expect(argPureBytes(tx, 2, 5)).toBe(u256B64(42n)); // order_id (u256)
	expect(argPureBytes(tx, 2, 6)).toBe(u64B64(500_000n)); // close_quantity
	// the new close-side slippage floor pair defaults to 0 (uncapped)
	expect(argPureBytes(tx, 2, 7)).toBe(u64B64(0n)); // min_probability
	expect(argPureBytes(tx, 2, 8)).toBe(u64B64(0n)); // min_proceeds
	// after the floor pair come root and clock objects — not pure values
	expect(argPureBytes(tx, 2, 9)).toBeUndefined(); // root object
	expect(argPureBytes(tx, 2, 10)).toBeUndefined(); // clock object
});

test('redeemLive: explicit min-probability/min-proceeds override the 0 defaults', () => {
	const tx = new Transaction();
	tx.add(
		redeemLive(config, {
			expiryMarketId: '0xabc',
			wrapperId: '0xdef',
			orderId: 42n,
			closeQuantityRaw: 500_000n,
			minProbabilityRaw: 100_000_000n,
			minProceedsRaw: 400_000n,
			...feeds,
		}),
	);
	expect(argPureBytes(tx, 2, 7)).toBe(u64B64(100_000_000n)); // min_probability
	expect(argPureBytes(tx, 2, 8)).toBe(u64B64(400_000n)); // min_proceeds
});

test('redeemSettled: auth → redeem_settled, 8 args, owner-auth hot potato', () => {
	const tx = new Transaction();
	tx.add(
		redeemSettled(config, {
			expiryMarketId: '0xabc',
			wrapperId: '0xdef',
			orderId: 42n,
			closeQuantityRaw: 500_000n,
		}),
	);
	// owner-auth form now mints an Auth hot potato first (no accountRegistry/oracle/pyth)
	expect(targets(tx)).toEqual([
		`${cfg.packages.account}::account::generate_auth`,
		`${cfg.packages.predict}::expiry_market::redeem_settled`,
	]);
	const redeem = call(tx, 1);
	// deployed: market, wrapper, auth, config, order_id u256, close_quantity u64, root, clock
	// → 8 moveCall args (no live pricer: settlement price is fixed)
	expect(redeem.arguments).toHaveLength(8);
	expectObject(tx, 1, 0, '0xabc'); // market
	expectObject(tx, 1, 1, '0xdef'); // wrapper
	expect(redeem.arguments[2].$kind).toBe('Result'); // auth (owner-auth hot potato)
	expectObject(tx, 1, 3, cfg.objects.protocolConfig); // config
	expect(argPureBytes(tx, 1, 4)).toBe(u256B64(42n)); // order_id (u256)
	expect(argPureBytes(tx, 1, 5)).toBe(u64B64(500_000n)); // close_quantity
	expectObject(tx, 1, 6, '0xacc'); // root
	expectObject(tx, 1, 7, '0x6'); // clock
});
