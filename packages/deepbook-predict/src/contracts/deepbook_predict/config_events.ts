/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Admin and configuration events for Predict. */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
const $moduleName = '@local-pkg/deepbook_predict::config_events';
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
		/** DUSDC pool allocation cap snapshotted for this expiry. */
		max_expiry_allocation: U64,
		/** Minimum DUSDC cash target snapshotted for this expiry. */
		initial_expiry_cash: U64,
		liquidation_ltv: U64,
		max_admission_leverage: U64,
		backing_buffer_lambda: U64,
		base_fee: U64,
		min_fee: U64,
		min_entry_probability: U64,
		max_entry_probability: U64,
		expiry_fee_window_ms: U64,
		expiry_fee_max_multiplier: U64,
		/** Window before expiry within which this market admits no leverage above 1x. */
		no_leverage_window_ms: U64,
		trading_loss_rebate_rate: U64,
		/**
		 * Share of the DEEP-stake benefit curve this market pays out, snapshotted at
		 * creation. `0` means staking earns nothing here, whatever the template later
		 * becomes, so an indexer must read this per market rather than protocol-wide.
		 */
		max_benefit_ratio: U64,
		/** Active stake at this market's benefit-curve kink (half benefits), raw DEEP. */
		lower_benefit_power: U64,
		/** Active stake for this market's full benefits, raw DEEP. */
		upper_benefit_power: U64,
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
		recorded_at_ms: U64,
	},
});
export const MarketSettled = new MoveStruct({
	name: `${$moduleName}::MarketSettled`,
	fields: {
		expiry_market_id: bcs.Address,
		propbook_underlying_id: bcs.u32(),
		expiry: U64,
		settlement_price: U64,
		/** On-chain landing time of the settlement, `clock.timestamp_ms()`. */
		settled_at_ms: U64,
	},
});
