/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Storage and bookkeeping for Bitcoin deposit requests. Active requests sit in an
 * ObjectBag awaiting committee approval and confirmation; confirmed requests move
 * to a processed bag, and requests that were never confirmed can be deleted once
 * they pass the maximum age. The state transitions themselves (certificate
 * verification, minting, time-delay enforcement) are driven by `hashi::deposit`.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object_bag from './deps/sui/object_bag.js';
import * as utxo from './utxo.js';
import * as committee from './committee.js';
const $moduleName = '@local-pkg/hashi::deposit_queue';
export const DepositRequestQueue = new MoveStruct({
	name: `${$moduleName}::DepositRequestQueue`,
	fields: {
		/**
		 * Active deposits awaiting confirmation. ObjectBag so DepositRequest UIDs are
		 * directly accessible via getObject.
		 */
		requests: object_bag.ObjectBag,
		/** Completed deposits (confirmed or expired). */
		processed: object_bag.ObjectBag,
	},
});
export const DepositRequest = new MoveStruct({
	name: `${$moduleName}::DepositRequest`,
	fields: {
		id: bcs.Address,
		sender: bcs.Address,
		created_timestamp_ms: bcs.u64(),
		sui_tx_digest: bcs.vector(bcs.u8()),
		utxo: utxo.Utxo,
		/**
		 * Committee certificate recorded at approval time. `None` until `approve_deposit`
		 * has been called.
		 */
		approval_cert: bcs.option(committee.CommitteeSignature),
		/**
		 * Clock timestamp at the moment of approval. `None` until `approve_deposit` has
		 * been called.
		 */
		approved_timestamp_ms: bcs.option(bcs.u64()),
		/**
		 * Clock timestamp at the moment of confirmation. `None` until `confirm_deposit`
		 * has been called.
		 */
		confirmed_timestamp_ms: bcs.option(bcs.u64()),
	},
});
