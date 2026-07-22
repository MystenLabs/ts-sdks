/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Committee reconfiguration entry points. `start_reconfig` forms the next
 * committee from Sui's active validator set (pinning the governed MPC parameters
 * for the new epoch), `submit_committee_handoff` records the outgoing committee's
 * certificate approving the incoming committee, and `end_reconfig` verifies the
 * new committee's certificate over the MPC threshold public key and activates the
 * epoch. The initial (genesis) reconfig skips the handoff — no prior committee
 * exists — and is gated on the publisher's launch switch
 * (`hashi::finish_publish`).
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
import * as committee from './committee.js';
const $moduleName = '@local-pkg/hashi::reconfig';
export const ReconfigCompletionMessage = new MoveStruct({
	name: `${$moduleName}::ReconfigCompletionMessage`,
	fields: {
		/** The epoch of the new committee. */
		epoch: bcs.u64(),
		/** The MPC committee's threshold public key. */
		mpc_public_key: bcs.vector(bcs.u8()),
	},
});
export const CommitteeTransitionRequest = new MoveStruct({
	name: `${$moduleName}::CommitteeTransitionRequest`,
	fields: {
		new_committee: committee.Committee,
	},
});
export const ReconfigStarted = new MoveStruct({
	name: `${$moduleName}::ReconfigStarted`,
	fields: {
		epoch: bcs.u64(),
	},
});
export const ReconfigEnded = new MoveStruct({
	name: `${$moduleName}::ReconfigEnded`,
	fields: {
		from_epoch: bcs.u64(),
		epoch: bcs.u64(),
		/** The MPC committee's threshold public key. */
		mpc_public_key: bcs.vector(bcs.u8()),
	},
});
export interface StartReconfigArguments {
	self?: RawTransactionArgument<string>;
}
export interface StartReconfigOptions {
	package?: string;
	arguments?: StartReconfigArguments | [self?: RawTransactionArgument<string>];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function startReconfig(options: StartReconfigOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'reconfig',
			function: 'start_reconfig',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments ?? {}, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'reconfig',
									functionName: 'start_reconfig',
									parameterIndex: 0,
									parameterName: 'self',
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
export interface EndReconfigArguments {
	self?: RawTransactionArgument<string>;
	mpcPublicKey: RawTransactionArgument<Array<number>>;
	mpcCert: TransactionArgument;
}
export interface EndReconfigOptions {
	package?: string;
	arguments:
		| EndReconfigArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				mpcPublicKey: RawTransactionArgument<Array<number>>,
				mpcCert: TransactionArgument,
		  ];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function endReconfig(options: EndReconfigOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'vector<u8>', null] satisfies (string | null)[];
	const parameterNames = ['self', 'mpcPublicKey', 'mpcCert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'reconfig',
			function: 'end_reconfig',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'reconfig',
									functionName: 'end_reconfig',
									parameterIndex: 0,
									parameterName: 'self',
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
export interface SubmitCommitteeHandoffArguments {
	self?: RawTransactionArgument<string>;
	committeeHandoffCert: TransactionArgument;
}
export interface SubmitCommitteeHandoffOptions {
	package?: string;
	arguments:
		| SubmitCommitteeHandoffArguments
		| [self: RawTransactionArgument<string> | undefined, committeeHandoffCert: TransactionArgument];
	config?: {
		hashiObjectId: ConfigValue;
		packageId?: string;
	};
}
export function submitCommitteeHandoff(options: SubmitCommitteeHandoffOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@local-pkg/hashi';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'committeeHandoffCert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'reconfig',
			function: 'submit_committee_handoff',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.hashiObjectId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'reconfig',
									functionName: 'submit_committee_handoff',
									parameterIndex: 0,
									parameterName: 'self',
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
