/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Storage and state machine for Bitcoin withdrawals. Holds `WithdrawalRequest`
 * objects as they move from Requested through Approved, Processing, Signed, and
 * Confirmed, plus the `WithdrawalTransaction` objects that batch them: each
 * transaction tracks its input UTXOs, withdrawal and change outputs, and the
 * incrementally collected MPC and guardian signatures. Certificate verification
 * and funds movement are driven by `hashi::withdraw`.
 */

import {
	MoveStruct,
	MoveEnum,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as object_bag from './deps/sui/object_bag.js';
import * as object_bag_1 from './deps/sui/object_bag.js';
import * as object_bag_2 from './deps/sui/object_bag.js';
import * as object_bag_3 from './deps/sui/object_bag.js';
import * as committee from './committee.js';
import * as balance from './deps/sui/balance.js';
import * as utxo from './utxo.js';
import * as mpc_signing from './mpc_signing.js';
import * as utxo_1 from './utxo.js';
import * as utxo_2 from './utxo.js';
const $moduleName = '@local-pkg/hashi::withdrawal_queue';
export const WithdrawalRequestQueue = new MoveStruct({
	name: `${$moduleName}::WithdrawalRequestQueue`,
	fields: {
		/**
		 * Active requests awaiting action (Requested, Approved). ObjectBag so
		 * WithdrawalRequest UIDs are directly accessible via getObject.
		 */
		requests: object_bag.ObjectBag,
		/**
		 * Processed requests — BTC consumed, lifecycle continuing or complete (Processing,
		 * Signed, Confirmed).
		 */
		processed: object_bag_1.ObjectBag,
		/**
		 * In-flight withdrawal transactions (unsigned, signed but unconfirmed). ObjectBag
		 * so WithdrawalTransaction UIDs are directly accessible via getObject.
		 */
		withdrawal_txns: object_bag_2.ObjectBag,
		/** Confirmed withdrawal transactions (historical record). */
		confirmed_txns: object_bag_3.ObjectBag,
	},
});
export const OutputUtxo = new MoveStruct({
	name: `${$moduleName}::OutputUtxo`,
	fields: {
		amount: bcs.u64(),
		bitcoin_address: bcs.vector(bcs.u8()),
	},
});
export const WithdrawalStatus = new MoveEnum({
	name: `${$moduleName}::WithdrawalStatus`,
	fields: {
		Requested: null,
		Approved: null,
		Processing: null,
		Signed: null,
		Confirmed: null,
	},
});
export const WithdrawalRequest = new MoveStruct({
	name: `${$moduleName}::WithdrawalRequest`,
	fields: {
		id: bcs.Address,
		sender: bcs.Address,
		btc_amount: bcs.u64(),
		bitcoin_address: bcs.vector(bcs.u8()),
		created_timestamp_ms: bcs.u64(),
		status: WithdrawalStatus,
		/**
		 * Committee certificate recorded at approval time. `None` until `approve_request`
		 * has been called.
		 */
		approval_cert: bcs.option(committee.CommitteeSignature),
		/**
		 * Clock timestamp at the moment of approval. `None` until `approve_request` has
		 * been called.
		 */
		approved_timestamp_ms: bcs.option(bcs.u64()),
		withdrawal_txn_id: bcs.option(bcs.Address),
		sui_tx_digest: bcs.vector(bcs.u8()),
		btc: balance.Balance,
	},
});
export const WithdrawalTransaction = new MoveStruct({
	name: `${$moduleName}::WithdrawalTransaction`,
	fields: {
		id: bcs.Address,
		txid: bcs.Address,
		request_ids: bcs.vector(bcs.Address),
		/**
		 * UTXOs consumed by this withdrawal. The UTXOs remain locked in the pool until
		 * `confirm_withdrawal()` moves them to spent; these copies are kept for event
		 * emission and fee accounting.
		 */
		inputs: bcs.vector(utxo.Utxo),
		withdrawal_outputs: bcs.vector(OutputUtxo),
		/**
		 * Change outputs back to the bridge, in BTC transaction order. These are the
		 * trailing outputs of the transaction: change output `j` sits at vout
		 * `withdrawal_outputs.length() + j`. Empty when the transaction has no change.
		 */
		change_outputs: bcs.vector(OutputUtxo),
		created_timestamp_ms: bcs.u64(),
		/**
		 * Clock timestamp at which the transaction became fully signed (guardian
		 * signatures attached). `None` until `finalize_withdrawal`.
		 */
		signed_timestamp_ms: bcs.option(bcs.u64()),
		/**
		 * Clock timestamp at which the Bitcoin transaction was confirmed. `None` until
		 * `confirm_withdrawal`.
		 */
		confirmed_timestamp_ms: bcs.option(bcs.u64()),
		randomness: bcs.vector(bcs.u8()),
		/**
		 * Per-input MPC committee signatures, accumulated incrementally and out-of-order
		 * across checkpoints/leaders/epochs. Owns the presignature bookkeeping (see
		 * `hashi::mpc_signing`).
		 */
		signing: mpc_signing.SigningBatch,
		/**
		 * Per-input Schnorr signatures from the guardian enclave. Same length as the MPC
		 * signatures; together they form the 2-of-2 taproot witness. Written once at
		 * `finalize_withdrawal` (the guardian signs in one shot).
		 */
		guardian_signatures: bcs.option(bcs.vector(bcs.vector(bcs.u8()))),
	},
});
export const CommittedRequestInfo = new MoveStruct({
	name: `${$moduleName}::CommittedRequestInfo`,
	fields: {
		btc_amount: bcs.u64(),
		bitcoin_address: bcs.vector(bcs.u8()),
	},
});
export const WithdrawalRequested = new MoveStruct({
	name: `${$moduleName}::WithdrawalRequested`,
	fields: {
		request_id: bcs.Address,
		btc_amount: bcs.u64(),
		bitcoin_address: bcs.vector(bcs.u8()),
		timestamp_ms: bcs.u64(),
		requester_address: bcs.Address,
		sui_tx_digest: bcs.vector(bcs.u8()),
	},
});
export const WithdrawalApproved = new MoveStruct({
	name: `${$moduleName}::WithdrawalApproved`,
	fields: {
		request_id: bcs.Address,
	},
});
export const WithdrawalPickedForProcessing = new MoveStruct({
	name: `${$moduleName}::WithdrawalPickedForProcessing`,
	fields: {
		withdrawal_txn_id: bcs.Address,
		txid: bcs.Address,
		request_ids: bcs.vector(bcs.Address),
		inputs: bcs.vector(utxo_1.Utxo),
		withdrawal_outputs: bcs.vector(OutputUtxo),
		change_outputs: bcs.vector(OutputUtxo),
		timestamp_ms: bcs.u64(),
		randomness: bcs.vector(bcs.u8()),
	},
});
export const WithdrawalInputsSigned = new MoveStruct({
	name: `${$moduleName}::WithdrawalInputsSigned`,
	fields: {
		withdrawal_txn_id: bcs.Address,
		signed_count: bcs.u64(),
		num_inputs: bcs.u64(),
	},
});
export const WithdrawalSigned = new MoveStruct({
	name: `${$moduleName}::WithdrawalSigned`,
	fields: {
		withdrawal_txn_id: bcs.Address,
		request_ids: bcs.vector(bcs.Address),
		/** Per-input Schnorr signatures from the MPC committee. */
		signatures: bcs.vector(bcs.vector(bcs.u8())),
		/**
		 * Per-input Schnorr signatures from the guardian enclave. Same length as
		 * `signatures`; the watcher pairs index `i` of both to form the witness for input
		 * `i` at broadcast time.
		 */
		guardian_signatures: bcs.vector(bcs.vector(bcs.u8())),
	},
});
export const WithdrawalPresigsReassigned = new MoveStruct({
	name: `${$moduleName}::WithdrawalPresigsReassigned`,
	fields: {
		withdrawal_txn_id: bcs.Address,
		epoch: bcs.u64(),
		presig_start_index: bcs.u64(),
	},
});
export const WithdrawalConfirmed = new MoveStruct({
	name: `${$moduleName}::WithdrawalConfirmed`,
	fields: {
		withdrawal_txn_id: bcs.Address,
		txid: bcs.Address,
		change_utxo_ids: bcs.vector(utxo_2.UtxoId),
		request_ids: bcs.vector(bcs.Address),
		change_utxo_amounts: bcs.vector(bcs.u64()),
	},
});
export const WithdrawalCancelled = new MoveStruct({
	name: `${$moduleName}::WithdrawalCancelled`,
	fields: {
		request_id: bcs.Address,
		requester_address: bcs.Address,
		btc_amount: bcs.u64(),
	},
});
export interface OutputUtxoArguments {
	amount: RawTransactionArgument<number | bigint>;
	bitcoinAddress: RawTransactionArgument<number[]>;
}
export interface OutputUtxoOptions {
	package?: string;
	arguments:
		| OutputUtxoArguments
		| [
				amount: RawTransactionArgument<number | bigint>,
				bitcoinAddress: RawTransactionArgument<number[]>,
		  ];
}
export function outputUtxo(options: OutputUtxoOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = ['u64', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['amount', 'bitcoinAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdrawal_queue',
			function: 'output_utxo',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
