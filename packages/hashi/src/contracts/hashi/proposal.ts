/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Generic quorum-voting machinery shared by every governance action. A
 * `Proposal<T>` wraps a typed payload `T` (defined by the proposal-type modules
 * under `types/`) together with the votes it has gathered; committee members vote
 * by weight, and once the proposal's quorum threshold is reached it can be
 * executed exactly once, releasing the payload to the executing module and
 * archiving the proposal. Proposals expire after seven days, after which
 * unexecuted ones may be deleted.
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/hashi::proposal';
export function Proposal<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::Proposal<${typeParameters[0].name as T['name']}>`,
		fields: {
			id: bcs.Address,
			creator: bcs.Address,
			votes: bcs.vector(bcs.Address),
			quorum_threshold_bps: bcs.u64(),
			created_timestamp_ms: bcs.u64(),
			/** Clock timestamp at execution. `None` until the proposal executes. */
			executed_timestamp_ms: bcs.option(bcs.u64()),
			metadata: vec_map.VecMap(bcs.string(), bcs.string()),
			data: typeParameters[0],
		},
	});
}
export const ProposalCreated = new MoveStruct({
	name: `${$moduleName}::ProposalCreated<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
		timestamp_ms: bcs.u64(),
	},
});
export const VoteCast = new MoveStruct({
	name: `${$moduleName}::VoteCast<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
		voter: bcs.Address,
	},
});
export const VoteRemoved = new MoveStruct({
	name: `${$moduleName}::VoteRemoved<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
		voter: bcs.Address,
	},
});
export const ProposalDeleted = new MoveStruct({
	name: `${$moduleName}::ProposalDeleted<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
	},
});
export function ProposalExecuted<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::ProposalExecuted<${typeParameters[0].name as T['name']}>`,
		fields: {
			proposal_id: bcs.Address,
			data: typeParameters[0],
		},
	});
}
export const QuorumReached = new MoveStruct({
	name: `${$moduleName}::QuorumReached<phantom T>`,
	fields: {
		proposal_id: bcs.Address,
	},
});
export interface VoteArguments {
	hashi?: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
	proposalId: RawTransactionArgument<string>;
}
export interface VoteOptions {
	package?: string;
	arguments:
		| VoteArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				validatorAddress: RawTransactionArgument<string>,
				proposalId: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
	typeArguments: [string];
}
export function vote(options: VoteOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', '0x2::object::ID', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['hashi', 'validatorAddress', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'proposal',
			function: 'vote',
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
									moduleName: 'proposal',
									functionName: 'vote',
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
			typeArguments: options.typeArguments,
		});
}
export interface RemoveVoteArguments {
	hashi?: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
	proposalId: RawTransactionArgument<string>;
}
export interface RemoveVoteOptions {
	package?: string;
	arguments:
		| RemoveVoteArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				validatorAddress: RawTransactionArgument<string>,
				proposalId: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
	typeArguments: [string];
}
export function removeVote(options: RemoveVoteOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'validatorAddress', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'proposal',
			function: 'remove_vote',
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
									moduleName: 'proposal',
									functionName: 'remove_vote',
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
			typeArguments: options.typeArguments,
		});
}
export interface DeleteExpiredArguments {
	hashi?: RawTransactionArgument<string>;
	proposalId: RawTransactionArgument<string>;
}
export interface DeleteExpiredOptions {
	package?: string;
	arguments:
		| DeleteExpiredArguments
		| [
				hashi: RawTransactionArgument<string> | undefined,
				proposalId: RawTransactionArgument<string>,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
	typeArguments: [string];
}
export function deleteExpired(options: DeleteExpiredOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x2::object::ID', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'proposal',
			function: 'delete_expired',
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
									moduleName: 'proposal',
									functionName: 'delete_expired',
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
			typeArguments: options.typeArguments,
		});
}
