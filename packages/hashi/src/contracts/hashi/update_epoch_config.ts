/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Governance proposal for updating entries in the EPOCH config, the store
 * `start_reconfig` copies wholesale onto each new committee. A change lands in the
 * next committee formed after execution and never touches the current epoch's
 * committee, which keeps reading its own pinned copy.
 *
 * Every entry must refer to an existing key with a matching value type and pass
 * `mpc_config::is_valid_value` (the MPC parameters live here), and the store the
 * proposal leaves behind must pass `mpc_config::is_consistent`, so governance can
 * tune parameters but never introduce unknown keys, change an entry's type, or
 * leave the MPC parameters in a state `start_reconfig` would have to repair. The
 * keys the package pins for the deployment's lifetime are refused here as on
 * `update_config`. New keys go through `add_config`.
 *
 * The per-entry checks run at proposal time as well, so a doomed proposal is
 * refused before it can collect votes. They run again at execution because the
 * store can change between the two. The cross-key consistency rule is judged on
 * the store execution leaves behind, so it runs at execution only.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
import * as config_value from './config_value.js';
const $moduleName = '@local-pkg/hashi::update_epoch_config';
export const UpdateEpochConfig = new MoveStruct({
	name: `${$moduleName}::UpdateEpochConfig`,
	fields: {
		entries: vec_map.VecMap(bcs.string(), config_value.Value),
	},
});
export interface ProposeArguments {
	hashi: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
	entries: TransactionArgument;
	metadata: TransactionArgument;
}
export interface ProposeOptions {
	package?: string;
	arguments:
		| ProposeArguments
		| [
				hashi: RawTransactionArgument<string>,
				validatorAddress: RawTransactionArgument<string>,
				entries: TransactionArgument,
				metadata: TransactionArgument,
		  ];
}
/** Private `entry`: see the visibility note in `hashi::proposal`. */
export function propose(options: ProposeOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['hashi', 'validatorAddress', 'entries', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'update_epoch_config',
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
/** Private `entry`: see the visibility note in `hashi::proposal`. */
export function execute(options: ExecuteOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x2::object::ID', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'update_epoch_config',
			function: 'execute',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
