/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** TradeParams module contains the trade parameters for a trading pair. */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@deepbook/core::trade_params';
export const TradeParams = new MoveStruct({
	name: `${$moduleName}::TradeParams`,
	fields: {
		taker_fee: bcs.u64(),
		maker_fee: bcs.u64(),
		stake_required: bcs.u64(),
	},
});
