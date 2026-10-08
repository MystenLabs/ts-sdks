// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { GeneratedConfig } from '../config/generated.js';
import { U64_MAX } from '../units.js';
import { accountMoveCalls as account } from '../../account.js';
import * as expiryMarket from '../../contracts/deepbook_predict/expiry_market.js';
import { withAuth } from './common.js';

// The trade calls with their `auth` argument already supplied (see `withAuth`): each
// takes its generated options minus that slot and expands to auth → call.
const authed = {
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
// (`mint_*`, `redeem_live`) and every live quote (`quote_mint*`, the queue's `quote_redeem_open`) borrows
// this `&Pricer` and it must be loaded first in the PTB. Queued orders (`enqueue_*`) don't take
// one: they read the oracle objects directly. Deployed sig `load_live_pricer` (expiry_market.move): market, config,
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
// owner auth, then the one `expiry_market::*` call that consumes both.
//
// The live trades are retired: Predict v4 keeps their published signatures but names every
// parameter with a leading underscore, which codegen renders as a capitalized key (`_market` →
// `Market`). So the auth is minted here and passed as `Auth`, rather than through `withAuth`.
// The emitted commands are unchanged, and still reach a pre-v4 package.
function liveTrade(
	config: GeneratedConfig,
	args: { expiryMarketId: string } & MarketFeeds,
	build: (
		pricer: TransactionResult,
		auth: TransactionResult,
	) => (tx: Transaction) => TransactionResult,
): (tx: Transaction) => TransactionResult {
	return (tx) => {
		const pricer = tx.add(loadLivePricer(config, args));
		const auth = tx.add(account.generateAuth({ config }));
		return tx.add(build(pricer, auth));
	};
}

// Mint a position of an exact `quantityRaw`, capped by cost/probability ceilings,
// returning the new order id (u256). Command order is pricer → auth → mint (auth is a
// hot potato consumed by this call). `maxCostRaw`/`maxProbabilityRaw` default to
// `U64_MAX` (no slippage cap). Deployed sig `mint_exact_quantity`.
/**
 * @deprecated Retired by delayed execution (DBU-885): Predict v4's `mint_exact_quantity` always
 * aborts `EDelayedExecutionRequired`, so this works only while the config's call target is a
 * pre-v4 package. Use `enqueueExactQuantity` from `tx/queue.ts`.
 */
export function mintExactQuantity(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		lowerTick: bigint;
		higherTick: bigint;
		quantityRaw: bigint;
		maxCostRaw?: bigint;
		maxProbabilityRaw?: bigint;
	} & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return liveTrade(config, args, (pricer, auth) =>
		expiryMarket.mintExactQuantity({
			config,
			arguments: {
				Market: args.expiryMarketId,
				Wrapper: args.wrapperId,
				Auth: auth,
				Pricer: pricer,
				LowerTick: args.lowerTick,
				HigherTick: args.higherTick,
				Quantity: args.quantityRaw,
				MaxCost: args.maxCostRaw ?? U64_MAX,
				MaxProbability: args.maxProbabilityRaw ?? U64_MAX,
			},
		}),
	);
}

// Mint by spending up to `maxPremiumRaw` (raw quote units), enforcing a `minQuantityRaw`
// floor on the position received and a `maxCostRaw` all-in ceiling, returning the new
// order id (u256). Command order is pricer → auth → mint. Deployed sig
// `mint_exact_amount`: …, max_premium, min_quantity, max_cost, root.
/**
 * @deprecated Retired by delayed execution (DBU-885): Predict v4 always aborts it
 * (`EDelayedExecutionRequired`). Use `enqueueExactAmount`.
 */
export function mintExactAmount(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		lowerTick: bigint;
		higherTick: bigint;
		maxPremiumRaw: bigint;
		minQuantityRaw: bigint;
		maxCostRaw?: bigint;
	} & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return liveTrade(config, args, (pricer, auth) =>
		expiryMarket.mintExactAmount({
			config,
			arguments: {
				Market: args.expiryMarketId,
				Wrapper: args.wrapperId,
				Auth: auth,
				Pricer: pricer,
				LowerTick: args.lowerTick,
				HigherTick: args.higherTick,
				MaxPremium: args.maxPremiumRaw,
				MinQuantity: args.minQuantityRaw,
				MaxCost: args.maxCostRaw ?? U64_MAX,
			},
		}),
	);
}

/**
 * Mint within an all-in budget, including fees, using the v2 entrypoint.
 * @deprecated Retired by delayed execution (DBU-885): Predict v4 always aborts it
 * (`EDelayedExecutionRequired`). Use `enqueueExactCost`.
 */
export function mintExactCost(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		lowerTick: bigint;
		higherTick: bigint;
		maxCostRaw: bigint;
		minQuantityRaw: bigint;
	} & MarketFeeds,
): (tx: Transaction) => TransactionResult {
	return liveTrade(config, args, (pricer, auth) =>
		expiryMarket.mintExactCost({
			config,
			arguments: {
				Market: args.expiryMarketId,
				Wrapper: args.wrapperId,
				Auth: auth,
				Pricer: pricer,
				LowerTick: args.lowerTick,
				HigherTick: args.higherTick,
				MaxCost: args.maxCostRaw,
				MinQuantity: args.minQuantityRaw,
			},
		}),
	);
}

// Owner-authorized redeem of a live (not-yet-settled) position: close `closeQuantityRaw`
// of `orderId` at the live pricer's mark, enforcing close-side slippage floors
// (`minProbabilityRaw`/`minProceedsRaw`, default 0 = uncapped). Returns `Option<u256>`:
// the replacement order id when a partial close leaves quantity open, else none. Command
// order is pricer → auth → redeem. Deployed sig `redeem_live`.
/**
 * @deprecated Retired by delayed execution (DBU-885): Predict v4 always aborts it
 * (`EDelayedExecutionRequired`). Account positions then have no early exit; queued fills are Open
 * records sold with `enqueueRedeemOpen`.
 */
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
	return liveTrade(config, args, (pricer, auth) =>
		expiryMarket.redeemLive({
			config,
			arguments: {
				Market: args.expiryMarketId,
				Wrapper: args.wrapperId,
				Auth: auth,
				Pricer: pricer,
				OrderId: args.orderId,
				CloseQuantity: args.closeQuantityRaw,
				MinProbability: args.minProbabilityRaw ?? 0n,
				MinProceeds: args.minProceedsRaw ?? 0n,
			},
		}),
	);
}

// Unchanged by delayed execution: still pays settled positions held in the account. It doesn't
// pay Open queue records, which the queue's `settle_step` pays at settlement.
//
// Owner-authorized redeem of a settled position: closes `orderId` IN FULL against the
// recorded settlement price (the deployed entrypoint takes no quantity — a settled claim
// is all-or-nothing). No live pricer (settlement price is fixed); auth is consumed by the
// call. Deployed sig `redeem_settled` (owner-auth form). The keeper-facing
// `redeem_settled_permissionless` is a separate entrypoint, out of scope for this SDK.
export function redeemSettled(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		wrapperId: string;
		orderId: bigint;
	},
): (tx: Transaction) => TransactionResult {
	return authed.redeemSettled({
		config,
		arguments: {
			market: args.expiryMarketId,
			wrapper: args.wrapperId,
			orderId: args.orderId,
		},
	});
}
