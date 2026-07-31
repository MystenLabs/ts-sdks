/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stored oracle source-selection and freshness config for Predict quotes.
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
		 * Selects which live-forward formula pricing uses. True carries the Block Scholes
		 * basis on a fresh Pyth spot (`pyth_spot * bs_forward / bs_spot`); false uses the
		 * Block Scholes forward directly and no Pyth spot, fresh or not, moves a quote.
		 */
		use_pyth_spot_for_forward: bcs.bool(),
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
