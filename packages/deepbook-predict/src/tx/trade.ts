import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { GeneratedConfig } from '../config/generated.js';
import { U64_MAX } from '../units.js';
import * as expiryMarket from '../contracts/deepbook_predict/expiry_market.js';
import { withAuth } from './common.js';

// The four trade calls with their `auth` argument already supplied (see `withAuth`): each
// takes its generated options minus that slot and expands to auth → call.
const authed = {
	mintExactQuantity: withAuth(expiryMarket.mintExactQuantity),
	mintExactAmount: withAuth(expiryMarket.mintExactAmount),
	redeemLive: withAuth(expiryMarket.redeemLive),
	redeemSettled: withAuth(expiryMarket.redeemSettled),
};

// The oracle feed object ids a live market's pricer reads. Grouped so callers pass one
// bundle; the deployment's per-underlying ids live in `cfg.underlyings[symbol]` (see
// `src/config/testnet.ts`), named to match `deployment.testnet.json`.
export interface MarketFeeds {
	pythFeed: string;
	blockScholesValueStore: string;
	blockScholesSviStore: string;
}

// Load a fresh `Pricer` from the live oracle feeds. Every live-flow trade call
// (`mint_*`, `redeem_live`) borrows this `&Pricer` and it must be loaded first in the
// PTB. Deployed sig `load_live_pricer` (expiry_market.move): market, config,
// propbook_registry (&OracleRegistry), pyth, bs_values, bs_svi, clock (auto-injected).
// `config` and `propbook_registry` are supplied by the config slice, not named here.
export function loadLivePricer(
	config: GeneratedConfig,
	args: { expiryMarketId: string } & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return (tx) =>
		tx.add(
			expiryMarket.loadLivePricer({
				config,
				arguments: {
					market: args.expiryMarketId,
					pyth: args.pythFeed,
					bsValues: args.blockScholesValueStore,
					bsSvi: args.blockScholesSviStore,
				},
			}),
		);
}

// The three commands every live-flow trade is: load a fresh market-bound `Pricer`, mint
// owner auth, then the one `expiry_market::*` call that consumes both. Only the pricer is
// composed here — `build` returns an `authed.*` call, which is the other two commands.
function liveTrade(
	config: GeneratedConfig,
	args: { expiryMarketId: string } & MarketFeeds,
	build: (pricer: TransactionResult) => (tx: Transaction) => TransactionResult,
): (tx: Transaction) => TransactionResult {
	return (tx) => {
		const pricer = tx.add(loadLivePricer(config, args));
		return tx.add(build(pricer));
	};
}

// Mint a position of an exact `quantityRaw`, capped by cost/probability ceilings,
// returning the new order id (u256). Command order is pricer → auth → mint (auth is a
// hot potato consumed by this call). `maxCostRaw`/`maxProbabilityRaw` default to
// `U64_MAX` (no slippage cap). Deployed sig `mint_exact_quantity`.
export function mintExactQuantity(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		lowerTick: bigint;
		higherTick: bigint;
		quantityRaw: bigint;
		leverageRaw: bigint;
		maxCostRaw?: bigint;
		maxProbabilityRaw?: bigint;
	} & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return liveTrade(config, args, (pricer) =>
		authed.mintExactQuantity({
			config,
			arguments: {
				market: args.expiryMarketId,
				wrapper: args.wrapperId,
				pricer,
				lowerTick: args.lowerTick,
				higherTick: args.higherTick,
				quantity: args.quantityRaw,
				leverage: args.leverageRaw,
				maxCost: args.maxCostRaw ?? U64_MAX,
				maxProbability: args.maxProbabilityRaw ?? U64_MAX,
			},
		}),
	);
}

// Mint by spending up to `maxPremiumRaw` (raw quote units) at leverage, enforcing a
// `minQuantityRaw` floor on the position received and a `maxCostRaw` all-in ceiling,
// returning the new order id (u256). Command order is pricer → auth → mint. Deployed
// sig `mint_exact_amount`: …, max_premium, min_quantity, leverage, max_cost, root.
export function mintExactAmount(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		lowerTick: bigint;
		higherTick: bigint;
		maxPremiumRaw: bigint;
		minQuantityRaw: bigint;
		leverageRaw: bigint;
		maxCostRaw?: bigint;
	} & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return liveTrade(config, args, (pricer) =>
		authed.mintExactAmount({
			config,
			arguments: {
				market: args.expiryMarketId,
				wrapper: args.wrapperId,
				pricer,
				lowerTick: args.lowerTick,
				higherTick: args.higherTick,
				maxPremium: args.maxPremiumRaw,
				minQuantity: args.minQuantityRaw,
				leverage: args.leverageRaw,
				maxCost: args.maxCostRaw ?? U64_MAX,
			},
		}),
	);
}

// Owner-authorized redeem of a live (not-yet-settled) position: close `closeQuantityRaw`
// of `orderId` at the live pricer's mark, enforcing close-side slippage floors
// (`minProbabilityRaw`/`minProceedsRaw`, default 0 = uncapped). Returns (closed order id
// u256, Option<replacement order id>). Command order is pricer → auth → redeem. Deployed
// sig `redeem_live`.
export function redeemLive(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		orderId: bigint;
		closeQuantityRaw: bigint;
		minProbabilityRaw?: bigint;
		minProceedsRaw?: bigint;
	} & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return liveTrade(config, args, (pricer) =>
		authed.redeemLive({
			config,
			arguments: {
				market: args.expiryMarketId,
				wrapper: args.wrapperId,
				pricer,
				orderId: args.orderId,
				closeQuantity: args.closeQuantityRaw,
				minProbability: args.minProbabilityRaw ?? 0n,
				minProceeds: args.minProceedsRaw ?? 0n,
			},
		}),
	);
}

// Owner-authorized redeem of a settled position: close `closeQuantityRaw` of `orderId`
// against the recorded settlement price. Returns (closed order id u256, Option<replacement
// order id>). No live pricer (settlement price is fixed); auth is consumed by the call.
// Deployed sig `redeem_settled` (owner-auth form). The keeper-facing
// `redeem_settled_permissionless` is a separate entrypoint, out of scope for this SDK.
export function redeemSettled(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		orderId: bigint;
		closeQuantityRaw: bigint;
	},
): (tx: Transaction) => TransactionResult {
	return authed.redeemSettled({
		config,
		arguments: {
			market: args.expiryMarketId,
			wrapper: args.wrapperId,
			orderId: args.orderId,
			closeQuantity: args.closeQuantityRaw,
		},
	});
}
