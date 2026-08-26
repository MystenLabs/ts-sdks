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
import { U64 } from '../../bcs/integers.js';
import * as table from './deps/sui/table.js';
import * as balance from './deps/sui/balance.js';
import * as coin from './deps/sui/coin.js';
const $moduleName = '@local-pkg/deepbook_predict::lp_book';
export const RequestQueue = new MoveStruct({
	name: `${$moduleName}::RequestQueue<phantom T>`,
	fields: {
		pages: table.Table,
		head_page_id: bcs.option(U64),
		tail_page_id: bcs.option(U64),
		next_index: U64,
		pending: U64,
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
		locked_lp: balance.Balance,
	},
});
export const RequestEntry = new MoveStruct({
	name: `${$moduleName}::RequestEntry`,
	fields: {
		index: U64,
		/**
		 * Owning account, carried so a fill can attribute to the account directly rather
		 * than only the derived `recipient` address (address is not invertible).
		 */
		account_id: bcs.Address,
		recipient: bcs.Address,
		amount: U64,
		min_output: U64,
		/**
		 * Frozen marks this request has already missed. Only ever non-zero when the
		 * protocol allows more than one attempt (`ProtocolConfig`), since at one attempt a
		 * miss refunds immediately.
		 */
		missed_flushes: U64,
	},
});
export const RequestPage = new MoveStruct({
	name: `${$moduleName}::RequestPage`,
	fields: {
		prev: bcs.option(U64),
		next: bcs.option(U64),
		entries: bcs.vector(RequestEntry),
	},
});
export const FlushMark = new MoveStruct({
	name: `${$moduleName}::FlushMark`,
	fields: {
		pool_value: U64,
		total_supply: U64,
		executable: bcs.bool(),
	},
});
export const FeeRates = new MoveStruct({
	name: `${$moduleName}::FeeRates`,
	fields: {
		/** Supply-leg rate. Ships at zero: a deposit dilutes the pool's risk per dollar. */
		supply: U64,
		/** Withdraw-leg rate, frozen with it so one flush charges one pair. */
		withdraw: U64,
	},
});
export const FillQuote = new MoveStruct({
	name: `${$moduleName}::FillQuote`,
	fields: {
		output: U64,
		fee: U64,
	},
});
export const DrainSummary = new MoveStruct({
	name: `${$moduleName}::DrainSummary`,
	fields: {
		supplies_filled: U64,
		withdrawals_filled: U64,
		requests_processed: U64,
	},
});
