// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

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

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as object from './deps/sui/object.js';
import * as _package from './deps/sui/package.js';
import * as table from './deps/sui/table.js';
export function PackageDigest() {
	return bcs.tuple([bcs.vector(bcs.u8())], { name: 'PackageDigest' });
}
export function UpgradeProposal() {
	return bcs.struct('UpgradeProposal', {
		/**
		 * The epoch in which the proposal was created. The upgrade must be performed in
		 * the same epoch.
		 */
		epoch: bcs.u32(),
		/** The digest of the package to upgrade to. */
		digest: PackageDigest(),
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
	});
}
export function UpgradeManager() {
	return bcs.struct('UpgradeManager', {
		id: object.UID(),
		cap: _package.UpgradeCap(),
		upgrade_proposals: table.Table(),
	});
}
export function EmergencyUpgradeCap() {
	return bcs.struct('EmergencyUpgradeCap', {
		id: object.UID(),
		upgrade_manager_id: bcs.Address,
	});
}
export function init(packageAddress: string) {
	/**
	 * Vote for an upgrade given the digest of the package to upgrade to.
	 *
	 * This will create a new upgrade proposal if none exists for the given digest.
	 */
	function vote_for_upgrade(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			staking: RawTransactionArgument<string>,
			auth: RawTransactionArgument<string>,
			node_id: RawTransactionArgument<string>,
			digest: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::upgrade::UpgradeManager`,
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::auth::Authenticated`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'upgrade',
				function: 'vote_for_upgrade',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Authorizes an upgrade that has reached quorum. */
	function authorize_upgrade(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			staking: RawTransactionArgument<string>,
			digest: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::upgrade::UpgradeManager`,
			`${packageAddress}::staking::Staking`,
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'upgrade',
				function: 'authorize_upgrade',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Authorizes an upgrade using the emergency upgrade cap.
	 *
	 * This should be used sparingly and once walrus has a healthy community and
	 * governance, the EmergencyUpgradeCap should be burned.
	 */
	function authorize_emergency_upgrade(options: {
		arguments: [
			upgrade_manager: RawTransactionArgument<string>,
			emergency_upgrade_cap: RawTransactionArgument<string>,
			digest: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::upgrade::UpgradeManager`,
			`${packageAddress}::upgrade::EmergencyUpgradeCap`,
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'upgrade',
				function: 'authorize_emergency_upgrade',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Commits an upgrade and sets the new package id in the staking and system
	 * objects.
	 *
	 * After committing an upgrade, the staking and system objects should be migrated
	 * using the [`package::migrate`] function to emit an event that informs all
	 * storage nodes and prevent previous package versions from being used.
	 */
	function commit_upgrade(options: {
		arguments: [
			upgrade_manager: RawTransactionArgument<string>,
			staking: RawTransactionArgument<string>,
			system: RawTransactionArgument<string>,
			receipt: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::upgrade::UpgradeManager`,
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::system::System`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::package::UpgradeReceipt',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'upgrade',
				function: 'commit_upgrade',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Cleans up the upgrade proposals table.
	 *
	 * Deletes all proposals from past epochs and versions that are lower than the
	 * current version.
	 */
	function cleanup_upgrade_proposals(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			staking: RawTransactionArgument<string>,
			proposals: RawTransactionArgument<number[][]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::upgrade::UpgradeManager`,
			`${packageAddress}::staking::Staking`,
			'vector<vector<u8>>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'upgrade',
				function: 'cleanup_upgrade_proposals',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Burns the emergency upgrade cap.
	 *
	 * This will prevent any further upgrades using the `EmergencyUpgradeCap` and will
	 * make upgrades fully reliant on quorum-based governance.
	 */
	function burn_emergency_upgrade_cap(options: {
		arguments: [emergency_upgrade_cap: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::upgrade::EmergencyUpgradeCap`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'upgrade',
				function: 'burn_emergency_upgrade_cap',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		vote_for_upgrade,
		authorize_upgrade,
		authorize_emergency_upgrade,
		commit_upgrade,
		cleanup_upgrade_proposals,
		burn_emergency_upgrade_cap,
	};
}
