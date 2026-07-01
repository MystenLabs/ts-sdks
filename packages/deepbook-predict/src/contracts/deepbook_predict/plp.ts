/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * PLP token and pool vault.
 *
 * PoolVault owns the PLP treasury cap, the pooled DEEP staked by accounts, idle
 * DUSDC, the protocol reserve, sponsor-funded fee incentives, per-expiry cash
 * accounting, and the async LP supply/withdraw queues. It coordinates the
 * full-pool NAV valuation (a hot-potato aggregation over every active market) and
 * the unified per-market cash flow (initial funding, live rebalance/sweep, and
 * settled-market sweep with terminal profit materialization). LPs queue
 * supply/withdraw requests routed through a loaded Account; the daily flush
 * (`finish_flush`) drains them at the frozen pool NAV, minting/burning PLP and
 * delivering fills to each account via the balance accumulator. PLP incentives
 * moved to a separate staking contract; DEEP staking is an unrelated trading
 * feature.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance from './deps/sui/balance.js';
import * as balance_1 from './deps/sui/balance.js';
import * as balance_2 from './deps/sui/balance.js';
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
		 * Protocol-owned DUSDC (the materialized terminal-profit cut) excluded from PLP
		 * redemption.
		 */
		protocol_reserve_balance: balance.Balance,
		/** Sponsor-funded DUSDC reserved for taker fee sponsorship, excluded from PLP NAV. */
		fee_incentive_reserve: balance_1.Balance,
		/**
		 * Pooled DEEP staked by all accounts for trading benefits. Per-account
		 * active/inactive amounts are mirrored in Predict account data.
		 */
		staked_deep: balance_2.Balance,
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
/** Return the pool vault object ID. */
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
/** Return DEEP staked by accounts and held in custody by the pool. */
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
/** Return idle DUSDC held by the pool (available for funding and withdrawals). */
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
/** Return protocol-owned DUSDC excluded from PLP redemption. */
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
/** Return sponsor-funded DUSDC available for future fee-incentive allocation. */
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
/** Return the total PLP share supply outstanding. */
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
/** Return the count of pending (un-drained) LP supply requests. */
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
/** Return the count of pending (un-drained) LP withdraw requests. */
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
/** Return the expiry markets still contributing active pool valuation/risk. */
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
/** Return the count of active pre-expiry markets that require live NAV valuation. */
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
/** Return the pricing debit side of the aggregate expiry profit basis. */
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
/** Return the pricing credit side of the aggregate expiry profit basis. */
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
/**
 * Return the materialized protocol cut still awaiting a physical move to the
 * reserve.
 */
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
	lifecycleProof: RawTransactionArgument<string>;
}
export interface StartPoolValuationOptions {
	package?: string;
	arguments:
		| StartPoolValuationArguments
		| [
				config: RawTransactionArgument<string>,
				vault: RawTransactionArgument<string>,
				lifecycleProof: RawTransactionArgument<string>,
		  ];
}
/**
 * Begin a full-pool flush (NAV valuation + LP queue drain) as a market deployer,
 * using a registry-generated `MarketLifecycleProof`. This is the sole flush start:
 * it is cron-driven and PRIVILEGED, not permissionless (audit L8). Engages the
 * protocol valuation lock — so no NAV-changing op can interleave between value
 * steps — and snapshots the active expiry set every `value_expiry` must cover. The
 * hot potato can only be created here, so gating the start gates the whole flush.
 *
 * The flush prices the pool NAV off the live oracle and `finish_flush` drains the
 * LP queues at that mark, and Pyth updates (`pyth_feed::update`) are
 * permissionless — so a flush-capable cap-holder who manipulates the live oracle
 * in a preceding tx, then flushes, could fill their own queued supply/withdraw
 * request at a mark they chose. The start is therefore gated on both current
 * registry allowlisting and trust in every flush-capable holder not to manipulate
 * the live oracle. The revocable `MarketLifecycleCap` (not the root `AdminCap`)
 * carries this authority; admin retains a break-glass route by minting itself a
 * lifecycle cap.
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
	valuation: RawTransactionArgument<string>;
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
				valuation: RawTransactionArgument<string>,
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
 * the running total. The market must be in the snapshot and not already valued
 * (the exactly-once proof). The flush IS the valuation: a settled market is swept
 * (deactivated, cash returned, profit materialized) and contributes 0; a live
 * market is rebalanced to target and valued on its current cash.
 *
 * Before branching, this passively records terminal settlement from Propbook's
 * exact Pyth timestamp if available: a past-expiry market is normally settled here
 * and swept (contributing 0), so `current_nav` is only reached for a still-live
 * market. Only in the bounded pending-settlement window (past expiry but the
 * exact-expiry spot not yet inserted) does the live branch still abort through
 * `current_nav`; there is no solvency-safe substitute mark for an unsettled
 * expired market, and the abort clears once anyone lands the exact spot.
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
	valuation: RawTransactionArgument<string>;
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
				valuation: RawTransactionArgument<string>,
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
 * `supply_budget` / `withdraw_budget` bound how many requests each queue may fill
 * this flush (`None` = drain it fully); the operator sizes them to the gas left
 * after valuing the snapshotted markets. The budgets are independent, so a supply
 * backlog never starves withdrawals.
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
	auth: RawTransactionArgument<string>;
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
				auth: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Stake DEEP for trading benefits. The DEEP is held in the pool vault; the amount
 * is recorded as inactive on the account and activates next epoch
 * (`predict_account::active_stake_mut`, run by trade/claim flows). Callable
 * anytime, any number of times.
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
	auth: RawTransactionArgument<string>;
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
				auth: RawTransactionArgument<string>,
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
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
}
export interface RebalanceExpiryCashOptions {
	package?: string;
	arguments:
		| RebalanceExpiryCashArguments
		| [
				vault: RawTransactionArgument<string>,
				market: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				propbookRegistry: RawTransactionArgument<string>,
				pyth: RawTransactionArgument<string>,
		  ];
}
/**
 * Move cash between pool idle liquidity and one expiry market.
 *
 * Permissionless and standalone: anyone may call it at any cadence. Handles all
 * three per-market cases — initial funding of a freshly registered (unfunded)
 * market, ongoing live rebalance/surplus-sweep toward target, and the
 * settled-market sweep (deactivate, return all free cash, materialize profit).
 * Mint asserts backing but never pulls pool cash, so this is what makes a market
 * mintable. The market must already be registered to this vault
 * (`registry::create_expiry_market`). Blocked while a full-pool valuation is in
 * progress.
 */
export function rebalanceExpiryCash(options: RebalanceExpiryCashOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['vault', 'market', 'config', 'propbookRegistry', 'pyth'];
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
	auth: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
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
				auth: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				propbookRegistry: RawTransactionArgument<string>,
				pyth: RawTransactionArgument<string>,
				root: RawTransactionArgument<string>,
		  ];
}
/** Resolve the caller-owned account's settled trading-loss rebate. */
export function claimTradingLossRebate(options: ClaimTradingLossRebateOptions) {
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
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'vault',
		'market',
		'wrapper',
		'auth',
		'config',
		'propbookRegistry',
		'pyth',
		'root',
	];
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
	propbookRegistry: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
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
				propbookRegistry: RawTransactionArgument<string>,
				pyth: RawTransactionArgument<string>,
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
	const argumentsTypes = [
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
		'vault',
		'market',
		'wrapper',
		'accountRegistry',
		'config',
		'propbookRegistry',
		'pyth',
		'root',
	];
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
 * This keeps `total_supply > 0` for the life of the pool, making the supply==0
 * bootstrap branch unreachable and the residual-idle re-bootstrap brick
 * impossible. Callable only by the operator and only while the pool is pristine
 * (`total_supply == 0`), so it runs exactly once; all supply/withdraw/flush flows
 * abort `ENotBootstrapped` until it has.
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
	auth: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface RequestSupplyOptions {
	package?: string;
	arguments:
		| RequestSupplyArguments
		| [
				vault: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Queue a supply request: pull `amount` DUSDC from account custody into queue
 * escrow, recording the account's receive address as the fill recipient. The pull
 * auto-settles any flush-delivered DUSDC first. The account receives the minted
 * PLP at the next flush. Returns the queue index, the handle used to cancel before
 * the flush.
 */
export function requestSupply(options: RequestSupplyOptions) {
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
			function: 'request_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestWithdrawArguments {
	vault: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	root: RawTransactionArgument<string>;
}
export interface RequestWithdrawOptions {
	package?: string;
	arguments:
		| RequestWithdrawArguments
		| [
				vault: RawTransactionArgument<string>,
				wrapper: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
				root: RawTransactionArgument<string>,
		  ];
}
/**
 * Queue a withdraw request: pull `amount` PLP shares from account custody into
 * queue escrow, recording the account's receive address as the fill recipient. The
 * pull auto-settles any flush-delivered PLP first. Returns the queue index used to
 * cancel before the flush.
 */
export function requestWithdraw(options: RequestWithdrawOptions) {
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
			function: 'request_withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CancelSupplyRequestArguments {
	vault: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
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
				auth: RawTransactionArgument<string>,
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
	auth: RawTransactionArgument<string>;
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
				auth: RawTransactionArgument<string>,
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
