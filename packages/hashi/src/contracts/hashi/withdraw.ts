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

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
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
	hashi?: RawTransactionArgument<string>;
	requestId: RawTransactionArgument<string>;
	cert: TransactionArgument;
}
export interface ApproveRequestOptions {
	package?: string;
	arguments:
		| ApproveRequestArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				requestId: RawTransactionArgument<string>,
				cert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function approveRequest(options: ApproveRequestOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'requestId', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'approve_request',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'approve_request',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CommitWithdrawalTxArguments {
	hashi?: RawTransactionArgument<string>;
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
				hashi: RawTransactionArgument<string> | undefined,
				requestIds: RawTransactionArgument<Array<string>>,
				selectedUtxos: TransactionArgument,
				outputs: TransactionArgument,
				txid: RawTransactionArgument<string>,
				cert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function commitWithdrawalTx(options: CommitWithdrawalTxOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
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
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'commit_withdrawal_tx',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CommitInputSignaturesArguments {
	hashi?: RawTransactionArgument<string>;
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
				hashi: RawTransactionArgument<string> | undefined,
				withdrawalId: RawTransactionArgument<string>,
				indices: RawTransactionArgument<Array<number | bigint>>,
				signatures: RawTransactionArgument<Array<Array<number>>>,
				cert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
/**
 * Record a chunk of completed per-input MPC signatures into the withdrawal's
 * signing batch (out-of-order, first-writer-wins). Cert-gated over exactly the
 * `(withdrawal_id, indices, signatures)` written, by the current committee.
 * Repeated across checkpoints/leaders until every input is signed; the leader may
 * bundle a final chunk + `finalize_withdrawal` in one PTB for small txns.
 */
export function commitInputSignatures(options: CommitInputSignaturesOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u64>', 'vector<vector<u8>>', null] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['hashi', 'withdrawalId', 'indices', 'signatures', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'commit_input_signatures',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'commit_input_signatures',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface FinalizeWithdrawalArguments {
	hashi?: RawTransactionArgument<string>;
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
				hashi: RawTransactionArgument<string> | undefined,
				withdrawalId: RawTransactionArgument<string>,
				requestIds: RawTransactionArgument<Array<string>>,
				guardianSignatures: RawTransactionArgument<Array<Array<number>>>,
				cert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
/**
 * Finalize a withdrawal once all MPC signatures are in: attach the one-shot
 * guardian signatures and flip the broadcast gate. The cert binds the full MPC
 * signature set (read from the batch) together with the guardian signatures, so a
 * malicious leader cannot pair valid MPC sigs with garbage guardian sigs.
 */
export function finalizeWithdrawal(options: FinalizeWithdrawalOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
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
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'finalize_withdrawal',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ConfirmWithdrawalArguments {
	hashi?: RawTransactionArgument<string>;
	withdrawalId: RawTransactionArgument<string>;
	cert: TransactionArgument;
}
export interface ConfirmWithdrawalOptions {
	package?: string;
	arguments:
		| ConfirmWithdrawalArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				withdrawalId: RawTransactionArgument<string>,
				cert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function confirmWithdrawal(options: ConfirmWithdrawalOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'withdrawalId', 'cert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'confirm_withdrawal',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'confirm_withdrawal',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ReallocatePresigsArguments {
	hashi?: RawTransactionArgument<string>;
	withdrawalId: RawTransactionArgument<string>;
}
export interface ReallocatePresigsOptions {
	package?: string;
	arguments:
		| ReallocatePresigsArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				withdrawalId: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
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
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'withdrawalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'reallocate_presigs',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'reallocate_presigs',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CleanupSpentUtxosArguments {
	hashi?: RawTransactionArgument<string>;
	utxoIds: TransactionArgument;
}
export interface CleanupSpentUtxosOptions {
	package?: string;
	arguments:
		| CleanupSpentUtxosArguments
		| [hashi: RawTransactionArgument<string> | undefined, utxoIds: TransactionArgument];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
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
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'utxoIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'cleanup_spent_utxos',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'cleanup_spent_utxos',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RequestWithdrawalArguments {
	hashi?: RawTransactionArgument<string>;
	btc: TransactionArgument;
	bitcoinAddress: RawTransactionArgument<Array<number>>;
}
export interface RequestWithdrawalOptions {
	package?: string;
	arguments:
		| RequestWithdrawalArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				btc: TransactionArgument,
				bitcoinAddress: RawTransactionArgument<Array<number>>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
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
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x2::clock::Clock', null, 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['hashi', 'btc', 'bitcoinAddress'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'request_withdrawal',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'request_withdrawal',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CancelWithdrawalArguments {
	hashi?: RawTransactionArgument<string>;
	requestId: RawTransactionArgument<string>;
}
export interface CancelWithdrawalOptions {
	package?: string;
	arguments:
		| CancelWithdrawalArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				requestId: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
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
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'requestId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'withdraw',
			function: 'cancel_withdrawal',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'hashi',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'withdraw',
									functionName: 'cancel_withdrawal',
									parameterIndex: 0,
									parameterName: 'hashi',
								},
								'hashiObjectId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
