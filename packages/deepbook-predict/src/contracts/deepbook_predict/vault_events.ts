/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pool-vault events for Predict: DEEP staking, expiry cash/profit, fee incentives,
 * and the async LP supply/withdraw request → flush lifecycle (the flush event
 * carries the full-pool valuation it priced fills at).
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::vault_events';
export const ExpiryCashReceived = new MoveStruct({
	name: `${$moduleName}::ExpiryCashReceived`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		settlement_price: bcs.u64(),
		amount: bcs.u64(),
	},
});
export const ExpiryCashRebalanced = new MoveStruct({
	name: `${$moduleName}::ExpiryCashRebalanced`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		amount: bcs.u64(),
		to_expiry: bcs.bool(),
		target_cash: bcs.u64(),
		protocol_profit_realized: bcs.u64(),
	},
});
export const ExpiryProfitMaterialized = new MoveStruct({
	name: `${$moduleName}::ExpiryProfitMaterialized`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		lp_profit: bcs.u64(),
		protocol_profit: bcs.u64(),
		protocol_reserve_balance_after: bcs.u64(),
		profit_basis_after: bcs.u64(),
		pending_protocol_profit_after: bcs.u64(),
	},
});
export const TradingLossRebateClaimed = new MoveStruct({
	name: `${$moduleName}::TradingLossRebateClaimed`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		rebate_amount: bcs.u64(),
		residual_returned: bcs.u64(),
	},
});
export const DeepStaked = new MoveStruct({
	name: `${$moduleName}::DeepStaked`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		amount: bcs.u64(),
		/**
		 * Account active/inactive stake after the deposit. Freshly staked DEEP is inactive
		 * until it rolls active in a later epoch, so both are reported.
		 */
		active_stake_after: bcs.u64(),
		inactive_stake_after: bcs.u64(),
	},
});
export const DeepUnstaked = new MoveStruct({
	name: `${$moduleName}::DeepUnstaked`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		amount: bcs.u64(),
	},
});
export const SupplyRequested = new MoveStruct({
	name: `${$moduleName}::SupplyRequested`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: bcs.u64(),
		amount: bcs.u64(),
	},
});
export const WithdrawRequested = new MoveStruct({
	name: `${$moduleName}::WithdrawRequested`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: bcs.u64(),
		amount: bcs.u64(),
	},
});
export const RequestCancelled = new MoveStruct({
	name: `${$moduleName}::RequestCancelled`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: bcs.u64(),
		amount: bcs.u64(),
		is_supply: bcs.bool(),
	},
});
export const SupplyFilled = new MoveStruct({
	name: `${$moduleName}::SupplyFilled`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: bcs.u64(),
		dusdc_amount: bcs.u64(),
		shares_minted: bcs.u64(),
	},
});
export const WithdrawFilled = new MoveStruct({
	name: `${$moduleName}::WithdrawFilled`,
	fields: {
		pool_vault_id: bcs.Address,
		account_id: bcs.Address,
		recipient: bcs.Address,
		index: bcs.u64(),
		shares_burned: bcs.u64(),
		dusdc_amount: bcs.u64(),
	},
});
export const FlushExecuted = new MoveStruct({
	name: `${$moduleName}::FlushExecuted`,
	fields: {
		pool_vault_id: bcs.Address,
		epoch: bcs.u64(),
		/**
		 * LP-attributable pool NAV every fill was priced at: idle plus
		 * `active_market_nav`, excluding unrealized and pending protocol profit.
		 */
		pool_value: bcs.u64(),
		total_supply: bcs.u64(),
		/** Σ of each active market's exact NAV at valuation (settled markets contribute 0). */
		active_market_nav: bcs.u64(),
		/** Number of active markets valued for this flush. */
		market_count: bcs.u64(),
		/** Idle DUSDC held by the pool at valuation time, before the drain. */
		idle_balance_before: bcs.u64(),
		supplies_filled: bcs.u64(),
		withdrawals_filled: bcs.u64(),
		requests_processed: bcs.u64(),
		idle_balance_after: bcs.u64(),
	},
});
export const CapitalLocked = new MoveStruct({
	name: `${$moduleName}::CapitalLocked`,
	fields: {
		pool_vault_id: bcs.Address,
		amount: bcs.u64(),
	},
});
export const FeeIncentivesSponsored = new MoveStruct({
	name: `${$moduleName}::FeeIncentivesSponsored`,
	fields: {
		pool_vault_id: bcs.Address,
		sponsor: bcs.Address,
		amount: bcs.u64(),
		reserve_after: bcs.u64(),
	},
});
export const FeeIncentivesAllocated = new MoveStruct({
	name: `${$moduleName}::FeeIncentivesAllocated`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		amount: bcs.u64(),
		pool_reserve_after: bcs.u64(),
		expiry_incentive_balance_after: bcs.u64(),
		expiry_incentives_allocated_after: bcs.u64(),
	},
});
export const FeeIncentivesReturned = new MoveStruct({
	name: `${$moduleName}::FeeIncentivesReturned`,
	fields: {
		pool_vault_id: bcs.Address,
		expiry_market_id: bcs.Address,
		amount: bcs.u64(),
		pool_reserve_after: bcs.u64(),
	},
});
