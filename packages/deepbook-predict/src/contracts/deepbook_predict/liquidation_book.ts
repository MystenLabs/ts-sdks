/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Priority-sorted liquidation index for active leveraged Predict orders.
 *
 * Order IDs sort larger quantities and then larger static floors first because
 * those fields are inverse-encoded. Candidate selection repeatedly checks that
 * head while rotating a smaller scan across the remaining leveraged orders. The
 * same bounded active set supplies the floor-correction term for pool valuation.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64, U256 } from '../../bcs/integers.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::liquidation_book';
export const LiquidationBook = new MoveStruct({
	name: `${$moduleName}::LiquidationBook`,
	fields: {
		pages: table.Table,
		/** Page IDs in ascending order-ID order. */
		page_ids: bcs.vector(U64),
		/** Maximum order ID stored in each page, aligned with `page_ids`. */
		max_order_ids: bcs.vector(U256),
		next_page_id: U64,
		active_order_count: U64,
		/** Last order ID visited by the passive liquidation scan. */
		passive_watermark: bcs.option(U256),
	},
});
export const OrderIdPage = new MoveStruct({
	name: `${$moduleName}::OrderIdPage`,
	fields: {
		order_ids: bcs.vector(U256),
	},
});
export const ScanCursor = new MoveStruct({
	name: `${$moduleName}::ScanCursor`,
	fields: {
		page_ix: U64,
		offset: U64,
	},
});
