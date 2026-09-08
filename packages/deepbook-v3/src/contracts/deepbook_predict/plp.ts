/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * PLP token and pool vault.
 *
 * PoolVault owns the PLP treasury cap, idle USDC, the protocol reserve,
 * sponsor-funded fee incentives, per-expiry cash accounting, and the queued LP
 * supply/withdraw requests. It coordinates the full-pool NAV valuation — an atomic
 * oracle snapshot followed by resumable per-market valuation transactions, with
 * trading live throughout (see `PoolValuation`) — and the unified per-market cash
 * flow (initial funding, live rebalance/sweep, and settled-market sweep with
 * terminal profit materialization). LPs queue supply/withdraw requests routed
 * through a loaded Account; each flush (`finish_flush`) drains the requests that
 * predate its snapshot at the frozen pool NAV, minting/burning PLP and delivering
 * fills to each account via the balance accumulator.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
import * as pricing from './pricing.js';
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
export const PoolValuationProof = new MoveStruct({
	name: `${$moduleName}::PoolValuationProof`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const SnapshotStage = new MoveStruct({
	name: `${$moduleName}::SnapshotStage`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const PoolValuation = new MoveStruct({
	name: `${$moduleName}::PoolValuation`,
	fields: {
		/** Active expiry markets snapshotted at start; every one must be valued. */
		expected_expiry_markets: bcs.vector(bcs.Address),
		/** Markets valued so far this flush; folded against `expected` at finish. */
		valued_expiry_markets: bcs.vector(bcs.Address),
		/** Running Σ of each valued market's snapshot NAV (settled markets contribute 0). */
		total_nav: U64,
		/**
		 * Oracle state frozen during the snapshot stage, one entry per expected market.
		 * Keyed by market id so a `Pricer` can never be applied to the wrong market.
		 * `none` marks a market that was already settled at snapshot time and therefore
		 * contributes 0. This map is what makes the valuation stage deterministic: it
		 * decides both the mark AND the sweep-vs-value branch, so no later transaction's
		 * clock or oracle state can change a market's contribution.
		 */
		frozen_pricers: vec_map.VecMap(bcs.Address, bcs.option(pricing.FrozenPricer)),
		/**
		 * Set by `seal_valuation_snapshot`; no market may be valued before it. Nothing may
		 * be snapshotted after it because sealing consumes the `SnapshotStage`.
		 */
		sealed: bcs.bool(),
		/** Clock time the flush was started, for the stuck-flush deadline. */
		started_at_ms: U64,
		/**
		 * Drain budgets committed at start (the cap owner's choice), bounding how many
		 * requests each queue processes at finish. Committing them here — not at finish —
		 * is what lets `finish_flush` run permissionless: a stranger may complete a flush
		 * but only ever drains at these budgets, so completion can help LPs, never starve
		 * them by finishing with a zero budget.
		 */
		supply_budget: bcs.option(U64),
		withdraw_budget: bcs.option(U64),
		/**
		 * Each LP queue's `next_index` at the snapshot instant: the drain fills only
		 * requests indexed strictly below these, so nobody can watch the frozen mark form
		 * and then submit against a price they already know is stale.
		 */
		supply_request_cutoff: U64,
		withdraw_request_cutoff: U64,
		/**
		 * Vault-side figures captured by `seal_valuation_snapshot`. With every market's
		 * cash frozen in its stamp and these frozen here, the mark is a pure function of
		 * the snapshot instant: no in-window cash move — maintenance, settled sweep,
		 * market funding, reserve realization — can reach it. Settled members are swept
		 * during the snapshot stage, so their recoverable cash sits inside
		 * `frozen_idle_balance`.
		 */
		frozen_idle_balance: U64,
		frozen_profit_basis_credits: U64,
		frozen_profit_basis_debits: U64,
		frozen_pending_protocol_profit: U64,
	},
});
export const PoolVault = new MoveStruct({
	name: `${$moduleName}::PoolVault`,
	fields: {
		id: bcs.Address,
		/**
		 * Protocol-owned USDC excluded from PLP redemption. No package entrypoint
		 * withdraws this balance.
		 */
		protocol_reserve_balance: balance.Balance,
		/** Sponsor-funded USDC reserved for taker fee sponsorship, excluded from PLP NAV. */
		fee_incentive_reserve: balance.Balance,
		/** PLP share issuance plus queued supply/withdraw escrow. */
		lp: lp_book.LpBook,
		/** Idle USDC custody, registered expiries, and per-expiry cash-flow rows. */
		expiry_accounting: pool_accounting.Ledger,
		/**
		 * In-flight full-pool valuation, held across transactions. `Some` exactly while
		 * the `ProtocolConfig` valuation flag is engaged.
		 */
		valuation: bcs.option(PoolValuation),
	},
});
export interface IdArguments {
	vault?: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments?: IdArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return the pool vault object ID for external discovery and PTB construction. */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'id',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface IdleBalanceArguments {
	vault?: RawTransactionArgument<string>;
}
export interface IdleBalanceOptions {
	package?: string;
	arguments?: IdleBalanceArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return idle USDC for SDK and devInspect state reads. */
export function idleBalance(options: IdleBalanceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'idle_balance',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ProtocolReserveBalanceArguments {
	vault?: RawTransactionArgument<string>;
}
export interface ProtocolReserveBalanceOptions {
	package?: string;
	arguments?: ProtocolReserveBalanceArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return protocol-owned USDC for SDK and devInspect state reads. */
export function protocolReserveBalance(options: ProtocolReserveBalanceOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'protocol_reserve_balance',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface FeeIncentiveReserveArguments {
	vault?: RawTransactionArgument<string>;
}
export interface FeeIncentiveReserveOptions {
	package?: string;
	arguments?: FeeIncentiveReserveArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return sponsor-funded fee reserves for SDK and devInspect state reads. */
export function feeIncentiveReserve(options: FeeIncentiveReserveOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'fee_incentive_reserve',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface PlpTotalSupplyArguments {
	vault?: RawTransactionArgument<string>;
}
export interface PlpTotalSupplyOptions {
	package?: string;
	arguments?: PlpTotalSupplyArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return total PLP supply for SDK and devInspect state reads. */
export function plpTotalSupply(options: PlpTotalSupplyOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'plp_total_supply',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SupplyRequestsPendingArguments {
	vault?: RawTransactionArgument<string>;
}
export interface SupplyRequestsPendingOptions {
	package?: string;
	arguments?: SupplyRequestsPendingArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return pending LP supply count for SDK and devInspect queue reads. */
export function supplyRequestsPending(options: SupplyRequestsPendingOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'supply_requests_pending',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface WithdrawRequestsPendingArguments {
	vault?: RawTransactionArgument<string>;
}
export interface WithdrawRequestsPendingOptions {
	package?: string;
	arguments?: WithdrawRequestsPendingArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return pending LP withdrawal count for SDK and devInspect queue reads. */
export function withdrawRequestsPending(options: WithdrawRequestsPendingOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'withdraw_requests_pending',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ActiveExpiryMarketsArguments {
	vault?: RawTransactionArgument<string>;
}
export interface ActiveExpiryMarketsOptions {
	package?: string;
	arguments?: ActiveExpiryMarketsArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return active expiry IDs for external PTB construction and pool inspection. */
export function activeExpiryMarkets(options: ActiveExpiryMarketsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'active_expiry_markets',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ActiveLiveExpiryCountArguments {
	vault?: RawTransactionArgument<string>;
}
export interface ActiveLiveExpiryCountOptions {
	package?: string;
	arguments?: ActiveLiveExpiryCountArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return the pre-expiry active count for SDK and devInspect capacity reads. */
export function activeLiveExpiryCount(options: ActiveLiveExpiryCountOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'active_live_expiry_count',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ProfitBasisDebitsArguments {
	vault?: RawTransactionArgument<string>;
}
export interface ProfitBasisDebitsOptions {
	package?: string;
	arguments?: ProfitBasisDebitsArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return the profit-basis debits for external accounting observability. */
export function profitBasisDebits(options: ProfitBasisDebitsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'profit_basis_debits',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ProfitBasisCreditsArguments {
	vault?: RawTransactionArgument<string>;
}
export interface ProfitBasisCreditsOptions {
	package?: string;
	arguments?: ProfitBasisCreditsArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return the profit-basis credits for external accounting observability. */
export function profitBasisCredits(options: ProfitBasisCreditsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'profit_basis_credits',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface PendingProtocolProfitArguments {
	vault?: RawTransactionArgument<string>;
}
export interface PendingProtocolProfitOptions {
	package?: string;
	arguments?: PendingProtocolProfitArguments;
	config?: {
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return deferred protocol profit for external accounting observability. */
export function pendingProtocolProfit(options: PendingProtocolProfitOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['vault'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'pending_protocol_profit',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface StartPoolValuationArguments {
	config?: RawTransactionArgument<string>;
	vault?: RawTransactionArgument<string>;
	valuationProof: TransactionArgument;
	supplyBudget: RawTransactionArgument<number | bigint | null>;
	withdrawBudget: RawTransactionArgument<number | bigint | null>;
}
export interface StartPoolValuationOptions {
	package?: string;
	arguments: StartPoolValuationArguments;
	config?: {
		protocolConfig: ConfigValue;
		poolVault: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Begin a full-pool valuation using a registry-issued pool-valuation proof. The
 * proof grants control over when current oracle state is frozen for queued LP
 * fills. Starting engages the cross-transaction valuation flag, snapshots the
 * active expiry set and each LP queue's eligibility cutoff, and opens the atomic
 * snapshot stage: freeze every active market's pricer under the returned
 * `SnapshotStage`, then seal it in the same transaction.
 */
export function startPoolValuation(options: StartPoolValuationOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		'0x1::option::Option<u64>',
		'0x1::option::Option<u64>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['config', 'vault', 'valuationProof', 'supplyBudget', 'withdrawBudget'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'start_pool_valuation',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					vault: options.arguments?.vault ?? options.config?.poolVault,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SnapshotExpiryPricerArguments {
	vault?: RawTransactionArgument<string>;
	Stage: TransactionArgument;
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	pyth: RawTransactionArgument<string>;
	bsValues: RawTransactionArgument<string>;
	bsSvi: RawTransactionArgument<string>;
}
export interface SnapshotExpiryPricerOptions {
	package?: string;
	arguments: SnapshotExpiryPricerArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Freeze one snapshotted market's oracle state for this flush and stamp the
 * market, capturing its cash rows and activating its payout-tree snapshot at this
 * instant.
 *
 * Holding `SnapshotStage` is what admits this call, and that potato cannot leave
 * the transaction `start_pool_valuation` minted it in — so every `Pricer` here is
 * loaded at one instant, which is what lets the valuation stage span transactions
 * without mixing marks (audit L10). This stage reads oracles only — it never walks
 * a payout tree — so all markets fit one PTB regardless of book size.
 *
 * The oracle feeding this stage must have been written in an EARLIER transaction:
 * `pricing::resolve_live_pricer` refuses a read stamped with the current
 * transaction digest (RP-24), so a keeper cannot refresh and snapshot in one PTB.
 *
 * A market already settled at snapshot time is recorded with no pricer, gets no
 * stamp (settled flows never touch live NAV), and contributes 0. An
 * expired-but-unsettled market aborts: it has no well-defined mark, and because
 * this stage is atomic the abort reverts the whole snapshot transaction, so the
 * flag is never left engaged. Settle it first, then start the flush; settlement is
 * never blocked by a flush, so that ordering is always available.
 */
export function snapshotExpiryPricer(options: SnapshotExpiryPricerOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
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
		'Stage',
		'market',
		'config',
		'propbookRegistry',
		'pyth',
		'bsValues',
		'bsSvi',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'snapshot_expiry_pricer',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SealValuationSnapshotArguments {
	vault?: RawTransactionArgument<string>;
	stage: TransactionArgument;
	config?: RawTransactionArgument<string>;
}
export interface SealValuationSnapshotOptions {
	package?: string;
	arguments: SealValuationSnapshotArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Close the snapshot stage once every expected market has a frozen pricer, and
 * freeze the vault-side figures — idle, the profit basis, the pending protocol cut
 * — completing the snapshot.
 *
 * Consuming `SnapshotStage` is the simultaneity proof: the potato dies here, so no
 * later transaction can add oracle state to this flush, and every market is marked
 * at the instant the snapshot transaction executed. The vault capture is
 * consistent with the per-market stamps because `rebalance_expiry_cash` refuses to
 * run while the stage is open (`ESnapshotStageOpen`), so no idle↔market move can
 * land between a stamp and this capture. Valuation may then resume across as many
 * transactions as it needs.
 */
export function sealValuationSnapshot(options: SealValuationSnapshotOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['vault', 'stage', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'seal_valuation_snapshot',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ValueExpiryArguments {
	vault?: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
}
export interface ValueExpiryOptions {
	package?: string;
	arguments: ValueExpiryArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Fold one snapshotted market's SNAPSHOT-INSTANT NAV into the running total. A
 * market frozen as settled is swept and contributes 0; one frozen with a pricer is
 * valued via `expiry_market::snapshot_nav` over its captured cash and tree
 * shadows, then has its stamp cleared (releasing the tree snapshot), so later
 * trades and the next flush start clean.
 *
 * The resumable stage: any transaction after the seal, one market per transaction
 * (`constants::max_payout_tree_nodes`), reading no oracle and no clock.
 * MEASUREMENT-ONLY for every member — settled members were swept during the
 * snapshot stage and every frozen figure was captured there, so this call moves no
 * cash and `rebalance_expiry_cash` runs at any time. A market that expired
 * mid-window is valued at its frozen pre-expiry mark; its settlement does not wait
 * for this call, because settlement is never blocked by a flush.
 */
export function valueExpiry(options: ValueExpiryOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['vault', 'market', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'value_expiry',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface FinishFlushArguments {
	vault?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
}
export interface FinishFlushOptions {
	package?: string;
	arguments?: FinishFlushArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Finish a full-pool valuation and run the LP flush: prove every snapshotted
 * market was valued exactly once, price the pool NAV, then drain the
 * supply/withdraw queues at that frozen mark (mint PLP for supplies, burn PLP and
 * pay USDC for withdrawals), release the valuation flag, retire the in-flight
 * valuation, and return the LP-attributable pool-wide USDC NAV (frozen idle + Σ
 * active NAV, net of the pending-protocol-profit exclusion priced from the frozen
 * profit basis — every term as of the snapshot instant). Each drain fills only
 * requests submitted before the flush's snapshot instant (the recorded queue
 * cutoffs); younger requests wait for the next mark.
 *
 * `supply_budget` and `withdraw_budget` bound how many requests each queue may
 * process this flush (`None` = unbounded). Fills — whole or partial — and
 * protocol-refunded heads — non-executable, or quoting below the request's own
 * minimum output — all count as processed. At `ProtocolConfig`'s shipped attempt
 * count of one, a head that misses its limit is refunded by the flush that reaches
 * it; above one it stays queued and stops that queue for the flush. The budgets
 * are independent, so a supply backlog does not consume withdrawal capacity.
 *
 * Capacity bounds each pass on top of the budgets and refunds nothing: supplies
 * fill only up to `ProtocolConfig`'s LP pool-value cap, withdrawals only up to
 * idle. A head larger than the room left fills to the room, spends flush budget,
 * and keeps its remainder queued at a rescaled limit; a head with no usable room
 * carries untouched and spends none. Either way the pass stops, so an unbounded
 * budget does not mean every queued request is processed (RP-23).
 *
 * Because queueing is permissionless and a refunded request returns its escrow in
 * the same transaction, an operator should bound both budgets in production rather
 * than rely on queue length staying small — see RP-12.
 */
export function finishFlush(options: FinishFlushOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['vault', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'finish_flush',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RebalanceExpiryCashArguments {
	vault?: RawTransactionArgument<string>;
	market: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
}
export interface RebalanceExpiryCashOptions {
	package?: string;
	arguments: RebalanceExpiryCashArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
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
 * (`registry::create_and_share_expiry_market`). Runs at any time, including while
 * a flush is in flight — every figure the mark reads was frozen at the snapshot
 * instant, so no move here can reach it. The one refusal is the still-open
 * snapshot stage (start → seal, a single transaction): a cross-move landing
 * between a market's stamp and the seal's vault capture would skew the frozen
 * figures, so it is structurally rejected rather than corrected for.
 */
export function rebalanceExpiryCash(options: RebalanceExpiryCashOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['vault', 'market', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'rebalance_expiry_cash',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SponsorFeeIncentivesArguments {
	vault?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface SponsorFeeIncentivesOptions {
	package?: string;
	arguments: SponsorFeeIncentivesArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Sponsor taker fee incentives with USDC. Anyone may contribute; the payment joins
 * a pool-level reserve that is excluded from PLP NAV and later allocated to expiry
 * markets by the normal rebalance flow.
 */
export function sponsorFeeIncentives(options: SponsorFeeIncentivesOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['vault', 'config', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'sponsor_fee_incentives',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface LockCapitalArguments {
	vault?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface LockCapitalOptions {
	package?: string;
	arguments: LockCapitalArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Bootstrap the pool exactly once: permanently lock `payment` USDC of minimum
 * liquidity. Mints matching PLP (1:1) into the book's locked balance — never
 * withdrawable, so the caller receives no shares — and joins the USDC into idle.
 * This keeps `total_supply > 0` while the vault exists and gives rounding dust a
 * non-withdrawable PLP holder. Requires root authority and zero existing supply.
 * Supply, withdrawal, and flush flows remain disabled until the locked liquidity
 * has been created.
 */
export function lockCapital(options: LockCapitalOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, null] satisfies (string | null)[];
	const parameterNames = ['vault', 'config', 'AdminCap', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'lock_capital',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RequestSupplyArguments {
	vault?: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	minPlpOut: RawTransactionArgument<number | bigint>;
}
export interface RequestSupplyOptions {
	package?: string;
	arguments: RequestSupplyArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Queue a supply request: pull `amount` USDC from account custody into queue
 * escrow, recording the account's receive address as the fill recipient. The pull
 * auto-settles any flush-delivered USDC first. The flush charges the protocol's
 * supply fee — zero by default — on the USDC it takes in and prices shares on the
 * remainder, so `min_plp_out` is measured after that fee. The account receives
 * minted PLP only at a mark that mints at least `min_plp_out` for the whole
 * `amount` — a **price floor**, not a promise of that many shares: if the pool cap
 * leaves room for only part of the deposit, the fill is proportionally smaller at
 * the same price and the remainder stays queued with its limit rescaled. At the
 * shipped attempt count of one, a flush whose mark quotes less cancels and refunds
 * the request there and then; a higher configured count lets it rest and retry
 * that many flushes first. Returns the queue index, the handle used to cancel
 * before the flush.
 */
export function requestSupply(options: RequestSupplyOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'amount', 'minPlpOut'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'request_supply',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RequestWithdrawArguments {
	vault?: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
	minUsdcOut: RawTransactionArgument<number | bigint>;
}
export interface RequestWithdrawOptions {
	package?: string;
	arguments: RequestWithdrawArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Queue a withdraw request: pull `amount` PLP shares from account custody into
 * queue escrow, recording the account's receive address as the fill recipient. The
 * pull auto-settles any flush-delivered PLP first. The flush withholds the
 * protocol's withdraw fee from the marked payout, so `min_usdc_out` is measured
 * after the fee. The account is paid only at a mark that quotes at least
 * `min_usdc_out` for the whole `amount` — a **price floor**, not a promise of that
 * much USDC: if idle liquidity covers only part of the payout, only the shares
 * idle affords are burned, the fill is proportionally smaller at the same price,
 * and the remainder stays queued with its limit rescaled. At the shipped attempt
 * count of one, a flush whose mark quotes less cancels and refunds the request
 * there and then; a higher configured count lets it rest and retry that many
 * flushes first. Returns the queue index used to cancel before the flush.
 */
export function requestWithdraw(options: RequestWithdrawOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'amount', 'minUsdcOut'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'request_withdraw',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CancelSupplyRequestArguments {
	vault?: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	index: RawTransactionArgument<number | bigint>;
}
export interface CancelSupplyRequestOptions {
	package?: string;
	arguments: CancelSupplyRequestArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Cancel a still-pending supply request, refunding its escrowed USDC straight into
 * the requesting account. `account` must be the request's recorded recipient.
 */
export function cancelSupplyRequest(options: CancelSupplyRequestOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'index'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'cancel_supply_request',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CancelWithdrawRequestArguments {
	vault?: RawTransactionArgument<string>;
	wrapper: RawTransactionArgument<string>;
	auth: TransactionArgument;
	config?: RawTransactionArgument<string>;
	index: RawTransactionArgument<number | bigint>;
}
export interface CancelWithdrawRequestOptions {
	package?: string;
	arguments: CancelWithdrawRequestArguments;
	config?: {
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Cancel a still-pending withdraw request, refunding its escrowed PLP straight
 * into the requesting account. `account` must be the request's recorded recipient.
 */
export function cancelWithdrawRequest(options: CancelWithdrawRequestOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		'u64',
		'0x2::accumulator::AccumulatorRoot',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['vault', 'wrapper', 'auth', 'config', 'index'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'plp',
			function: 'cancel_withdraw_request',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					vault: options.arguments?.vault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
