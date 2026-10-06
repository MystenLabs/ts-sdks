/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Governance proposal for ignoring (or re-admitting) a registered committee
 * member. An ignored member is treated as no longer part of the committee: the
 * next committee formation skips them, so their voting weight drops out of total
 * stake and every downstream threshold (certificates, proposal quorums, MPC
 * parameters) re-derives without them.
 *
 * Semantics and limits:
 *
 * - The flag takes effect at the next committee FORMATION (`start_reconfig`). If a
 *   reconfiguration is already in flight when the proposal executes, that is one
 *   epoch later — the pending committee is immutable once formed. The current
 *   epoch's committee is never altered: bitmap indices, MPC party ids, and leader
 *   rotation all stay intact until the boundary.
 * - The proposal targets the validator ADDRESS; it applies to whatever
 *   registration holds that address at execute time, including a re-registration
 *   after a deregistration cycle.
 * - Exclusion is only reachable while governance itself is live: this proposal
 *   needs 6667 bps of the full current denominator, and the epoch transition
 *   enacting it needs the outgoing committee's handoff certificate at the same
 *   threshold (whose denominator still includes the ignored member).
 *   Non-participating weight must therefore stay at or below 3333 bps of the
 *   current committee — the standard BFT bound — for the mechanism to help; beyond
 *   it the system is already stuck.
 * - Ignoring does not touch the registry: the member stays registered, keeps
 *   proposal/vote authorization, and can be re-admitted by executing the same
 *   proposal type with `ignored: false`. If every registered member were ignored,
 *   committee formation would abort and the current committee would simply
 *   continue — recoverable by un-ignoring.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/hashi::ignore_member';
export const IgnoreMember = new MoveStruct({
	name: `${$moduleName}::IgnoreMember`,
	fields: {
		validator_address: bcs.Address,
		ignored: bcs.bool(),
	},
});
export interface ProposeArguments {
	hashi: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
	targetValidatorAddress: RawTransactionArgument<string>;
	ignored: RawTransactionArgument<boolean>;
	metadata: TransactionArgument;
}
export interface ProposeOptions {
	package?: string;
	arguments:
		| ProposeArguments
		| [
				hashi: RawTransactionArgument<string>,
				validatorAddress: RawTransactionArgument<string>,
				targetValidatorAddress: RawTransactionArgument<string>,
				ignored: RawTransactionArgument<boolean>,
				metadata: TransactionArgument,
		  ];
}
export function propose(options: ProposeOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'address', 'bool', null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = [
		'hashi',
		'validatorAddress',
		'targetValidatorAddress',
		'ignored',
		'metadata',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ignore_member',
			function: 'propose',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExecuteArguments {
	hashi: RawTransactionArgument<string>;
	proposalId: RawTransactionArgument<string>;
}
export interface ExecuteOptions {
	package?: string;
	arguments:
		| ExecuteArguments
		| [hashi: RawTransactionArgument<string>, proposalId: RawTransactionArgument<string>];
}
export function execute(options: ExecuteOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x2::object::ID', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ignore_member',
			function: 'execute',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
