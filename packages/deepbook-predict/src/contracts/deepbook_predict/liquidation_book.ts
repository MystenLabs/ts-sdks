/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Priority-sorted liquidation index for active leveraged Predict orders.
 *
 * The active index stores order IDs in ascending order. `Order` encodes its
 * liquidation priority in the high bits, so the front of this index contains the
 * orders that should be checked first. Beyond serving liquidation candidates, the
 * book owns exactly one valuation read: `correction_value` walks its active
 * leveraged set to value the NAV floor-correction term — the only place this
 * module touches pricing/tick/floor math, and it does so through a caller-supplied
 * `Pricer`, never owning the pricing model itself. It does not own payout backing,
 * cash, or account positions. Liquidated tombstones persist until the holder
 * redeems the worthless order and clears their account position.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as table from './deps/sui/table.js';
import * as table_1 from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::liquidation_book';
export const LiquidationBook = new MoveStruct({
	name: `${$moduleName}::LiquidationBook`,
	fields: {
		pages: table.Table,
		/** Page IDs in ascending order-ID order. */
		page_ids: bcs.vector(bcs.u64()),
		/** Maximum order ID stored in each page, aligned with `page_ids`. */
		max_order_ids: bcs.vector(bcs.u256()),
		next_page_id: bcs.u64(),
		active_order_count: bcs.u64(),
		/** Last order ID visited by the passive liquidation scan. */
		passive_watermark: bcs.option(bcs.u256()),
		/** Orders already removed from live exposure indexes but not yet redeemed. */
		liquidated_orders: table_1.Table,
	},
});
export const OrderIdPage = new MoveStruct({
	name: `${$moduleName}::OrderIdPage`,
	fields: {
		order_ids: bcs.vector(bcs.u256()),
	},
});
export const ScanCursor = new MoveStruct({
	name: `${$moduleName}::ScanCursor`,
	fields: {
		page_ix: bcs.u64(),
		offset: bcs.u64(),
	},
});
