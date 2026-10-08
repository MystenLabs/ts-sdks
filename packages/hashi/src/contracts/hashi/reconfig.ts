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
 *
 * A reconfiguration must complete within the Sui epoch it was formed in:
 * `start_reconfig` pins the pending committee to Sui's epoch, and
 * `submit_committee_handoff` and `end_reconfig` refuse to land once Sui's epoch
 * has moved past it. From then on only `abort_reconfig`, the permissionless escape
 * hatch, can resolve it, and it is refused while the epochs still match.
 * Completion and abort are therefore mutually exclusive by Sui epoch and can never
 * race each other.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
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
export const ReconfigAborted = new MoveStruct({
	name: `${$moduleName}::ReconfigAborted`,
	fields: {
		/** The pending epoch that was torn down; the current epoch is unchanged. */
		epoch: bcs.u64(),
	},
});
export interface StartReconfigArguments {
	self: RawTransactionArgument<string>;
}
export interface StartReconfigOptions {
	package?: string;
	arguments: StartReconfigArguments | [self: RawTransactionArgument<string>];
}
export function startReconfig(options: StartReconfigOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x3::sui_system::SuiSystemState'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'reconfig',
			function: 'start_reconfig',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EndReconfigArguments {
	self: RawTransactionArgument<string>;
	mpcPublicKey: RawTransactionArgument<Array<number>>;
	mpcCert: TransactionArgument;
}
export interface EndReconfigOptions {
	package?: string;
	arguments:
		| EndReconfigArguments
		| [
				self: RawTransactionArgument<string>,
				mpcPublicKey: RawTransactionArgument<Array<number>>,
				mpcCert: TransactionArgument,
		  ];
}
export function endReconfig(options: EndReconfigOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'vector<u8>', null] satisfies (string | null)[];
	const parameterNames = ['self', 'mpcPublicKey', 'mpcCert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'reconfig',
			function: 'end_reconfig',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubmitCommitteeHandoffArguments {
	self: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
	committeeHandoffCert: TransactionArgument;
}
export interface SubmitCommitteeHandoffOptions {
	package?: string;
	arguments:
		| SubmitCommitteeHandoffArguments
		| [
				self: RawTransactionArgument<string>,
				epoch: RawTransactionArgument<number | bigint>,
				committeeHandoffCert: TransactionArgument,
		  ];
}
/**
 * Record the outgoing committee's certificate approving the incoming committee for
 * `epoch`.
 *
 * `epoch` is a declaration, not a safety check. The signed message already binds
 * the target (the incoming committee, epoch included), so a certificate for any
 * other target could never verify here. What the signature cannot do is say why it
 * failed. The certificate's own epoch is the source epoch, and its target is only
 * inside the signed message, which the chain reconstructs rather than receives;
 * without `epoch`, a stale submission for an aborted target and a genuinely bad
 * certificate are the same `committee::ESigVerification` abort, and a stored
 * handoff out of the same source epoch cannot be told apart from this submission's
 * own completion. Declaring the target lets the chain answer with the named
 * `reconfig` constants the node keys its retry/give-up decision on, the same way
 * `abort_reconfig` names the epoch it aborts.
 */
export function submitCommitteeHandoff(options: SubmitCommitteeHandoffOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['self', 'epoch', 'committeeHandoffCert'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'reconfig',
			function: 'submit_committee_handoff',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AbortReconfigArguments {
	self: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<number | bigint>;
}
export interface AbortReconfigOptions {
	package?: string;
	arguments:
		| AbortReconfigArguments
		| [self: RawTransactionArgument<string>, epoch: RawTransactionArgument<number | bigint>];
}
/**
 * Abort a reconfiguration that has overrun its Sui epoch. Callable by anyone, with
 * no vote. The conditions are that a reconfiguration is in flight, that `epoch`
 * names it (so a stale transaction cannot tear down a different one), and that its
 * epoch is no longer Sui's current epoch (see `committee_set::abort_reconfig`).
 * `end_reconfig` is gated on the opposite condition, so an abort can never race a
 * completion.
 *
 * Deliberately not a governance proposal. The committees that could vote on one
 * are exactly the parties a stalled reconfiguration puts in doubt: the pending
 * committee may never finish DKG or key rotation, and a proposal gated on the
 * outgoing committee's quorum can be stranded by the same offline stake that
 * stalled the reconfiguration. Binding the abort to an objective on-chain fact
 * instead keeps the escape hatch usable precisely when it is needed.
 *
 * Not gated on the launch switch: a pending genesis committee can only exist
 * because `start_reconfig` passed that gate, and `versioning` never releases the
 * `UpgradeCap` it checks for, so the gate could not fail here.
 */
export function abortReconfig(options: AbortReconfigOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'epoch'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'reconfig',
			function: 'abort_reconfig',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
