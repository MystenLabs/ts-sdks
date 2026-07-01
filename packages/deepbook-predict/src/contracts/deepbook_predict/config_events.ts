/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Admin and configuration events for Predict. */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::config_events';
export const TradingPausedUpdated = new MoveStruct({
	name: `${$moduleName}::TradingPausedUpdated`,
	fields: {
		protocol_config_id: bcs.Address,
		paused: bcs.bool(),
	},
});
export const MarketCreated = new MoveStruct({
	name: `${$moduleName}::MarketCreated`,
	fields: {
		expiry_market_id: bcs.Address,
		pool_vault_id: bcs.Address,
		/** Propbook underlying this market resolves current oracle bindings through. */
		propbook_underlying_id: bcs.u32(),
		expiry: bcs.u64(),
		/**
		 * Raw-price-per-tick factor; indexers/SDKs derive raw strikes as
		 * `tick * tick_size`.
		 */
		tick_size: bcs.u64(),
		/** Coarser raw-price step that new finite mint boundaries must align to. */
		admission_tick_size: bcs.u64(),
		/** DUSDC pool allocation cap snapshotted for this expiry. */
		max_expiry_allocation: bcs.u64(),
		/** Minimum DUSDC cash target snapshotted for this expiry. */
		initial_expiry_cash: bcs.u64(),
		liquidation_ltv: bcs.u64(),
		max_admission_leverage: bcs.u64(),
		backing_buffer_lambda: bcs.u64(),
		base_fee: bcs.u64(),
		min_fee: bcs.u64(),
		min_entry_probability: bcs.u64(),
		max_entry_probability: bcs.u64(),
		expiry_fee_window_ms: bcs.u64(),
		expiry_fee_max_multiplier: bcs.u64(),
		trading_loss_rebate_rate: bcs.u64(),
	},
});
export const ExpiryMarketMintPausedUpdated = new MoveStruct({
	name: `${$moduleName}::ExpiryMarketMintPausedUpdated`,
	fields: {
		expiry_market_id: bcs.Address,
		paused: bcs.bool(),
	},
});
export const ReferenceTickSet = new MoveStruct({
	name: `${$moduleName}::ReferenceTickSet`,
	fields: {
		expiry_market_id: bcs.Address,
		propbook_underlying_id: bcs.u32(),
		source_timestamp_ms: bcs.u64(),
		spot: bcs.u64(),
		tick: bcs.u64(),
	},
});
export const MarketSettled = new MoveStruct({
	name: `${$moduleName}::MarketSettled`,
	fields: {
		expiry_market_id: bcs.Address,
		propbook_underlying_id: bcs.u32(),
		expiry: bcs.u64(),
		settlement_price: bcs.u64(),
		/** On-chain landing time of the settlement, `clock.timestamp_ms()`. */
		settled_at_ms: bcs.u64(),
	},
});
