/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * LP request book and share issuance for the pool vault.
 *
 * `LpBook` owns the PLP treasury cap plus the async supply/withdraw queues. `plp`
 * owns the shared `PoolVault`, valuation, and pool cash accounting; it delegates
 * request/cancel and frozen-mark queue drains here.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as table from './deps/sui/table.js';
import * as balance from './deps/sui/balance.js';
import * as coin from './deps/sui/coin.js';
import * as balance_1 from './deps/sui/balance.js';
const $moduleName = '@local-pkg/deepbook_predict::lp_book';
export const RequestQueue = new MoveStruct({
	name: `${$moduleName}::RequestQueue<phantom T>`,
	fields: {
		pages: table.Table,
		head_page_id: bcs.option(bcs.u64()),
		tail_page_id: bcs.option(bcs.u64()),
		next_index: bcs.u64(),
		pending: bcs.u64(),
		escrow: balance.Balance,
	},
});
export const LpBook = new MoveStruct({
	name: `${$moduleName}::LpBook<phantom LP>`,
	fields: {
		treasury_cap: coin.TreasuryCap,
		supply_queue: RequestQueue,
		withdraw_queue: RequestQueue,
		/**
		 * Permanent minimum-liquidity shares minted once at genesis (`plp::lock_capital`).
		 * Held here with no withdraw path, so `total_supply` stays > 0 for the life of the
		 * pool and the supply==0 bootstrap branch is unreachable. Withdrawal-rounding dust
		 * accrues to this position.
		 */
		locked_lp: balance_1.Balance,
	},
});
export const RequestEntry = new MoveStruct({
	name: `${$moduleName}::RequestEntry`,
	fields: {
		index: bcs.u64(),
		/**
		 * Owning account, carried so a fill can attribute to the account directly rather
		 * than only the derived `recipient` address (address is not invertible).
		 */
		account_id: bcs.Address,
		recipient: bcs.Address,
		amount: bcs.u64(),
	},
});
export const RequestPage = new MoveStruct({
	name: `${$moduleName}::RequestPage`,
	fields: {
		prev: bcs.option(bcs.u64()),
		next: bcs.option(bcs.u64()),
		entries: bcs.vector(RequestEntry),
	},
});
