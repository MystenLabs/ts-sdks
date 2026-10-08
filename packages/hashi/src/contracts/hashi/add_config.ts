/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Governance proposal for introducing NEW keys into either config store, which is
 * how a node-side parameter becomes governable without a package upgrade: the Move
 * package never reads the key, the node does.
 *
 * `epoch` selects the store. Keys added to the epoch config are copied onto every
 * committee formed from then on and are read by nodes from the committee's pinned
 * snapshot, so they change only at epoch boundaries; keys added to the instant
 * config are read live from the `Hashi` object.
 *
 * The proposal is insert-only: every entry must name a key absent from the target
 * store, so a typo can never silently create a second copy of an existing
 * parameter (updates go through `update_config` and `update_epoch_config`, which
 * are equally strict the other way). The value fixes the key's type for good,
 * since the update proposals enforce type stability. Entries bound for the epoch
 * config also pass `mpc_config::is_valid_value`, which keeps the reserved MPC keys
 * out.
 *
 * The per-entry checks run at proposal time as well, so a doomed proposal is
 * refused before it can collect votes. They run again at execution because another
 * proposal can introduce the same key in between.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as vec_map from './deps/sui/vec_map.js';
import * as config_value from './config_value.js';
const $moduleName = '@local-pkg/hashi::add_config';
export const AddConfig = new MoveStruct({
	name: `${$moduleName}::AddConfig`,
	fields: {
		/** `true` targets the epoch config, `false` the instant config. */
		epoch: bcs.bool(),
		entries: vec_map.VecMap(bcs.string(), config_value.Value),
	},
});
export interface ProposeArguments {
	hashi: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
	epoch: RawTransactionArgument<boolean>;
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
				epoch: RawTransactionArgument<boolean>,
				entries: TransactionArgument,
				metadata: TransactionArgument,
		  ];
}
/** Private `entry`: see the visibility note in `hashi::proposal`. */
export function propose(options: ProposeOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'bool', null, null, '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['hashi', 'validatorAddress', 'epoch', 'entries', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'add_config',
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
			module: 'add_config',
			function: 'execute',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
