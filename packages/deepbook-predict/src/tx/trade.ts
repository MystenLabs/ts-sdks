import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { ACCUMULATOR_ROOT_ID, type PredictConfig } from '../config/index.js';
import { U64_MAX } from '../units.js';
import * as expiryMarket from '../contracts/deepbook_predict/expiry_market.js';
import { generateAuth } from './common.js';

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
export function loadLivePricer(
	cfg: PredictConfig,
	args: { expiryMarketId: string } & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return (tx) => {
		return tx.add(
			expiryMarket.loadLivePricer({
				package: cfg.packages.predict,
				arguments: {
					market: args.expiryMarketId,
					config: cfg.objects.protocolConfig,
					propbookRegistry: cfg.objects.oracleRegistry,
					pyth: args.pythFeed,
					bsValues: args.blockScholesValueStore,
					bsSvi: args.blockScholesSviStore,
				},
			}),
		);
	};
}

// Mint a position of an exact `quantityRaw`, capped by cost/probability ceilings,
// returning the new order id (u256). Command order is pricer → auth → mint (auth is a
// hot potato consumed by this call). `maxCostRaw`/`maxProbabilityRaw` default to
// `U64_MAX` (no slippage cap). Deployed sig `mint_exact_quantity`.
export function mintExactQuantity(
	cfg: PredictConfig,
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
	return (tx) => {
		const pricer = tx.add(loadLivePricer(cfg, args));
		const auth = tx.add(generateAuth(cfg));
		return tx.add(
			expiryMarket.mintExactQuantity({
				package: cfg.packages.predict,
				arguments: {
					market: args.expiryMarketId,
					wrapper: args.wrapperId,
					auth,
					config: cfg.objects.protocolConfig,
					pricer,
					lowerTick: args.lowerTick,
					higherTick: args.higherTick,
					quantity: args.quantityRaw,
					leverage: args.leverageRaw,
					maxCost: args.maxCostRaw ?? U64_MAX,
					maxProbability: args.maxProbabilityRaw ?? U64_MAX,
					root: ACCUMULATOR_ROOT_ID,
				},
			}),
		);
	};
}

// Mint by spending up to `maxPremiumRaw` (raw quote units) at leverage, enforcing a
// `minQuantityRaw` floor on the position received and a `maxCostRaw` all-in ceiling,
// returning the new order id (u256). Command order is pricer → auth → mint. Deployed
// sig `mint_exact_amount`: …, max_premium, min_quantity, leverage, max_cost, root.
export function mintExactAmount(
	cfg: PredictConfig,
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
	return (tx) => {
		const pricer = tx.add(loadLivePricer(cfg, args));
		const auth = tx.add(generateAuth(cfg));
		return tx.add(
			expiryMarket.mintExactAmount({
				package: cfg.packages.predict,
				arguments: {
					market: args.expiryMarketId,
					wrapper: args.wrapperId,
					auth,
					config: cfg.objects.protocolConfig,
					pricer,
					lowerTick: args.lowerTick,
					higherTick: args.higherTick,
					maxPremium: args.maxPremiumRaw,
					minQuantity: args.minQuantityRaw,
					leverage: args.leverageRaw,
					maxCost: args.maxCostRaw ?? U64_MAX,
					root: ACCUMULATOR_ROOT_ID,
				},
			}),
		);
	};
}

// Owner-authorized redeem of a live (not-yet-settled) position: close `closeQuantityRaw`
// of `orderId` at the live pricer's mark, enforcing close-side slippage floors
// (`minProbabilityRaw`/`minProceedsRaw`, default 0 = uncapped). Returns (closed order id
// u256, Option<replacement order id>). Command order is pricer → auth → redeem. Deployed
// sig `redeem_live`.
export function redeemLive(
	cfg: PredictConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		orderId: bigint;
		closeQuantityRaw: bigint;
		minProbabilityRaw?: bigint;
		minProceedsRaw?: bigint;
	} & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return (tx) => {
		const pricer = tx.add(loadLivePricer(cfg, args));
		const auth = tx.add(generateAuth(cfg));
		return tx.add(
			expiryMarket.redeemLive({
				package: cfg.packages.predict,
				arguments: {
					market: args.expiryMarketId,
					wrapper: args.wrapperId,
					auth,
					config: cfg.objects.protocolConfig,
					pricer,
					orderId: args.orderId,
					closeQuantity: args.closeQuantityRaw,
					minProbability: args.minProbabilityRaw ?? 0n,
					minProceeds: args.minProceedsRaw ?? 0n,
					root: ACCUMULATOR_ROOT_ID,
				},
			}),
		);
	};
}

// Owner-authorized redeem of a settled position: close `closeQuantityRaw` of `orderId`
// against the recorded settlement price. Returns (closed order id u256, Option<replacement
// order id>). No live pricer (settlement price is fixed); auth is consumed by the call.
// Deployed sig `redeem_settled` (owner-auth form). The keeper-facing
// `redeem_settled_permissionless` is a separate entrypoint, out of scope for this SDK.
export function redeemSettled(
	cfg: PredictConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		orderId: bigint;
		closeQuantityRaw: bigint;
	},
): (tx: Transaction) => TransactionResult {
	return (tx) => {
		const auth = tx.add(generateAuth(cfg));
		return tx.add(
			expiryMarket.redeemSettled({
				package: cfg.packages.predict,
				arguments: {
					market: args.expiryMarketId,
					wrapper: args.wrapperId,
					auth,
					config: cfg.objects.protocolConfig,
					orderId: args.orderId,
					closeQuantity: args.closeQuantityRaw,
					root: ACCUMULATOR_ROOT_ID,
				},
			}),
		);
	};
}
