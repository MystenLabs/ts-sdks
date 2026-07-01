/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stored expiry-cash policy config.
 *
 * ProtocolConfig owns the current global template. Each ExpiryCash stores a
 * snapshot initialized from that template, so later admin updates do not change
 * active expiry rebate-reserve accounting.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::expiry_cash_config';
export const ExpiryCashConfig = new MoveStruct({
	name: `${$moduleName}::ExpiryCashConfig`,
	fields: {
		/** Fraction of aggregate expiry trading fees reserved for loss rebates. */
		trading_loss_rebate_rate: bcs.u64(),
	},
});
