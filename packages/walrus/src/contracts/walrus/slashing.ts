/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module to manage slashing of storage nodes.
 *
 * This allows committee members to vote for slashing a misbehaving node. When a
 * quorum is reached, the slashing can be executed to burn the node's accumulated
 * commission.
 *
 * Proposals are epoch-bound: if the epoch advances, the proposal is refreshed with
 * the new epoch and prior votes are cleared.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as vec_set from './deps/sui/vec_set.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/walrus::slashing';
export const SlashingProposal = new MoveStruct({
	name: `${$moduleName}::SlashingProposal`,
	fields: {
		/**
		 * The epoch in which the proposal was created or last refreshed. The slashing must
		 * be executed in the same epoch.
		 */
		epoch: bcs.u32(),
		/** The node ID of the slashing candidate. */
		node_id: bcs.Address,
		/** The accumulated voting weight of the proposal. */
		voting_weight: bcs.u16(),
		/**
		 * The node IDs that have voted for this proposal. Note: the number of nodes in the
		 * committee is capped, so we can use a VecSet.
		 */
		voters: vec_set.VecSet(bcs.Address),
	},
});
export const SlashingManager = new MoveStruct({
	name: `${$moduleName}::SlashingManager`,
	fields: {
		id: bcs.Address,
		slashing_candidates: table.Table,
	},
});
export interface VoteForSlashingArguments {
	self: RawTransactionArgument<string>;
	staking: RawTransactionArgument<string>;
	auth: TransactionArgument;
	voterNodeId: RawTransactionArgument<string>;
	candidateNodeId: RawTransactionArgument<string>;
}
export interface VoteForSlashingOptions {
	package?: string;
	arguments:
		| VoteForSlashingArguments
		| [
				self: RawTransactionArgument<string>,
				staking: RawTransactionArgument<string>,
				auth: TransactionArgument,
				voterNodeId: RawTransactionArgument<string>,
				candidateNodeId: RawTransactionArgument<string>,
		  ];
}
/**
 * Vote for slashing a node given its node ID.
 *
 * The voter must be authorized via the node's governance_authorization. If a
 * proposal already exists but is from a previous epoch, it is refreshed (votes are
 * cleared and the epoch is updated).
 */
export function voteForSlashing(options: VoteForSlashingOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, null, '0x2::object::ID', '0x2::object::ID'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'staking', 'auth', 'voterNodeId', 'candidateNodeId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'slashing',
			function: 'vote_for_slashing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExecuteSlashingArguments {
	self: RawTransactionArgument<string>;
	staking: RawTransactionArgument<string>;
	treasury: RawTransactionArgument<string>;
	candidateNodeId: RawTransactionArgument<string>;
}
export interface ExecuteSlashingOptions {
	package?: string;
	arguments:
		| ExecuteSlashingArguments
		| [
				self: RawTransactionArgument<string>,
				staking: RawTransactionArgument<string>,
				treasury: RawTransactionArgument<string>,
				candidateNodeId: RawTransactionArgument<string>,
		  ];
}
/**
 * Execute slashing for a node whose proposal has reached quorum.
 *
 * Burns the commission balance of the slashed node's staking pool. The proposal
 * must be from the current epoch and have reached quorum.
 */
export function executeSlashing(options: ExecuteSlashingOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'staking', 'treasury', 'candidateNodeId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'slashing',
			function: 'execute_slashing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CleanupSlashingProposalsArguments {
	self: RawTransactionArgument<string>;
	staking: RawTransactionArgument<string>;
	nodeIds: RawTransactionArgument<Array<string>>;
}
export interface CleanupSlashingProposalsOptions {
	package?: string;
	arguments:
		| CleanupSlashingProposalsArguments
		| [
				self: RawTransactionArgument<string>,
				staking: RawTransactionArgument<string>,
				nodeIds: RawTransactionArgument<Array<string>>,
		  ];
}
/**
 * Remove any slashing proposals whose epoch is in the past.
 *
 * This is a permissionless cleanup function that anyone can call.
 */
export function cleanupSlashingProposals(options: CleanupSlashingProposalsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'vector<0x2::object::ID>'] satisfies (string | null)[];
	const parameterNames = ['self', 'staking', 'nodeIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'slashing',
			function: 'cleanup_slashing_proposals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
