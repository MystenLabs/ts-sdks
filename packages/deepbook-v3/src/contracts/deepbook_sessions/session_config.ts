/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Owns the Sessions package version floor, the DeepBook pools session-key spot
 * trades may use, and the authority that maintains both.
 */

import {
	MoveStruct,
	MoveTuple,
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
export const AllowedPoolsKey = new MoveTuple({
	name: `${$moduleName}::AllowedPoolsKey`,
	fields: [bcs.bool()],
});
export const SessionPoolAllowed = new MoveStruct({
	name: `${$moduleName}::SessionPoolAllowed`,
	fields: {
		pool_id: bcs.Address,
	},
});
export const SessionPoolDisallowed = new MoveStruct({
	name: `${$moduleName}::SessionPoolDisallowed`,
	fields: {
		pool_id: bcs.Address,
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
export interface AllowedPoolsArguments {
	config?: RawTransactionArgument<string>;
}
export interface AllowedPoolsOptions {
	package?: string;
	arguments?: AllowedPoolsArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Return the DeepBook pool IDs session-key spot orders may trade on, in the order
 * they were allowed, for SDK and devInspect reads. Empty until the first
 * `admin_allow_pool`.
 */
export function allowedPools(options: AllowedPoolsOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'session_config',
			function: 'allowed_pools',
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
export interface AdminAllowPoolArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	poolId: RawTransactionArgument<string>;
}
export interface AdminAllowPoolOptions {
	package?: string;
	arguments: AdminAllowPoolArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Let session-key spot orders trade on `pool_id`. Aborts through `vec_set` if the
 * pool is already allowed.
 */
export function adminAllowPool(options: AdminAllowPoolOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'poolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'session_config',
			function: 'admin_allow_pool',
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
export interface AdminDisallowPoolArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	poolId: RawTransactionArgument<string>;
}
export interface AdminDisallowPoolOptions {
	package?: string;
	arguments: AdminDisallowPoolArguments;
	config?: {
		sessionsConfig: ConfigValue;
		sessionsPackageId?: string;
	};
}
/**
 * Stop session-key spot orders on `pool_id`. Aborts `EPoolNotAllowed` if the pool
 * is not allowed, so a mistyped ID cannot pass for a removal. Session cancels and
 * settled withdrawals on the pool keep working.
 */
export function adminDisallowPool(options: AdminDisallowPoolOptions) {
	const packageAddress =
		options.package ?? options.config?.sessionsPackageId ?? '@local-pkg/deepbook_sessions';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['config', 'AdminCap', 'poolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'session_config',
			function: 'admin_disallow_pool',
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
