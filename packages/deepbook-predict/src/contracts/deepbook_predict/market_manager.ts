/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Market identity and deployment cadence manager for Predict.
 *
 * `Registry` owns this state and delegates market admission to it. Fixed cadence
 * IDs, periods, and rank order are upgrade-required. Underlying rows, cadence
 * deployment terms, and per-underlying watermarks are stored here.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as table from './deps/sui/table.js';
import * as table_1 from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::market_manager';
export const MarketKey = new MoveStruct({
	name: `${$moduleName}::MarketKey`,
	fields: {
		propbook_underlying_id: bcs.u32(),
		expiry: bcs.u64(),
	},
});
export const MarketManager = new MoveStruct({
	name: `${$moduleName}::MarketManager`,
	fields: {
		/** Propbook underlying ID -> deployment watermarks. */
		underlying_configs: table.Table,
		/** Created markets keyed by `(propbook_underlying_id, expiry)`. */
		market_ids: table_1.Table,
	},
});
export const CadenceConfig = new MoveStruct({
	name: `${$moduleName}::CadenceConfig`,
	fields: {
		/** Raw-price-per-tick factor snapshotted into each created market. */
		tick_size: bcs.u64(),
		/** Coarser raw-price step that new finite mint boundaries must align to. */
		admission_tick_size: bcs.u64(),
		/**
		 * DUSDC pool allocation cap snapshotted into pool accounting for each created
		 * expiry.
		 */
		max_expiry_allocation: bcs.u64(),
		/**
		 * Minimum DUSDC cash target snapshotted into pool accounting for each created
		 * expiry.
		 */
		initial_expiry_cash: bcs.u64(),
		/**
		 * Number of future cadence slots that deployment may keep filled. Zero disables
		 * this cadence; enabled cadences are capped by an upgrade-required bound.
		 */
		window_size: bcs.u64(),
	},
});
export const DeployableMarket = new MoveStruct({
	name: `${$moduleName}::DeployableMarket`,
	fields: {
		expiry: bcs.u64(),
		cadence: CadenceConfig,
	},
});
export const UnderlyingMarketConfig = new MoveStruct({
	name: `${$moduleName}::UnderlyingMarketConfig`,
	fields: {
		/** Deployment config indexed by cadence ID. */
		cadences: bcs.vector(CadenceConfig),
		/** Highest deployed expiry timestamp indexed by cadence ID. */
		last_deployed_expiries: bcs.vector(bcs.u64()),
	},
});
