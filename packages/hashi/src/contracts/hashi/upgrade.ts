/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Package-upgrade governance with an atomic version policy.
 *
 * The proposal records whether the new version must be exclusive. The approved
 * choice is carried from `execute` to `finalize_upgrade` in a hot potato, so the
 * transaction sender cannot substitute a different policy while publishing the
 * package.
 *
 * An exclusive upgrade commits the new package and replaces the enabled set with
 * the new version in the same programmable transaction. A non-exclusive upgrade
 * preserves every enabled version and adds the new one.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/hashi::upgrade';
export const Upgrade = new MoveStruct({
	name: `${$moduleName}::Upgrade`,
	fields: {
		digest: bcs.vector(bcs.u8()),
		exclusive: bcs.bool(),
	},
});
export const UpgradeAuthorization = new MoveStruct({
	name: `${$moduleName}::UpgradeAuthorization`,
	fields: {
		exclusive: bcs.bool(),
	},
});
export const PackageUpgraded = new MoveStruct({
	name: `${$moduleName}::PackageUpgraded`,
	fields: {
		package: bcs.Address,
		version: bcs.u64(),
	},
});
export interface ProposeArguments {
	hashi: RawTransactionArgument<string>;
	validatorAddress: RawTransactionArgument<string>;
	digest: RawTransactionArgument<Array<number>>;
	exclusive: RawTransactionArgument<boolean>;
	metadata: TransactionArgument;
}
export interface ProposeOptions {
	package?: string;
	arguments:
		| ProposeArguments
		| [
				hashi: RawTransactionArgument<string>,
				validatorAddress: RawTransactionArgument<string>,
				digest: RawTransactionArgument<Array<number>>,
				exclusive: RawTransactionArgument<boolean>,
				metadata: TransactionArgument,
		  ];
}
/** Private `entry`: see the visibility note in `hashi::proposal`. */
export function propose(options: ProposeOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [
		null,
		'address',
		'vector<u8>',
		'bool',
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['hashi', 'validatorAddress', 'digest', 'exclusive', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
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
/**
 * Execute an approved proposal and bind its version policy to the ticket.
 *
 * Private `entry` like every proposal-type function (see `hashi::proposal`). Its
 * results are consumed by the same PTB's `Upgrade` command and `finalize_upgrade`;
 * while they are live, no other private entry may take `Hashi` in that PTB, which
 * the upgrade PTB never does.
 */
export function execute(options: ExecuteOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, '0x2::object::ID', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['hashi', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'execute',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FinalizeUpgradeArguments {
	hashi: RawTransactionArgument<string>;
	receipt: TransactionArgument;
	authorization: TransactionArgument;
}
export interface FinalizeUpgradeOptions {
	package?: string;
	arguments:
		| FinalizeUpgradeArguments
		| [
				hashi: RawTransactionArgument<string>,
				receipt: TransactionArgument,
				authorization: TransactionArgument,
		  ];
}
/** Commit the package and its approved version policy atomically. */
export function finalizeUpgrade(options: FinalizeUpgradeOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['hashi', 'receipt', 'authorization'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'finalize_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
