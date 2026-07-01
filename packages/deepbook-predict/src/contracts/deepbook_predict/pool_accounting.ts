/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pool-owned expiry registration and cash-flow accounting.
 *
 * This module owns pool idle DUSDC custody, the durable set of expiries registered
 * to a pool, the active expiry index used for valuation, DUSDC sent from the main
 * pool into each expiry, DUSDC received back from each expiry, lifetime
 * fee-incentive allocations, terminal cash watermarks, and per-expiry cap checks.
 * It does not classify expiry-local liabilities or apply PLP reserve policy;
 * PoolVault uses the aggregate profit basis to price PLP and decide protocol
 * reserve transfers.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as balance from './deps/sui/balance.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::pool_accounting';
export const ActiveExpiry = new MoveStruct({
	name: `${$moduleName}::ActiveExpiry`,
	fields: {
		expiry_market_id: bcs.Address,
		expiry_ms: bcs.u64(),
	},
});
export const Ledger = new MoveStruct({
	name: `${$moduleName}::Ledger`,
	fields: {
		/** Idle LP-owned DUSDC available for withdrawals and expiry funding. */
		idle_balance: balance.Balance,
		/** Expiry markets that still contribute active pool valuation/risk. */
		active_expiry_markets: bcs.vector(ActiveExpiry),
		/**
		 * Permanent per-expiry accounting rows. Presence means the expiry belongs to this
		 * pool.
		 */
		registered_expiries: table.Table,
		/** Pricing debit basis: DUSDC sent to expiries plus materialized terminal profit. */
		profit_basis_debits: bcs.u64(),
		/** Pricing credit basis: all DUSDC received back from expiries. */
		profit_basis_credits: bcs.u64(),
		/** Aggregate terminal losses that future terminal profits must recover first. */
		net_losses_to_fill: bcs.u64(),
		/**
		 * Protocol profit already materialized into the debit basis but not yet physically
		 * moved to the reserve because idle was deployed in other active markets at
		 * materialization. Excluded from LP value until drained.
		 */
		pending_protocol_profit: bcs.u64(),
	},
});
export const RegisteredExpiry = new MoveStruct({
	name: `${$moduleName}::RegisteredExpiry`,
	fields: {
		/** DUSDC pool allocation cap snapshotted when this expiry was created. */
		max_expiry_allocation: bcs.u64(),
		/** Minimum DUSDC cash target snapshotted when this expiry was created. */
		initial_expiry_cash: bcs.u64(),
		/** DUSDC sent from the main pool into this expiry. */
		sent_to_expiry: bcs.u64(),
		/** DUSDC returned from this expiry to the main pool. */
		received_from_expiry: bcs.u64(),
		/** Lifetime sponsor-funded fee incentives allocated to this expiry. */
		fee_incentives_allocated: bcs.u64(),
		/** True once this expiry has started terminal profit/loss accounting. */
		terminal_accounting_started: bcs.bool(),
		/** Received amount already consumed by terminal accounting. */
		terminal_received_watermark: bcs.u64(),
	},
});
