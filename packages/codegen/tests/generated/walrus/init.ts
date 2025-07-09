/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
import * as _package from './deps/sui/package.js';
const $moduleName = '@local-pkg/walrus::init';
export const INIT = new MoveStruct(`${$moduleName}::INIT`, {
	dummy_field: bcs.bool(),
});
export const InitCap = new MoveStruct(`${$moduleName}::InitCap`, {
	id: object.UID,
	publisher: _package.Publisher,
});
export interface InitializeWalrusArguments {
	initCap: RawTransactionArgument<string>;
	upgradeCap: RawTransactionArgument<string>;
	epochZeroDuration: RawTransactionArgument<number | bigint>;
	epochDuration: RawTransactionArgument<number | bigint>;
	nShards: RawTransactionArgument<number>;
	maxEpochsAhead: RawTransactionArgument<number>;
}
export interface InitializeWalrusOptions {
	package?: string;
	arguments:
		| InitializeWalrusArguments
		| [
				initCap: RawTransactionArgument<string>,
				upgradeCap: RawTransactionArgument<string>,
				epochZeroDuration: RawTransactionArgument<number | bigint>,
				epochDuration: RawTransactionArgument<number | bigint>,
				nShards: RawTransactionArgument<number>,
				maxEpochsAhead: RawTransactionArgument<number>,
		  ];
}
/**
 * Function to initialize walrus and share the system and staking objects. This can
 * only be called once, after which the `InitCap` is destroyed. TODO: decide what
 * to add as system parameters instead of constants.
 */
export function initializeWalrus(options: InitializeWalrusOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::init::InitCap`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::package::UpgradeCap',
		'u64',
		'u64',
		'u16',
		'u32',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = [
		'initCap',
		'upgradeCap',
		'epochZeroDuration',
		'epochDuration',
		'nShards',
		'maxEpochsAhead',
		'clock',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'init',
			function: 'initialize_walrus',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MigrateArguments {
	staking: RawTransactionArgument<string>;
	system: RawTransactionArgument<string>;
}
export interface MigrateOptions {
	package?: string;
	arguments:
		| MigrateArguments
		| [staking: RawTransactionArgument<string>, system: RawTransactionArgument<string>];
}
/**
 * Migrate the staking and system objects to the new package id.
 *
 * This must be called in the new package after an upgrade is committed to emit an
 * event that informs all storage nodes and prevent previous package versions from
 * being used.
 */
export function migrate(options: MigrateOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::staking::Staking`,
		`${packageAddress}::system::System`,
	] satisfies string[];
	const parameterNames = ['staking', 'system'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'init',
			function: 'migrate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
