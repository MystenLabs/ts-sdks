/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Expiry-local DUSDC custody and isolated reserve accounting.
 *
 * This leaf owns cash balance arithmetic and the inventory-impact escrow used only
 * for live-close rebates. It does not decide payment eligibility, pool allocation,
 * or market phase sequencing; `ExpiryMarket` owns those policies.
 */

import { MoveStruct } from '../utils/index.js';
import { U64 } from '../../bcs/integers.js';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/deepbook_predict::expiry_cash';
export const ExpiryCash = new MoveStruct({
	name: `${$moduleName}::ExpiryCash`,
	fields: {
		cash_balance: balance.Balance,
		/** Collected inventory-impact charges still reserved for live-close rebates. */
		inventory_impact_reserve: U64,
	},
});
