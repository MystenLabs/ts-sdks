/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * User-facing Bitcoin withdrawal flow. A user escrows hBTC against a target
 * Bitcoin address; the committee approves the request, batches one or more
 * requests into a withdrawal transaction (burning the hBTC and locking the input
 * UTXOs), accumulates per-input MPC signatures incrementally, finalizes with the
 * one-shot guardian signatures, and confirms once the transaction lands on
 * Bitcoin. A not-yet-committed request can be cancelled by its requester after a
 * cooldown, refunding the hBTC.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as utxo from './utxo.js';
import * as withdrawal_queue from './withdrawal_queue.js';
const $moduleName = '@local-pkg/hashi::withdraw';
export const RequestApprovalMessage = new MoveStruct({
	name: `${$moduleName}::RequestApprovalMessage`,
	fields: {
		request_id: bcs.Address,
	},
});
export const WithdrawalCommitmentMessage = new MoveStruct({
	name: `${$moduleName}::WithdrawalCommitmentMessage`,
	fields: {
		request_ids: bcs.vector(bcs.Address),
		selected_utxos: bcs.vector(utxo.UtxoId),
		outputs: bcs.vector(withdrawal_queue.OutputUtxo),
		txid: bcs.Address,
	},
});
export const WithdrawalSignedMessage = new MoveStruct({
	name: `${$moduleName}::WithdrawalSignedMessage`,
	fields: {
		withdrawal_id: bcs.Address,
		request_ids: bcs.vector(bcs.Address),
		signatures: bcs.vector(bcs.vector(bcs.u8())),
		guardian_signatures: bcs.vector(bcs.vector(bcs.u8())),
	},
});
export const MpcInputSignaturesMessage = new MoveStruct({
	name: `${$moduleName}::MpcInputSignaturesMessage`,
	fields: {
		withdrawal_id: bcs.Address,
		indices: bcs.vector(bcs.u64()),
		signatures: bcs.vector(bcs.vector(bcs.u8())),
	},
});
export const WithdrawalConfirmationMessage = new MoveStruct({
	name: `${$moduleName}::WithdrawalConfirmationMessage`,
	fields: {
		withdrawal_id: bcs.Address,
	},
});
export interface ApproveRequestArguments {
	hashi: RawTransactionArgument<string>;
	requestId: RawTransactionArgument<string>;
	cert: TransactionArgument;
}
export interface ApproveRequestOptions {
	package?: string;
	arguments:
		| ApproveRequestArguments
		| [
				hashi: RawTransactionArgument<string>,
				requestId: RawTransactionArgument<string>,
				cert: TransactionArgument,
		  ];
}
export function approveRequest(options: ApproveRequestOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'requestId', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'approve_request',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CommitWithdrawalTxArguments {
	hashi: RawTransactionArgument<string>;
	requestIds: RawTransactionArgument<Array<string>>;
	selectedUtxos: TransactionArgument;
	outputs: TransactionArgument;
	txid: RawTransactionArgument<string>;
	cert: TransactionArgument;
}
export interface CommitWithdrawalTxOptions {
	package?: string;
	arguments:
		| CommitWithdrawalTxArguments
		| [
				hashi: RawTransactionArgument<string>,
				requestIds: RawTransactionArgument<Array<string>>,
				selectedUtxos: TransactionArgument,
				outputs: TransactionArgument,
				txid: RawTransactionArgument<string>,
				cert: TransactionArgument,
		  ];
}
export function commitWithdrawalTx(options: CommitWithdrawalTxOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [
		null,
		'vector<address>',
		'vector<null>',
		'vector<null>',
		'address',
		null,
		'0x2::clock::Clock',
		'0x2::random::Random',
	] satisfies (string | null)[];
	const parameterNames = ['hashi', 'requestIds', 'selectedUtxos', 'outputs', 'txid', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'commit_withdrawal_tx',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CommitInputSignaturesArguments {
	hashi: RawTransactionArgument<string>;
	withdrawalId: RawTransactionArgument<string>;
	indices: RawTransactionArgument<Array<number | bigint>>;
	signatures: RawTransactionArgument<Array<Array<number>>>;
	cert: TransactionArgument;
}
export interface CommitInputSignaturesOptions {
	package?: string;
	arguments:
		| CommitInputSignaturesArguments
		| [
				hashi: RawTransactionArgument<string>,
				withdrawalId: RawTransactionArgument<string>,
				indices: RawTransactionArgument<Array<number | bigint>>,
				signatures: RawTransactionArgument<Array<Array<number>>>,
				cert: TransactionArgument,
		  ];
}
/**
 * Record a chunk of completed per-input MPC signatures into the withdrawal's
 * signing batch (out-of-order, first-writer-wins). Cert-gated over exactly the
 * `(withdrawal_id, indices, signatures)` written, by the current committee.
 * Repeated across checkpoints/leaders until every input is signed; the leader may
 * bundle a final chunk + `finalize_withdrawal` in one PTB for small txns.
 */
export function commitInputSignatures(options: CommitInputSignaturesOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u64>', 'vector<vector<u8>>', null] satisfies (
		string | null
	)[];
	const parameterNames = ['hashi', 'withdrawalId', 'indices', 'signatures', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'commit_input_signatures',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FinalizeWithdrawalArguments {
	hashi: RawTransactionArgument<string>;
	withdrawalId: RawTransactionArgument<string>;
	requestIds: RawTransactionArgument<Array<string>>;
	guardianSignatures: RawTransactionArgument<Array<Array<number>>>;
	cert: TransactionArgument;
}
export interface FinalizeWithdrawalOptions {
	package?: string;
	arguments:
		| FinalizeWithdrawalArguments
		| [
				hashi: RawTransactionArgument<string>,
				withdrawalId: RawTransactionArgument<string>,
				requestIds: RawTransactionArgument<Array<string>>,
				guardianSignatures: RawTransactionArgument<Array<Array<number>>>,
				cert: TransactionArgument,
		  ];
}
/**
 * Finalize a withdrawal once all MPC signatures are in: attach the one-shot
 * guardian signatures and flip the broadcast gate. The cert binds the full MPC
 * signature set (read from the batch) together with the guardian signatures, so a
 * malicious leader cannot pair valid MPC sigs with garbage guardian sigs.
 */
export function finalizeWithdrawal(options: FinalizeWithdrawalOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [
		null,
		'address',
		'vector<address>',
		'vector<vector<u8>>',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['hashi', 'withdrawalId', 'requestIds', 'guardianSignatures', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'finalize_withdrawal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ConfirmWithdrawalArguments {
	hashi: RawTransactionArgument<string>;
	withdrawalId: RawTransactionArgument<string>;
	cert: TransactionArgument;
}
export interface ConfirmWithdrawalOptions {
	package?: string;
	arguments:
		| ConfirmWithdrawalArguments
		| [
				hashi: RawTransactionArgument<string>,
				withdrawalId: RawTransactionArgument<string>,
				cert: TransactionArgument,
		  ];
}
export function confirmWithdrawal(options: ConfirmWithdrawalOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'withdrawalId', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'confirm_withdrawal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ArchiveConfirmedWithdrawalsArguments {
	hashi: RawTransactionArgument<string>;
	withdrawalIds: RawTransactionArgument<Array<string>>;
}
export interface ArchiveConfirmedWithdrawalsOptions {
	package?: string;
	arguments:
		| ArchiveConfirmedWithdrawalsArguments
		| [hashi: RawTransactionArgument<string>, withdrawalIds: RawTransactionArgument<Array<string>>];
}
/**
 * Deferred archival for confirmed withdrawals: move each transaction from
 * `withdrawal_txns` to `confirmed_txns` and its requests from `requests` to
 * `processed` (setting status Confirmed). Idempotent per id, so callers may batch
 * and retry freely.
 *
 * Carries no committee cert: every write is derivable from already-certified state
 * (`confirmed_timestamp_ms` is only ever set under a confirmation cert, the
 * request list was bound by the commitment cert, and no funds move) — an
 * adversarial caller can only archive earlier than the operator would, which is a
 * semantic no-op.
 *
 * Garbage collection: deliberately NOT gated on pause/reconfig — it moves no funds
 * and must stay callable during an emergency pause.
 */
export function archiveConfirmedWithdrawals(options: ArchiveConfirmedWithdrawalsOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'vector<address>'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'withdrawalIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'archive_confirmed_withdrawals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ArchiveWithdrawalRequestsArguments {
	hashi: RawTransactionArgument<string>;
	withdrawalId: RawTransactionArgument<string>;
	requestIds: RawTransactionArgument<Array<string>>;
}
export interface ArchiveWithdrawalRequestsOptions {
	package?: string;
	arguments:
		| ArchiveWithdrawalRequestsArguments
		| [
				hashi: RawTransactionArgument<string>,
				withdrawalId: RawTransactionArgument<string>,
				requestIds: RawTransactionArgument<Array<string>>,
		  ];
}
/**
 * Chunked archival for a withdrawal whose request count exceeds one Sui
 * transaction's runtime-object budget: archive the listed requests only, leaving
 * the txn in the hot bag for `finish_archive_withdrawal_txns`. Every listed
 * request is cross-checked against the withdrawal id, so a caller can only archive
 * requests the confirmation cert already covers.
 *
 * Garbage collection: deliberately NOT gated on pause/reconfig — it moves no funds
 * and must stay callable during an emergency pause.
 */
export function archiveWithdrawalRequests(options: ArchiveWithdrawalRequestsOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<address>'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'withdrawalId', 'requestIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'archive_withdrawal_requests',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FinishArchiveWithdrawalTxnsArguments {
	hashi: RawTransactionArgument<string>;
	withdrawalIds: RawTransactionArgument<Array<string>>;
}
export interface FinishArchiveWithdrawalTxnsOptions {
	package?: string;
	arguments:
		| FinishArchiveWithdrawalTxnsArguments
		| [hashi: RawTransactionArgument<string>, withdrawalIds: RawTransactionArgument<Array<string>>];
}
/**
 * Finish chunked archivals: move each listed txn to `confirmed_txns` once all of
 * its requests are archived. Ids whose archival is incomplete (or already
 * finished) are silently skipped, so batches survive races with in-flight chunk
 * transactions.
 *
 * Garbage collection: deliberately NOT gated on pause/reconfig — it moves no funds
 * and must stay callable during an emergency pause.
 */
export function finishArchiveWithdrawalTxns(options: FinishArchiveWithdrawalTxnsOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'vector<address>'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'withdrawalIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'finish_archive_withdrawal_txns',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReallocatePresigsArguments {
	hashi: RawTransactionArgument<string>;
	withdrawalId: RawTransactionArgument<string>;
}
export interface ReallocatePresigsOptions {
	package?: string;
	arguments:
		| ReallocatePresigsArguments
		| [hashi: RawTransactionArgument<string>, withdrawalId: RawTransactionArgument<string>];
}
/**
 * Reassign fresh presignatures to the still-unsigned inputs of a withdrawal whose
 * signing batch is from a previous epoch. Only the pending tail is re-presigned;
 * already-collected signatures are final and epoch-independent.
 *
 * Gated like commit/finalize (version-enabled, unpaused, not-reconfiguring): an
 * in-progress reconfiguration settles first, then this runs afterward to recover
 * the now-stale batch. Carries no committee cert: it authorizes no signatures,
 * only re-points pending presig indices, bounded to once-per-withdrawal-per-epoch
 * by the `mpc_signing` stale-epoch guard.
 */
export function reallocatePresigs(options: ReallocatePresigsOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'withdrawalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'reallocate_presigs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CleanupSpentUtxosArguments {
	hashi: RawTransactionArgument<string>;
	utxoIds: TransactionArgument;
}
export interface CleanupSpentUtxosOptions {
	package?: string;
	arguments:
		| CleanupSpentUtxosArguments
		| [hashi: RawTransactionArgument<string>, utxoIds: TransactionArgument];
}
/**
 * Finalize the on-chain bookkeeping for spent UTXOs. Moves each UTXO's record from
 * `utxo_records` to `spent_utxos`, reading the spent epoch from the record's
 * `spent_epoch` field (set by `mark_spent` during `confirm_withdrawal`). Callers
 * pass the individual UTXO IDs to clean up.
 *
 * Garbage collection: deliberately NOT gated on pause/reconfig — it moves no funds
 * and must stay callable during an emergency pause.
 */
export function cleanupSpentUtxos(options: CleanupSpentUtxosOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'utxoIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'cleanup_spent_utxos',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RequestWithdrawalArguments {
	hashi: RawTransactionArgument<string>;
	btc: TransactionArgument;
	bitcoinAddress: RawTransactionArgument<Array<number>>;
}
export interface RequestWithdrawalOptions {
	package?: string;
	arguments:
		| RequestWithdrawalArguments
		| [
				hashi: RawTransactionArgument<string>,
				btc: TransactionArgument,
				bitcoinAddress: RawTransactionArgument<Array<number>>,
		  ];
}
/**
 * Request a withdrawal of BTC from the bridge.
 *
 * The full BTC amount is stored in the withdrawal request. The miner fee is
 * deducted later at commitment time.
 *
 * The user must provide at least `bitcoin_withdrawal_minimum()` sats, which
 * guarantees the amount covers worst-case miner fees plus dust.
 */
export function requestWithdrawal(options: RequestWithdrawalOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x2::clock::Clock', null, 'vector<u8>'] satisfies (
		string | null
	)[];
	const parameterNames = ['hashi', 'btc', 'bitcoinAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'request_withdrawal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CancelWithdrawalArguments {
	hashi: RawTransactionArgument<string>;
	requestId: RawTransactionArgument<string>;
}
export interface CancelWithdrawalOptions {
	package?: string;
	arguments:
		| CancelWithdrawalArguments
		| [hashi: RawTransactionArgument<string>, requestId: RawTransactionArgument<string>];
}
/**
 * Cancel a pending withdrawal request and return the stored BTC to the requester.
 *
 * Cancellation is allowed while the request is in the `Requested` or `Approved`
 * state (i.e. still in the active requests bag). Once the committee commits the
 * request to a `WithdrawalTransaction` it moves to `Processing` in the processed
 * bag and its BTC is burned — cancellation is no longer possible.
 */
export function cancelWithdrawal(options: CancelWithdrawalOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'requestId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'cancel_withdrawal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
