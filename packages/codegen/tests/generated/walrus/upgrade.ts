/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module to manage Walrus contract upgrades.
 *
 * This allows upgrading the contract with a quorum of storage nodes or using an
 * emergency upgrade capability.
 *
 * Requiring a quorum instead of a simple majority guarantees that (i) a majority
 * of honest nodes (by weight) have voted for the upgrade, and (ii) that an upgrade
 * cannot be blocked solely by byzantine nodes.
 */

import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_set from './deps/sui/vec_set.js';
import * as _package from './deps/sui/package.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/walrus::upgrade';
export const PackageDigest = new MoveTuple({
	name: `${$moduleName}::PackageDigest`,
	fields: [bcs.vector(bcs.u8())],
});
export const UpgradeProposal = new MoveStruct({
	name: `${$moduleName}::UpgradeProposal`,
	fields: {
		/**
		 * The epoch in which the proposal was created. The upgrade must be performed in
		 * the same epoch.
		 */
		epoch: bcs.u32(),
		/** The digest of the package to upgrade to. */
		digest: PackageDigest,
		/**
		 * The version of the package to upgrade to. This allows to easily clean up old
		 * proposals.
		 */
		version: bcs.u64(),
		/** The voting weight of the proposal. */
		voting_weight: bcs.u16(),
		/**
		 * The node IDs that have voted for this proposal. Note: the number of nodes in the
		 * committee is capped, so we can use a VecSet.
		 */
		voters: vec_set.VecSet(bcs.Address),
	},
});
export const UpgradeManager = new MoveStruct({
	name: `${$moduleName}::UpgradeManager`,
	fields: {
		id: bcs.Address,
		cap: _package.UpgradeCap,
		upgrade_proposals: table.Table,
	},
});
export const EmergencyUpgradeCap = new MoveStruct({
	name: `${$moduleName}::EmergencyUpgradeCap`,
	fields: {
		id: bcs.Address,
		upgrade_manager_id: bcs.Address,
	},
});
export interface VoteForUpgradeArguments {
	self: RawTransactionArgument<string>;
	staking: RawTransactionArgument<string>;
	auth: RawTransactionArgument<string>;
	nodeId: RawTransactionArgument<string>;
	digest: RawTransactionArgument<number[]>;
}
export interface VoteForUpgradeOptions {
	package?: string;
	arguments:
		| VoteForUpgradeArguments
		| [
				self: RawTransactionArgument<string>,
				staking: RawTransactionArgument<string>,
				auth: RawTransactionArgument<string>,
				nodeId: RawTransactionArgument<string>,
				digest: RawTransactionArgument<number[]>,
		  ];
}
/**
 * Vote for an upgrade given the digest of the package to upgrade to.
 *
 * This will create a new upgrade proposal if none exists for the given digest.
 */
export function voteForUpgrade(options: VoteForUpgradeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::upgrade::UpgradeManager`,
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::auth::Authenticated`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['self', 'staking', 'auth', 'nodeId', 'digest'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'vote_for_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AuthorizeUpgradeArguments {
	self: RawTransactionArgument<string>;
	staking: RawTransactionArgument<string>;
	digest: RawTransactionArgument<number[]>;
}
export interface AuthorizeUpgradeOptions {
	package?: string;
	arguments:
		| AuthorizeUpgradeArguments
		| [
				self: RawTransactionArgument<string>,
				staking: RawTransactionArgument<string>,
				digest: RawTransactionArgument<number[]>,
		  ];
}
/** Authorizes an upgrade that has reached quorum. */
export function authorizeUpgrade(options: AuthorizeUpgradeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::upgrade::UpgradeManager`,
		`${packageAddress}::staking::Staking`,
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['self', 'staking', 'digest'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'authorize_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AuthorizeEmergencyUpgradeArguments {
	upgradeManager: RawTransactionArgument<string>;
	emergencyUpgradeCap: RawTransactionArgument<string>;
	digest: RawTransactionArgument<number[]>;
}
export interface AuthorizeEmergencyUpgradeOptions {
	package?: string;
	arguments:
		| AuthorizeEmergencyUpgradeArguments
		| [
				upgradeManager: RawTransactionArgument<string>,
				emergencyUpgradeCap: RawTransactionArgument<string>,
				digest: RawTransactionArgument<number[]>,
		  ];
}
/**
 * Authorizes an upgrade using the emergency upgrade cap.
 *
 * This should be used sparingly and once walrus has a healthy community and
 * governance, the EmergencyUpgradeCap should be burned.
 */
export function authorizeEmergencyUpgrade(options: AuthorizeEmergencyUpgradeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::upgrade::UpgradeManager`,
		`${packageAddress}::upgrade::EmergencyUpgradeCap`,
		'vector<u8>',
	] satisfies string[];
	const parameterNames = ['upgradeManager', 'emergencyUpgradeCap', 'digest'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'authorize_emergency_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CommitUpgradeArguments {
	upgradeManager: RawTransactionArgument<string>;
	staking: RawTransactionArgument<string>;
	system: RawTransactionArgument<string>;
	receipt: RawTransactionArgument<string>;
}
export interface CommitUpgradeOptions {
	package?: string;
	arguments:
		| CommitUpgradeArguments
		| [
				upgradeManager: RawTransactionArgument<string>,
				staking: RawTransactionArgument<string>,
				system: RawTransactionArgument<string>,
				receipt: RawTransactionArgument<string>,
		  ];
}
/**
 * Commits an upgrade and sets the new package id in the staking and system
 * objects.
 *
 * After committing an upgrade, the staking and system objects should be migrated
 * using the [`package::migrate`] function to emit an event that informs all
 * storage nodes and prevent previous package versions from being used.
 */
export function commitUpgrade(options: CommitUpgradeOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::upgrade::UpgradeManager`,
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::system::System`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::package::UpgradeReceipt',
	] satisfies string[];
	const parameterNames = ['upgradeManager', 'staking', 'system', 'receipt'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'commit_upgrade',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CleanupUpgradeProposalsArguments {
	self: RawTransactionArgument<string>;
	staking: RawTransactionArgument<string>;
	proposals: RawTransactionArgument<number[][]>;
}
export interface CleanupUpgradeProposalsOptions {
	package?: string;
	arguments:
		| CleanupUpgradeProposalsArguments
		| [
				self: RawTransactionArgument<string>,
				staking: RawTransactionArgument<string>,
				proposals: RawTransactionArgument<number[][]>,
		  ];
}
/**
 * Cleans up the upgrade proposals table.
 *
 * Deletes all proposals from past epochs and versions that are lower than the
 * current version.
 */
export function cleanupUpgradeProposals(options: CleanupUpgradeProposalsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::upgrade::UpgradeManager`,
		`${packageAddress}::staking::Staking`,
		'vector<vector<u8>>',
	] satisfies string[];
	const parameterNames = ['self', 'staking', 'proposals'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'cleanup_upgrade_proposals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BurnEmergencyUpgradeCapArguments {
	emergencyUpgradeCap: RawTransactionArgument<string>;
}
export interface BurnEmergencyUpgradeCapOptions {
	package?: string;
	arguments:
		| BurnEmergencyUpgradeCapArguments
		| [emergencyUpgradeCap: RawTransactionArgument<string>];
}
/**
 * Burns the emergency upgrade cap.
 *
 * This will prevent any further upgrades using the `EmergencyUpgradeCap` and will
 * make upgrades fully reliant on quorum-based governance.
 */
export function burnEmergencyUpgradeCap(options: BurnEmergencyUpgradeCapOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::upgrade::EmergencyUpgradeCap`] satisfies string[];
	const parameterNames = ['emergencyUpgradeCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'upgrade',
			function: 'burn_emergency_upgrade_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
