/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Admin and configuration events for Predict. */

import { MoveStruct } from '../utils/index.js';
import { U64 } from '../../bcs/integers.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::config_events';
export const StrikeExposureTemplateConfigUpdated = new MoveStruct({
	name: `${$moduleName}::StrikeExposureTemplateConfigUpdated`,
	fields: {
		backing_buffer_lambda: U64,
		base_fee: U64,
		min_fee: U64,
		min_entry_probability: U64,
		max_entry_probability: U64,
		expiry_fee_window_ms: U64,
		expiry_fee_max_multiplier: U64,
		inventory_impact_max_rate: U64,
		onchain_timestamp_ms: U64,
	},
});
export const PricingConfigUpdated = new MoveStruct({
	name: `${$moduleName}::PricingConfigUpdated`,
	fields: {
		use_pyth_spot_for_forward: bcs.bool(),
		pyth_spot_freshness_ms: U64,
		block_scholes_price_freshness_ms: U64,
		block_scholes_svi_freshness_ms: U64,
		onchain_timestamp_ms: U64,
	},
});
export const EwmaConfigUpdated = new MoveStruct({
	name: `${$moduleName}::EwmaConfigUpdated`,
	fields: {
		alpha: U64,
		z_score_threshold: U64,
		penalty_rate: U64,
		enabled: bcs.bool(),
		onchain_timestamp_ms: U64,
	},
});
export const PlpFeeRatesUpdated = new MoveStruct({
	name: `${$moduleName}::PlpFeeRatesUpdated`,
	fields: {
		plp_supply_fee_rate: U64,
		plp_withdraw_fee_rate: U64,
		onchain_timestamp_ms: U64,
	},
});
export const TradingPausedUpdated = new MoveStruct({
	name: `${$moduleName}::TradingPausedUpdated`,
	fields: {
		protocol_config_id: bcs.Address,
		paused: bcs.bool(),
	},
});
export const ProtocolFrozenUpdated = new MoveStruct({
	name: `${$moduleName}::ProtocolFrozenUpdated`,
	fields: {
		protocol_config_id: bcs.Address,
		frozen: bcs.bool(),
	},
});
export const MarketCreated = new MoveStruct({
	name: `${$moduleName}::MarketCreated`,
	fields: {
		expiry_market_id: bcs.Address,
		pool_vault_id: bcs.Address,
		/** Propbook underlying this market resolves current oracle bindings through. */
		propbook_underlying_id: bcs.u32(),
		expiry: U64,
		/**
		 * Raw-price-per-tick factor; indexers/SDKs derive raw strikes as
		 * `tick * tick_size`.
		 */
		tick_size: U64,
		/** Coarser raw-price step that new finite mint boundaries must align to. */
		admission_tick_size: U64,
		/** USDC pool allocation cap snapshotted for this expiry. */
		max_expiry_allocation: U64,
		/** Minimum USDC cash target snapshotted for this expiry. */
		initial_expiry_cash: U64,
		backing_buffer_lambda: U64,
		base_fee: U64,
		min_fee: U64,
		min_entry_probability: U64,
		max_entry_probability: U64,
		expiry_fee_window_ms: U64,
		expiry_fee_max_multiplier: U64,
		/** Maximum marginal inventory-impact rate snapshotted by this market. */
		inventory_impact_max_rate: U64,
	},
});
export const CadenceConfigUpdated = new MoveStruct({
	name: `${$moduleName}::CadenceConfigUpdated`,
	fields: {
		registry_id: bcs.Address,
		propbook_underlying_id: bcs.u32(),
		cadence_id: bcs.u8(),
		tick_size: U64,
		admission_tick_size: U64,
		max_expiry_allocation: U64,
		initial_expiry_cash: U64,
		window_size: U64,
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
		source_timestamp_ms: U64,
		spot: U64,
		tick: U64,
		onchain_timestamp_ms: U64,
	},
});
export const MarketSettled = new MoveStruct({
	name: `${$moduleName}::MarketSettled`,
	fields: {
		expiry_market_id: bcs.Address,
		propbook_underlying_id: bcs.u32(),
		expiry: U64,
		settlement_price: U64,
		/** `0` = Pyth and `1` = Block Scholes. */
		settlement_source: bcs.u8(),
		/** On-chain landing time of the settlement, `clock.timestamp_ms()`. */
		onchain_timestamp_ms: U64,
	},
});
