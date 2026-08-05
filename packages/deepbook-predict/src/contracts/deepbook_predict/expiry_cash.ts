/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Expiry-local DUSDC custody and unresolved rebate-reserve accounting.
 *
 * This leaf owns cash balance arithmetic and the trading-fee basis used to reserve
 * cash for loss rebates. It does not decide payment eligibility, pool allocation,
 * or market phase sequencing; `ExpiryMarket` decides when each cash operation is
 * allowed and supplies the relevant payout liability.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as balance from './deps/sui/balance.js';
import * as expiry_cash_config from './expiry_cash_config.js';
const $moduleName = '@local-pkg/deepbook_predict::expiry_cash';
export const ExpiryCash = new MoveStruct({
	name: `${$moduleName}::ExpiryCash`,
	fields: {
		cash_balance: balance.Balance,
		unresolved_trading_fees_paid: bcs.u64(),
		config: expiry_cash_config.ExpiryCashConfig,
	},
});
