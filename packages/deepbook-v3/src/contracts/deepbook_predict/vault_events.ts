/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pool-vault events for expiry cash and profit, fee incentives, and the queued LP
 * request lifecycle. A flush records the frozen pool mark used by fills.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
const $moduleName = '@local-pkg/deepbook_predict::vault_events';
export const ExpiryCashReceived = new MoveStruct({
	name: `${$moduleName}::ExpiryCashReceived`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		settlement_price: U64,
		amount: U64,
	},
});
export const ExpiryCashRebalanced = new MoveStruct({
	name: `${$moduleName}::ExpiryCashRebalanced`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		amount: U64,
		to_expiry: bcs.bool(),
		target_cash: U64,
		protocol_profit_realized: U64,
	},
});
export const ExpiryProfitMaterialized = new MoveStruct({
	name: `${$moduleName}::ExpiryProfitMaterialized`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		lp_profit: U64,
		protocol_profit: U64,
		protocol_reserve_balance_after: U64,
		profit_basis_after: U64,
		pending_protocol_profit_after: U64,
	},
});
export const SupplyRequested = new MoveStruct({
	name: `${$moduleName}::SupplyRequested`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: U64,
		amount: U64,
		min_plp_out: U64,
		requests_pending_after: U64,
	},
});
export const WithdrawRequested = new MoveStruct({
	name: `${$moduleName}::WithdrawRequested`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: U64,
		amount: U64,
		min_usdc_out: U64,
		requests_pending_after: U64,
	},
});
export const RequestCancelled = new MoveStruct({
	name: `${$moduleName}::RequestCancelled`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: U64,
		amount: U64,
		is_supply: bcs.bool(),
		/**
		 * 0=user, 1=non-executable frozen mark, 2=quote below the request's minimum
		 * output.
		 */
		reason: bcs.u8(),
		requests_pending_after: U64,
	},
});
export const RequestLimitMissed = new MoveStruct({
	name: `${$moduleName}::RequestLimitMissed`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: U64,
		amount: U64,
		is_supply: bcs.bool(),
		quoted_output: U64,
		min_output: U64,
		missed_flushes: U64,
		max_misses: U64,
	},
});
export const SupplyFilled = new MoveStruct({
	name: `${$moduleName}::SupplyFilled`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: U64,
		/**
		 * USDC actually taken into the pool, which is less than the request's escrow when
		 * the supply cap left only part of it room. Shares were priced on
		 * `usdc_amount - fee_usdc`.
		 */
		usdc_amount: U64,
		shares_minted: U64,
		/** Supply fee withheld from `usdc_amount` and retained by the pool. */
		fee_usdc: U64,
		/**
		 * Escrow still queued at the head after a partial fill; `0` on a full fill, in
		 * which case the request is gone. `usdc_amount + usdc_remaining` is the amount the
		 * request carried into this flush.
		 */
		usdc_remaining: U64,
		requests_pending_after: U64,
	},
});
export const WithdrawFilled = new MoveStruct({
	name: `${$moduleName}::WithdrawFilled`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: U64,
		shares_burned: U64,
		/**
		 * Net USDC delivered to `recipient`. The gross marked value of `shares_burned` was
		 * `usdc_amount + fee_usdc`.
		 */
		usdc_amount: U64,
		/** Withdraw fee withheld from the payout and retained by the pool. */
		fee_usdc: U64,
		/**
		 * Escrowed PLP still queued at the head after a partial fill; `0` on a full fill,
		 * in which case the request is gone. `shares_burned + shares_remaining` is the
		 * amount the request carried into this flush.
		 */
		shares_remaining: U64,
		requests_pending_after: U64,
	},
});
export const FlushExecuted = new MoveStruct({
	name: `${$moduleName}::FlushExecuted`,
	fields: {
		pool_vault_id: bcs.Address,
		epoch: U64,
		/**
		 * LP-attributable pool NAV every fill was priced at: idle plus
		 * `active_market_nav`, excluding unrealized and pending protocol profit.
		 */
		pool_value: U64,
		/** PLP supply in the frozen pre-drain mark used to price every fill. */
		total_supply: U64,
		/**
		 * Supply-leg fee rate in FLOAT_SCALING, frozen with the mark and charged on every
		 * supply fill in this flush.
		 */
		supply_fee_rate: U64,
		/** Withdraw-leg fee rate in FLOAT_SCALING, frozen alongside it. */
		withdraw_fee_rate: U64,
		/**
		 * Sum of the marked NAV contributed by each active market; settled markets add
		 * zero.
		 */
		active_market_nav: U64,
		/** Number of active markets valued for this flush. */
		market_count: U64,
		/**
		 * LIVE idle USDC read at finish time, immediately before the drain — NOT a mark
		 * input. It brackets the drain with `idle_balance_after`; because maintenance,
		 * settlement sweeps, and trading run mid-window, it can differ from
		 * `frozen_idle_balance` below. Drain telemetry, not the mark.
		 */
		idle_balance_before: U64,
		/**
		 * The mark's idle component: idle USDC FROZEN at the seal. `frozen_idle_balance
		 *
		 * - active_market_nav`reconstructs the priced mark's gross; every fill in the  flush is priced from this, never from`idle_balance_before`.
		 */
		frozen_idle_balance: U64,
		supplies_filled: U64,
		withdrawals_filled: U64,
		requests_processed: U64,
		idle_balance_after: U64,
		/** PLP supply after the drain's completed mints and burns. */
		total_supply_after: U64,
		/**
		 * Each queue's `next_index` at this flush's snapshot instant; the drain filled
		 * only requests indexed strictly below these.
		 */
		supply_request_cutoff: U64,
		withdraw_request_cutoff: U64,
		/**
		 * Clock instant the snapshot stage froze every market's pricer — the moment the
		 * mark prices the pool at. Fills execute later in the same flush; this is the
		 * timestamp they were priced as of.
		 */
		snapshot_timestamp_ms: U64,
	},
});
export const FlushRestarted = new MoveStruct({
	name: `${$moduleName}::FlushRestarted`,
	fields: {
		pool_vault_id: bcs.Address,
		expected_market_count: U64,
		valued_market_count: U64,
	},
});
export const CapitalLocked = new MoveStruct({
	name: `${$moduleName}::CapitalLocked`,
	fields: {
		pool_vault_id: bcs.Address,
		amount: U64,
	},
});
export const FeeIncentivesSponsored = new MoveStruct({
	name: `${$moduleName}::FeeIncentivesSponsored`,
	fields: {
		pool_vault_id: bcs.Address,
		sponsor: bcs.Address,
		amount: U64,
		reserve_after: U64,
	},
});
export const FeeIncentivesAllocated = new MoveStruct({
	name: `${$moduleName}::FeeIncentivesAllocated`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		amount: U64,
		pool_reserve_after: U64,
		expiry_incentive_balance_after: U64,
		expiry_incentives_allocated_after: U64,
	},
});
export const FeeIncentivesReturned = new MoveStruct({
	name: `${$moduleName}::FeeIncentivesReturned`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		amount: U64,
		pool_reserve_after: U64,
	},
});
