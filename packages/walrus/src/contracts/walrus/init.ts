// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as _package from './deps/sui/package.js';
export function INIT() {
	return bcs.struct('INIT', {
		dummy_field: bcs.bool(),
	});
}
export function InitCap() {
	return bcs.struct('InitCap', {
		id: object.UID(),
		publisher: _package.Publisher(),
	});
}
export function init(packageAddress: string) {
	/**
	 * Initializes Walrus and shares the system and staking objects.
	 *
	 * This can only be called once, after which the `InitCap` is destroyed.
	 */
	function initialize_walrus(options: {
		arguments: [
			init_cap: RawTransactionArgument<string>,
			upgrade_cap: RawTransactionArgument<string>,
			epoch_zero_duration: RawTransactionArgument<number | bigint>,
			epoch_duration: RawTransactionArgument<number | bigint>,
			n_shards: RawTransactionArgument<number>,
			max_epochs_ahead: RawTransactionArgument<number>,
			clock: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::init::InitCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::package::UpgradeCap',
			'u64',
			'u64',
			'u16',
			'u32',
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'init',
				function: 'initialize_walrus',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Migrates the staking and system objects to the new package ID.
	 *
	 * This must be called in the new package after an upgrade is committed to emit an
	 * event that informs all storage nodes and prevent previous package versions from
	 * being used.
	 */
	function migrate(options: {
		arguments: [staking: RawTransactionArgument<string>, system: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::system::System`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'init',
				function: 'migrate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { initialize_walrus, migrate };
}
