/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stored oracle freshness config for Predict quotes.
 *
 * ProtocolConfig owns this mutable policy. Pricing reads it when resolving live
 * probabilities for mint and redeem flows.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::pricing_config';
export const PricingConfig = new MoveStruct({
	name: `${$moduleName}::PricingConfig`,
	fields: {
		/**
		 * Fixed wall-clock maximum age for Pyth spot; it does not vary with time to
		 * expiry.
		 */
		pyth_spot_freshness_ms: bcs.u64(),
		/**
		 * Fixed wall-clock maximum age for Block Scholes spot and forward; it does not
		 * vary with time to expiry.
		 */
		block_scholes_price_freshness_ms: bcs.u64(),
		/**
		 * Fixed wall-clock maximum age for Block Scholes SVI parameters; it does not vary
		 * with time to expiry.
		 */
		block_scholes_svi_freshness_ms: bcs.u64(),
	},
});
