/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Per-chain Bitcoin state, attached to the `Hashi` shared object as a dynamic
 * field keyed by `BitcoinStateKey`. Bundles the deposit queue, withdrawal queue,
 * and UTXO pool behind package-only accessors, and maintains a per-user index of
 * request IDs so clients can discover all deposits and withdrawals belonging to an
 * address.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as deposit_queue from './deposit_queue.js';
import * as withdrawal_queue from './withdrawal_queue.js';
import * as utxo_pool from './utxo_pool.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/hashi::bitcoin_state';
export const BitcoinStateKey = new MoveStruct({
	name: `${$moduleName}::BitcoinStateKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const BitcoinState = new MoveStruct({
	name: `${$moduleName}::BitcoinState`,
	fields: {
		/**
		 * Extension point: dynamic fields can be attached here so new BTC-side state can
		 * be added after the struct layout freezes at mainnet.
		 */
		id: bcs.Address,
		deposit_queue: deposit_queue.DepositRequestQueue,
		withdrawal_queue: withdrawal_queue.WithdrawalRequestQueue,
		utxo_pool: utxo_pool.UtxoPool,
		/**
		 * Per-user index: user address -> Bag of request IDs (deposits and withdrawals).
		 * Allows clients to discover all requests for a given address.
		 */
		user_requests: table.Table,
	},
});
