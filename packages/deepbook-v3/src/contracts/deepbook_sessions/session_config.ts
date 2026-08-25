/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Owns the Sessions package version floor and the authority that advances it. */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_sessions::session_config';
export const SessionsConfig = new MoveStruct({
	name: `${$moduleName}::SessionsConfig`,
	fields: {
		id: bcs.Address,
		version_watermark: U64,
	},
});
export const SessionsAdminCap = new MoveStruct({
	name: `${$moduleName}::SessionsAdminCap`,
	fields: {
		id: bcs.Address,
	},
});
export interface IdArguments {
	config?: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments?: IdArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/** Return the config object ID for external PTB construction. */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'session_config',
			function: 'id',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface VersionWatermarkArguments {
	config?: RawTransactionArgument<string>;
}
export interface VersionWatermarkOptions {
	package?: string;
	arguments?: VersionWatermarkArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/** Return the minimum Sessions package version accepted by gated entrypoints. */
export function versionWatermark(options: VersionWatermarkOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'session_config',
			function: 'version_watermark',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface BumpVersionWatermarkArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface BumpVersionWatermarkOptions {
	package?: string;
	arguments: BumpVersionWatermarkArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Advance the version floor to this package's compiled-in version. This is ungated
 * so an upgraded package can retire older versions, and it cannot accept a
 * caller-selected target.
 */
export function bumpVersionWatermark(options: BumpVersionWatermarkOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'session_config',
			function: 'bump_version_watermark',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.sessionsConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
