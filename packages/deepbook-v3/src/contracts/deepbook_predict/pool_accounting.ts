/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pool-owned expiry registration and cash-flow accounting.
 *
 * This module owns pool idle USDC custody, the durable set of expiries registered
 * to a pool, the active expiry index used for valuation, USDC sent from the main
 * pool into each expiry, USDC received back from each expiry, snapshotted lifetime
 * fee-incentive caps and allocations, terminal cash watermarks, and per-expiry cap
 * checks. It does not classify expiry-local liabilities or apply PLP reserve
 * policy; PoolVault uses the aggregate profit basis to price PLP and decide
 * protocol reserve transfers.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import * as balance from './deps/sui/balance.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::pool_accounting';
export const ActiveExpiry = new MoveStruct({
	name: `${$moduleName}::ActiveExpiry`,
	fields: {
		expiry_market_id: bcs.Address,
		expiry_ms: U64,
	},
});
export const Ledger = new MoveStruct({
	name: `${$moduleName}::Ledger`,
	fields: {
		/** Idle LP-owned USDC available for withdrawals and expiry funding. */
		idle_balance: balance.Balance,
		/** Expiry markets that still contribute active pool valuation/risk. */
		active_expiry_markets: bcs.vector(ActiveExpiry),
		/**
		 * Permanent per-expiry accounting rows. Presence means the expiry belongs to this
		 * pool.
		 */
		registered_expiries: table.Table,
		/** Pricing debit basis: USDC sent to expiries plus materialized terminal profit. */
		profit_basis_debits: U64,
		/** Pricing credit basis: all USDC received back from expiries. */
		profit_basis_credits: U64,
		/**
		 * Aggregate terminal losses that later terminal profits must recover first; losses
		 * do not claw back profit that was already materialized.
		 */
		net_losses_to_fill: U64,
		/**
		 * Protocol profit already materialized into the debit basis but not yet physically
		 * moved to the reserve because idle was deployed in other active markets at
		 * materialization. Excluded from LP value until drained.
		 */
		pending_protocol_profit: U64,
	},
});
export const RegisteredExpiry = new MoveStruct({
	name: `${$moduleName}::RegisteredExpiry`,
	fields: {
		/** USDC pool allocation cap snapshotted when this expiry was created. */
		max_expiry_allocation: U64,
		/** Minimum USDC cash target snapshotted when this expiry was created. */
		initial_expiry_cash: U64,
		/** USDC sent from the main pool into this expiry. */
		sent_to_expiry: U64,
		/** USDC returned from this expiry to the main pool. */
		received_from_expiry: U64,
		/** Absolute lifetime fee-incentive cap snapshotted when this expiry was registered. */
		fee_incentive_lifetime_cap: U64,
		/** Lifetime sponsor-funded fee incentives allocated to this expiry. */
		fee_incentives_allocated: U64,
		/** True once this expiry has started terminal profit/loss accounting. */
		terminal_accounting_started: bcs.bool(),
		/** Received amount already consumed by terminal accounting. */
		terminal_received_watermark: U64,
	},
});
