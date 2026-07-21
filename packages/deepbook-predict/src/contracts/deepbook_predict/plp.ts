/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * PLP token and pool vault.
 *
 * PoolVault owns the PLP treasury cap, the pooled DEEP staked by accounts, idle
 * DUSDC, the protocol reserve, sponsor-funded fee incentives, per-expiry cash
 * accounting, and the queued LP supply/withdraw requests. It coordinates the
 * full-pool NAV valuation (a hot-potato aggregation over every active market) and
 * the unified per-market cash flow (initial funding, live rebalance/sweep, and
 * settled-market sweep with terminal profit materialization). LPs queue
 * supply/withdraw requests routed through a loaded Account; each flush
 * (`finish_flush`) drains them at the frozen pool NAV, minting/burning PLP and
 * delivering fills to each account via the balance accumulator. DEEP held here
 * provides account trading benefits and is not part of PLP share value.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as balance from './deps/sui/balance.js';
import * as lp_book from './lp_book.js';
import * as pool_accounting from './pool_accounting.js';
const $moduleName = '@local-pkg/deepbook_predict::plp';
export const PLP = new MoveStruct({
	name: `${$moduleName}::PLP`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const PoolVault = new MoveStruct({
	name: `${$moduleName}::PoolVault`,
	fields: {
		id: bcs.Address,
		/**
		 * Protocol-owned DUSDC excluded from PLP redemption. No package entrypoint
		 * withdraws this balance.
		 */
		protocol_reserve_balance: balance.Balance,
		/** Sponsor-funded DUSDC reserved for taker fee sponsorship, excluded from PLP NAV. */
		fee_incentive_reserve: balance.Balance,
		/**
		 * Pooled DEEP staked by all accounts for trading benefits. Per-account
		 * active/inactive amounts are mirrored in Predict account data.
		 */
		staked_deep: balance.Balance,
		/** PLP share issuance plus queued supply/withdraw escrow. */
		lp: lp_book.LpBook,
		/** Idle DUSDC custody, registered expiries, and per-expiry cash-flow rows. */
		expiry_accounting: pool_accounting.Ledger,
	},
});
export const PoolValuation = new MoveStruct({
	name: `${$moduleName}::PoolValuation`,
	fields: {
		pool_vault_id: bcs.Address,
		/** Active expiry markets snapshotted at start; every one must be valued. */
		expected_expiry_markets: bcs.vector(bcs.Address),
		/** Markets valued so far this flow; folded against `expected` at finish. */
		valued_expiry_markets: bcs.vector(bcs.Address),
		/** Running Σ of each valued market's NAV (settled markets contribute 0). */
		total_nav: bcs.u64(),
	},
});
export interface IdArguments {
	vault: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [vault: RawTransactionArgument<string>];
}
/** Return the pool vault object ID for external discovery and PTB construction. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StakedDeepArguments {
	vault: RawTransactionArgument<string>;
}
export interface StakedDeepOptions {
	package?: string;
	arguments: StakedDeepArguments | [vault: RawTransactionArgument<string>];
}
/** Return pooled DEEP custody for SDK and devInspect state reads. */
export function stakedDeep(options: StakedDeepOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'staked_deep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IdleBalanceArguments {
	vault: RawTransactionArgument<string>;
}
export interface IdleBalanceOptions {
	package?: string;
	arguments: IdleBalanceArguments | [vault: RawTransactionArgument<string>];
}
/** Return idle DUSDC for SDK and devInspect state reads. */
export function idleBalance(options: IdleBalanceOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'idle_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProtocolReserveBalanceArguments {
	vault: RawTransactionArgument<string>;
}
export interface ProtocolReserveBalanceOptions {
	package?: string;
	arguments: ProtocolReserveBalanceArguments | [vault: RawTransactionArgument<string>];
}
/** Return protocol-owned DUSDC for SDK and devInspect state reads. */
export function protocolReserveBalance(options: ProtocolReserveBalanceOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'protocol_reserve_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FeeIncentiveReserveArguments {
	vault: RawTransactionArgument<string>;
}
export interface FeeIncentiveReserveOptions {
	package?: string;
	arguments: FeeIncentiveReserveArguments | [vault: RawTransactionArgument<string>];
}
/** Return sponsor-funded fee reserves for SDK and devInspect state reads. */
export function feeIncentiveReserve(options: FeeIncentiveReserveOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'fee_incentive_reserve',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PlpTotalSupplyArguments {
	vault: RawTransactionArgument<string>;
}
export interface PlpTotalSupplyOptions {
	package?: string;
	arguments: PlpTotalSupplyArguments | [vault: RawTransactionArgument<string>];
}
/** Return total PLP supply for SDK and devInspect state reads. */
export function plpTotalSupply(options: PlpTotalSupplyOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'plp_total_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SupplyRequestsPendingArguments {
	vault: RawTransactionArgument<string>;
}
export interface SupplyRequestsPendingOptions {
	package?: string;
	arguments: SupplyRequestsPendingArguments | [vault: RawTransactionArgument<string>];
}
/** Return pending LP supply count for SDK and devInspect queue reads. */
export function supplyRequestsPending(options: SupplyRequestsPendingOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'supply_requests_pending',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface WithdrawRequestsPendingArguments {
	vault: RawTransactionArgument<string>;
}
export interface WithdrawRequestsPendingOptions {
	package?: string;
	arguments: WithdrawRequestsPendingArguments | [vault: RawTransactionArgument<string>];
}
/** Return pending LP withdrawal count for SDK and devInspect queue reads. */
export function withdrawRequestsPending(options: WithdrawRequestsPendingOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'withdraw_requests_pending',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ActiveExpiryMarketsArguments {
	vault: RawTransactionArgument<string>;
}
export interface ActiveExpiryMarketsOptions {
	package?: string;
	arguments: ActiveExpiryMarketsArguments | [vault: RawTransactionArgument<string>];
}
/** Return active expiry IDs for external PTB construction and pool inspection. */
export function activeExpiryMarkets(options: ActiveExpiryMarketsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'active_expiry_markets',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ActiveLiveExpiryCountArguments {
	vault: RawTransactionArgument<string>;
}
export interface ActiveLiveExpiryCountOptions {
	package?: string;
	arguments: ActiveLiveExpiryCountArguments | [vault: RawTransactionArgument<string>];
}
/** Return the pre-expiry active count for SDK and devInspect capacity reads. */
export function activeLiveExpiryCount(options: ActiveLiveExpiryCountOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'active_live_expiry_count',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProfitBasisDebitsArguments {
	vault: RawTransactionArgument<string>;
}
export interface ProfitBasisDebitsOptions {
	package?: string;
	arguments: ProfitBasisDebitsArguments | [vault: RawTransactionArgument<string>];
}
/** Return the profit-basis debits for external accounting observability. */
export function profitBasisDebits(options: ProfitBasisDebitsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'profit_basis_debits',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProfitBasisCreditsArguments {
	vault: RawTransactionArgument<string>;
}
export interface ProfitBasisCreditsOptions {
	package?: string;
	arguments: ProfitBasisCreditsArguments | [vault: RawTransactionArgument<string>];
}
/** Return the profit-basis credits for external accounting observability. */
export function profitBasisCredits(options: ProfitBasisCreditsOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'profit_basis_credits',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PendingProtocolProfitArguments {
	vault: RawTransactionArgument<string>;
}
export interface PendingProtocolProfitOptions {
	package?: string;
	arguments: PendingProtocolProfitArguments | [vault: RawTransactionArgument<string>];
}
/** Return deferred protocol profit for external accounting observability. */
export function pendingProtocolProfit(options: PendingProtocolProfitOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'pending_protocol_profit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StartPoolValuationArguments {
	config: RawTransactionArgument<string>;
	vault: RawTransactionArgument<string>;
	lifecycleProof: TransactionArgument;
}
export interface StartPoolValuationOptions {
	package?: string;
	arguments:
		| StartPoolValuationArguments
		| [
				config: RawTransactionArgument<string>,
				vault: RawTransactionArgument<string>,
				lifecycleProof: TransactionArgument,
		  ];
}
/**
 * Begin a full-pool valuation using a registry-issued lifecycle proof. The proof
 * grants control over when current oracle state is frozen for queued LP fills.
 * Starting engages the transaction-local valuation lock and snapshots every active
 * expiry that must be included before the queues can drain.
 */
export function startPoolValuation(options: StartPoolValuationOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['config', 'vault', 'lifecycleProof'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'start_pool_valuation',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValueExpiryArguments {
	valuation: TransactionArgument;
	vault: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsSpot: RawTransactionArgument<string>;
	bsForward: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
}
export interface ValueExpiryOptions {
	package?: string;
	arguments:
		| ValueExpiryArguments
		| [
				valuation: TransactionArgument,
				vault: RawTransactionArgument<string>,
				market: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				propbookRegistry: RawTransactionArgument<string>,
				pyth: RawTransactionArgument<string>,
				bsSpot: RawTransactionArgument<string>,
				bsForward: RawTransactionArgument<string>,
				bsSvi: RawTransactionArgument<string>,
		  ];
}
/**
 * Run the per-market cash flow for one snapshotted market, then fold its NAV into
 * the running total. The market must be in the snapshot and not already valued. A
 * settled market is swept (deactivated, cash returned, profit materialized) and
 * contributes 0; a live market is rebalanced to target and valued on its current
 * cash.
 *
 * Settlement is a separate PTB step through `expiry_market::try_settle`. An
 * expired unsettled market cannot produce the live pricer required here.
 */
export function valueExpiry(options: ValueExpiryOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'valuation',
		'vault',
		'market',
		'config',
		'propbookRegistry',
		'pyth',
		'bsSpot',
		'bsForward',
		'bsSvi',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'value_expiry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FinishFlushArguments {
	valuation: TransactionArgument;
	vault: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	supplyBudget: RawTransactionArgument<number | bigint | null>;
	withdrawBudget: RawTransactionArgument<number | bigint | null>;
}
export interface FinishFlushOptions {
	package?: string;
	arguments:
		| FinishFlushArguments
		| [
				valuation: TransactionArgument,
				vault: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				supplyBudget: RawTransactionArgument<number | bigint | null>,
				withdrawBudget: RawTransactionArgument<number | bigint | null>,
		  ];
}
/**
 * Finish a full-pool valuation and run the LP flush: prove every snapshotted
 * market was valued exactly once, price the pool NAV, then drain the
 * supply/withdraw queues at that frozen mark (mint PLP for supplies, burn PLP and
 * pay DUSDC for withdrawals), release the valuation lock, consume the potato, and
 * return the LP-attributable pool-wide DUSDC NAV (idle + Σ active NAV, net of the
 * pending-protocol-profit exclusion priced from the aggregate profit basis).
 *
 * `supply_budget` and `withdraw_budget` bound how many requests each queue may
 * process this flush (`None` = unbounded). Filled heads, protocol-refunded
 * non-executable heads, and live limit misses count as processed; a live limit
 * miss remains queued and stops that queue for the flush. A withdrawal whose quote
 * is valid but exceeds idle carries without spending budget. The budgets are
 * independent, so a supply backlog does not consume withdrawal capacity.
 */
export function finishFlush(options: FinishFlushOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		'0x1::option::Option<u64>',
		'0x1::option::Option<u64>',
	] satisfies (string | null)[];
	const parameterNames = ['valuation', 'vault', 'config', 'supplyBudget', 'withdrawBudget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'finish_flush',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StakeDeepArguments {
	vault: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface StakeDeepOptions {
	package?: string;
	arguments:
		| StakeDeepArguments
		| [
				vault: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				config: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Stake DEEP for trading benefits. The DEEP is held in the pool vault; the new
 * amount is recorded as inactive and becomes eligible after the next epoch
 * boundary. It moves to active only when a later stake, trade, or claim flow calls
 * `predict_account::roll_active_stake`. Callable anytime, any number of times.
 */
export function stakeDeep(options: StakeDeepOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, 'u64', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'amount', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'stake_deep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnstakeDeepArguments {
	vault: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config: RawTransactionArgument<string>;
	root: RawTransactionArgument<string>;
}
export interface UnstakeDeepOptions {
	package?: string;
	arguments:
		| UnstakeDeepArguments
		| [
				vault: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				config: RawTransactionArgument<string>,
				root: RawTransactionArgument<string>,
		  ];
}
/** Withdraw all staked DEEP (active and inactive) at any time, no penalty. */
export function unstakeDeep(options: UnstakeDeepOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'unstake_deep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RebalanceExpiryCashArguments {
	vault: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
}
export interface RebalanceExpiryCashOptions {
	package?: string;
	arguments:
		| RebalanceExpiryCashArguments
		| [
				vault: RawTransactionArgument<string>,
				market: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
		  ];
}
/**
 * Move cash between pool idle liquidity and one expiry market.
 *
 * Permissionless and standalone: anyone may call it at any cadence. Handles all
 * three per-market cases — initial funding of a freshly registered (unfunded)
 * market, ongoing live rebalance/surplus-sweep toward target, and the
 * settled-market sweep (deactivate, return all free cash, materialize profit).
 * Call `expiry_market::try_settle` first in the same PTB when settlement may be
 * due. An expired unsettled market is a no-op until that transition succeeds. Mint
 * asserts backing but never pulls pool cash, so this is what makes a market
 * mintable. The market must already be registered to this vault
 * (`registry::create_and_share_expiry_market`). Blocked while a full-pool
 * valuation is in progress.
 */
export function rebalanceExpiryCash(options: RebalanceExpiryCashOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['vault', 'market', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'rebalance_expiry_cash',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ClaimTradingLossRebateArguments {
	vault: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config: RawTransactionArgument<string>;
	root: RawTransactionArgument<string>;
}
export interface ClaimTradingLossRebateOptions {
	package?: string;
	arguments:
		| ClaimTradingLossRebateArguments
		| [
				vault: RawTransactionArgument<string>,
				market: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				config: RawTransactionArgument<string>,
				root: RawTransactionArgument<string>,
		  ];
}
/** Resolve a settled trading-loss rebate using valid account authority. */
export function claimTradingLossRebate(options: ClaimTradingLossRebateOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['vault', 'market', 'wrapper', 'auth', 'config', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'claim_trading_loss_rebate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ClaimTradingLossRebatePermissionlessArguments {
	vault: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	accountRegistry: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	root: RawTransactionArgument<string>;
}
export interface ClaimTradingLossRebatePermissionlessOptions {
	package?: string;
	arguments:
		| ClaimTradingLossRebatePermissionlessArguments
		| [
				vault: RawTransactionArgument<string>,
				market: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				accountRegistry: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Permissionlessly resolve one account's settled trading-loss rebate using Predict
 * app auth. `deauthorize_app<PredictApp>` disables this automation; owners can
 * still use `claim_trading_loss_rebate` with owner auth.
 */
export function claimTradingLossRebatePermissionless(
	options: ClaimTradingLossRebatePermissionlessOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['vault', 'market', 'wrapper', 'accountRegistry', 'config', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'claim_trading_loss_rebate_permissionless',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SponsorFeeIncentivesArguments {
	vault: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface SponsorFeeIncentivesOptions {
	package?: string;
	arguments:
		| SponsorFeeIncentivesArguments
		| [
				vault: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				payment: RawTransactionArgument<string>,
		  ];
}
/**
 * Sponsor taker fee incentives with DUSDC. Anyone may contribute; the payment
 * joins a pool-level reserve that is excluded from PLP NAV and later allocated to
 * expiry markets by the normal rebalance flow.
 */
export function sponsorFeeIncentives(options: SponsorFeeIncentivesOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['vault', 'config', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'sponsor_fee_incentives',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LockCapitalArguments {
	vault: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface LockCapitalOptions {
	package?: string;
	arguments:
		| LockCapitalArguments
		| [
				vault: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				payment: RawTransactionArgument<string>,
		  ];
}
/**
 * Bootstrap the pool exactly once: permanently lock `payment` DUSDC of minimum
 * liquidity. Mints matching PLP (1:1) into the book's locked balance — never
 * withdrawable, so the caller receives no shares — and joins the DUSDC into idle.
 * This keeps `total_supply > 0` while the vault exists and gives rounding dust a
 * non-withdrawable PLP holder. Requires root authority and zero existing supply.
 * Supply, withdrawal, and flush flows remain disabled until the locked liquidity
 * has been created.
 */
export function lockCapital(options: LockCapitalOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null] satisfies (string | null)[];
	const parameterNames = ['vault', 'config', 'AdminCap', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'lock_capital',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestSupplyArguments {
	vault: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	minPlpOut: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface RequestSupplyOptions {
	package?: string;
	arguments:
		| RequestSupplyArguments
		| [
				vault: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				config: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				minPlpOut: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Queue a supply request: pull `amount` DUSDC from account custody into queue
 * escrow, recording the account's receive address as the fill recipient. The pull
 * auto-settles any flush-delivered DUSDC first. The account receives minted PLP
 * only if a future flush can mint at least `min_plp_out`; after three limit misses
 * the request is cancelled and refunded. Returns the queue index, the handle used
 * to cancel before the flush.
 */
export function requestSupply(options: RequestSupplyOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'amount', 'minPlpOut', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'request_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestWithdrawArguments {
	vault: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	minDusdcOut: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface RequestWithdrawOptions {
	package?: string;
	arguments:
		| RequestWithdrawArguments
		| [
				vault: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				config: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				minDusdcOut: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Queue a withdraw request: pull `amount` PLP shares from account custody into
 * queue escrow, recording the account's receive address as the fill recipient. The
 * pull auto-settles any flush-delivered PLP first. The request fills only if a
 * future flush can pay at least `min_dusdc_out`; after three limit misses the
 * request is cancelled and refunded. Returns the queue index used to cancel before
 * the flush.
 */
export function requestWithdraw(options: RequestWithdrawOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'amount', 'minDusdcOut', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'request_withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CancelSupplyRequestArguments {
	vault: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config: RawTransactionArgument<string>;
	index: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface CancelSupplyRequestOptions {
	package?: string;
	arguments:
		| CancelSupplyRequestArguments
		| [
				vault: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				config: RawTransactionArgument<string>,
				index: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Cancel a still-pending supply request, refunding its escrowed DUSDC straight
 * into the requesting account. `account` must be the request's recorded recipient.
 */
export function cancelSupplyRequest(options: CancelSupplyRequestOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, 'u64', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'index', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'cancel_supply_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CancelWithdrawRequestArguments {
	vault: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config: RawTransactionArgument<string>;
	index: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface CancelWithdrawRequestOptions {
	package?: string;
	arguments:
		| CancelWithdrawRequestArguments
		| [
				vault: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: TransactionArgument,
				config: RawTransactionArgument<string>,
				index: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Cancel a still-pending withdraw request, refunding its escrowed PLP straight
 * into the requesting account. `account` must be the request's recorded recipient.
 */
export function cancelWithdrawRequest(options: CancelWithdrawRequestOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, 'u64', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'index', 'root'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'cancel_withdraw_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
