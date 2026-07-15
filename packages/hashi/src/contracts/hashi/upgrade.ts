/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Package upgrade governance module.
 *
 * ## Upgrade Flow
 *
 * 1.  A committee member calls `upgrade::propose()` with the new package digest
 * 2.  Committee members vote on the `Proposal<Upgrade>` until quorum is reached
 * 3.  `upgrade::execute(Proposal<Upgrade>, &mut Hashi)` -> `UpgradeTicket`
 *     - Authorizes the upgrade using the stored `UpgradeCap`
 * 4.  `sui::package::upgrade(UpgradeTicket, ...)` -> `UpgradeReceipt`
 *     - Performed by the Sui runtime during package publish transaction
 * 5.  `versioning::commit_upgrade(UpgradeReceipt)`
 *     - Commits the upgrade to the `UpgradeCap` and auto-enables the new version
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/hashi::upgrade';
export const Upgrade = new MoveStruct({
	name: `${$moduleName}::Upgrade`,
	fields: {
		digest: bcs.vector(bcs.u8()),
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
	digest: RawTransactionArgument<number[]>;
	metadata: RawTransactionArgument<string>;
}
export interface ProposeOptions {
	package?: string;
	arguments:
		| ProposeArguments
		| [
				hashi: RawTransactionArgument<string>,
				validatorAddress: RawTransactionArgument<string>,
				digest: RawTransactionArgument<number[]>,
				metadata: RawTransactionArgument<string>,
		  ];
}
export function propose(options: ProposeOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, 'address', 'vector<u8>', null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['hashi', 'validatorAddress', 'digest', 'metadata'];
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
 * Executes an approved upgrade proposal.
 *
 * Returns an `UpgradeTicket` that must be used in the same transaction to publish
 * the new package. The Sui runtime will return an `UpgradeReceipt` which must then
 * be passed to `finalize_upgrade()` to finalize the upgrade.
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
	receipt: RawTransactionArgument<string>;
}
export interface FinalizeUpgradeOptions {
	package?: string;
	arguments:
		| FinalizeUpgradeArguments
		| [hashi: RawTransactionArgument<string>, receipt: RawTransactionArgument<string>];
}
export function finalizeUpgrade(options: FinalizeUpgradeOptions) {
	const packageAddress = options.package ?? '@local-pkg/hashi';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['hashi', 'receipt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'finalize_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
