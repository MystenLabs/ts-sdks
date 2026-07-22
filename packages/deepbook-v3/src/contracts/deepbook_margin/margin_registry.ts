/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Registry holds all margin pools. */

import {
	MoveStruct,
	MoveTuple,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as versioned from './deps/sui/versioned.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as table from './deps/sui/table.js';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@deepbook/margin::margin_registry';
export const MARGIN_REGISTRY = new MoveStruct({
	name: `${$moduleName}::MARGIN_REGISTRY`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const MarginRegistry = new MoveStruct({
	name: `${$moduleName}::MarginRegistry`,
	fields: {
		id: bcs.Address,
		inner: versioned.Versioned,
	},
});
export const MarginRegistryInner = new MoveStruct({
	name: `${$moduleName}::MarginRegistryInner`,
	fields: {
		registry_id: bcs.Address,
		allowed_versions: vec_set.VecSet(bcs.u64()),
		pool_registry: table.Table,
		margin_pools: table.Table,
		margin_managers: table.Table,
		allowed_maintainers: vec_set.VecSet(bcs.Address),
		allowed_pause_caps: vec_set.VecSet(bcs.Address),
	},
});
export const RiskRatios = new MoveStruct({
	name: `${$moduleName}::RiskRatios`,
	fields: {
		min_withdraw_risk_ratio: bcs.u64(),
		min_borrow_risk_ratio: bcs.u64(),
		liquidation_risk_ratio: bcs.u64(),
		target_liquidation_risk_ratio: bcs.u64(),
	},
});
export const PoolConfig = new MoveStruct({
	name: `${$moduleName}::PoolConfig`,
	fields: {
		base_margin_pool_id: bcs.Address,
		quote_margin_pool_id: bcs.Address,
		risk_ratios: RiskRatios,
		user_liquidation_reward: bcs.u64(),
		pool_liquidation_reward: bcs.u64(),
		enabled: bcs.bool(),
		extra_fields: vec_map.VecMap(bcs.string(), bcs.u64()),
	},
});
export const ConfigKey = new MoveStruct({
	name: `${$moduleName}::ConfigKey<phantom Config>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const CurrentPriceKey = new MoveStruct({
	name: `${$moduleName}::CurrentPriceKey`,
	fields: {
		pool_id: bcs.Address,
	},
});
export const CurrentPriceData = new MoveStruct({
	name: `${$moduleName}::CurrentPriceData`,
	fields: {
		price: bcs.u64(),
		last_price_update_ms: bcs.u64(),
		tolerance: bcs.u64(),
		max_price_age_ms: bcs.u64(),
	},
});
export const MaxOrderTtlKey = new MoveTuple({
	name: `${$moduleName}::MaxOrderTtlKey`,
	fields: [bcs.Address],
});
export const MinOpenRiskRatioKey = new MoveTuple({
	name: `${$moduleName}::MinOpenRiskRatioKey`,
	fields: [bcs.Address],
});
export const MarginAdminCap = new MoveStruct({
	name: `${$moduleName}::MarginAdminCap`,
	fields: {
		id: bcs.Address,
	},
});
export const MarginPauseCap = new MoveStruct({
	name: `${$moduleName}::MarginPauseCap`,
	fields: {
		id: bcs.Address,
	},
});
export const MaintainerCap = new MoveStruct({
	name: `${$moduleName}::MaintainerCap`,
	fields: {
		id: bcs.Address,
	},
});
export const MarginPoolCap = new MoveStruct({
	name: `${$moduleName}::MarginPoolCap`,
	fields: {
		id: bcs.Address,
		margin_pool_id: bcs.Address,
	},
});
export const MaintainerCapUpdated = new MoveStruct({
	name: `${$moduleName}::MaintainerCapUpdated`,
	fields: {
		maintainer_cap_id: bcs.Address,
		allowed: bcs.bool(),
		timestamp: bcs.u64(),
	},
});
export const PauseCapUpdated = new MoveStruct({
	name: `${$moduleName}::PauseCapUpdated`,
	fields: {
		pause_cap_id: bcs.Address,
		allowed: bcs.bool(),
		timestamp: bcs.u64(),
	},
});
export const DeepbookPoolRegistered = new MoveStruct({
	name: `${$moduleName}::DeepbookPoolRegistered`,
	fields: {
		pool_id: bcs.Address,
		config: PoolConfig,
		timestamp: bcs.u64(),
	},
});
export const DeepbookPoolUpdated = new MoveStruct({
	name: `${$moduleName}::DeepbookPoolUpdated`,
	fields: {
		pool_id: bcs.Address,
		enabled: bcs.bool(),
		timestamp: bcs.u64(),
	},
});
export const DeepbookPoolConfigUpdated = new MoveStruct({
	name: `${$moduleName}::DeepbookPoolConfigUpdated`,
	fields: {
		pool_id: bcs.Address,
		config: PoolConfig,
		timestamp: bcs.u64(),
	},
});
export const CurrentPriceUpdated = new MoveStruct({
	name: `${$moduleName}::CurrentPriceUpdated`,
	fields: {
		pool_id: bcs.Address,
		price: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const PriceToleranceUpdated = new MoveStruct({
	name: `${$moduleName}::PriceToleranceUpdated`,
	fields: {
		pool_id: bcs.Address,
		tolerance: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const MaxPriceAgeUpdated = new MoveStruct({
	name: `${$moduleName}::MaxPriceAgeUpdated`,
	fields: {
		pool_id: bcs.Address,
		max_age_ms: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const MaxOrderTtlUpdated = new MoveStruct({
	name: `${$moduleName}::MaxOrderTtlUpdated`,
	fields: {
		pool_id: bcs.Address,
		max_order_ttl_ms: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const MinOpenRiskRatioUpdated = new MoveStruct({
	name: `${$moduleName}::MinOpenRiskRatioUpdated`,
	fields: {
		pool_id: bcs.Address,
		min_open_risk_ratio: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export interface MintMaintainerCapArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface MintMaintainerCapOptions {
	package?: string;
	arguments:
		| MintMaintainerCapArguments
		| [self: RawTransactionArgument<string>, AdminCap: RawTransactionArgument<string>];
}
/**
 * Mint a `MaintainerCap`, only admin can mint a `MaintainerCap`. This function
 * does not have version restrictions
 */
export function mintMaintainerCap(options: MintMaintainerCapOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'mint_maintainer_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RevokeMaintainerCapArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	maintainerCapId: RawTransactionArgument<string>;
}
export interface RevokeMaintainerCapOptions {
	package?: string;
	arguments:
		| RevokeMaintainerCapArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				maintainerCapId: RawTransactionArgument<string>,
		  ];
}
/**
 * Revoke a `MaintainerCap`. Only the admin can revoke a `MaintainerCap`. This
 * function does not have version restrictions
 */
export function revokeMaintainerCap(options: RevokeMaintainerCapOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, '0x2::object::ID', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'AdminCap', 'maintainerCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'revoke_maintainer_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RegisterDeepbookPoolArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	poolConfig: TransactionArgument;
}
export interface RegisterDeepbookPoolOptions {
	package?: string;
	arguments:
		| RegisterDeepbookPoolArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				poolConfig: TransactionArgument,
		  ];
	typeArguments: [string, string];
}
/** Register a margin pool for margin trading with existing margin pools */
export function registerDeepbookPool(options: RegisterDeepbookPoolOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'pool', 'poolConfig'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'register_deepbook_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface EnableDeepbookPoolArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface EnableDeepbookPoolOptions {
	package?: string;
	arguments:
		| EnableDeepbookPoolArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Enables a deepbook pool for margin trading. */
export function enableDeepbookPool(options: EnableDeepbookPoolOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'enable_deepbook_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DisableDeepbookPoolArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface DisableDeepbookPoolOptions {
	package?: string;
	arguments:
		| DisableDeepbookPoolArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Disables a deepbook pool from margin trading. Only reduce only orders, cancels,
 * and withdraw settled amounts are allowed.
 */
export function disableDeepbookPool(options: DisableDeepbookPoolOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'disable_deepbook_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateRiskParamsArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	poolConfig: TransactionArgument;
}
export interface UpdateRiskParamsOptions {
	package?: string;
	arguments:
		| UpdateRiskParamsArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				poolConfig: TransactionArgument,
		  ];
	typeArguments: [string, string];
}
/** Updates risk params for a deepbook pool as the admin. */
export function updateRiskParams(options: UpdateRiskParamsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'pool', 'poolConfig'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'update_risk_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddConfigArguments<Config extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	config: RawTransactionArgument<Config>;
}
export interface AddConfigOptions<Config extends BcsType<any>> {
	package?: string;
	arguments:
		| AddConfigArguments<Config>
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				config: RawTransactionArgument<Config>,
		  ];
	typeArguments: [string];
}
/** Add Pyth Config to the MarginRegistry. */
export function addConfig<Config extends BcsType<any>>(options: AddConfigOptions<Config>) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'add_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveConfigArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface RemoveConfigOptions {
	package?: string;
	arguments:
		| RemoveConfigArguments
		| [self: RawTransactionArgument<string>, AdminCap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Remove Pyth Config from the MarginRegistry. */
export function removeConfig(options: RemoveConfigOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'remove_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface EnableVersionArguments {
	self: RawTransactionArgument<string>;
	version: RawTransactionArgument<number | bigint>;
	AdminCap: RawTransactionArgument<string>;
}
export interface EnableVersionOptions {
	package?: string;
	arguments:
		| EnableVersionArguments
		| [
				self: RawTransactionArgument<string>,
				version: RawTransactionArgument<number | bigint>,
				AdminCap: RawTransactionArgument<string>,
		  ];
}
/**
 * Enables a package version Only Admin can enable a package version This function
 * does not have version restrictions
 */
export function enableVersion(options: EnableVersionOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['self', 'version', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'enable_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DisableVersionArguments {
	self: RawTransactionArgument<string>;
	version: RawTransactionArgument<number | bigint>;
	AdminCap: RawTransactionArgument<string>;
}
export interface DisableVersionOptions {
	package?: string;
	arguments:
		| DisableVersionArguments
		| [
				self: RawTransactionArgument<string>,
				version: RawTransactionArgument<number | bigint>,
				AdminCap: RawTransactionArgument<string>,
		  ];
}
/**
 * Disables a package version Only Admin can disable a package version This
 * function does not have version restrictions
 */
export function disableVersion(options: DisableVersionOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['self', 'version', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'disable_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DisableVersionPauseCapArguments {
	self: RawTransactionArgument<string>;
	version: RawTransactionArgument<number | bigint>;
	pauseCap: RawTransactionArgument<string>;
}
export interface DisableVersionPauseCapOptions {
	package?: string;
	arguments:
		| DisableVersionPauseCapArguments
		| [
				self: RawTransactionArgument<string>,
				version: RawTransactionArgument<number | bigint>,
				pauseCap: RawTransactionArgument<string>,
		  ];
}
/**
 * Disables a package version Pause Cap must be valid and can disable the version
 * This function does not have version restrictions
 */
export function disableVersionPauseCap(options: DisableVersionPauseCapOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['self', 'version', 'pauseCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'disable_version_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintPauseCapArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface MintPauseCapOptions {
	package?: string;
	arguments:
		| MintPauseCapArguments
		| [self: RawTransactionArgument<string>, AdminCap: RawTransactionArgument<string>];
}
/**
 * Mint a pause cap Only Admin can mint a pause cap This function does not have
 * version restrictions
 */
export function mintPauseCap(options: MintPauseCapOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'mint_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RevokePauseCapArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pauseCapId: RawTransactionArgument<string>;
}
export interface RevokePauseCapOptions {
	package?: string;
	arguments:
		| RevokePauseCapArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pauseCapId: RawTransactionArgument<string>,
		  ];
}
/**
 * Revoke a pause cap Only Admin can revoke a pause cap This function does not have
 * version restrictions
 */
export function revokePauseCap(options: RevokePauseCapOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, '0x2::clock::Clock', '0x2::object::ID'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'AdminCap', 'pauseCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'revoke_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetPriceToleranceArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	tolerance: RawTransactionArgument<number | bigint>;
}
export interface SetPriceToleranceOptions {
	package?: string;
	arguments:
		| SetPriceToleranceArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				tolerance: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Set price deviation tolerance for a pool tolerance is in 9 decimals where 1.0 =
 * 1_000_000_000 (e.g., 100_000_000 = 0.1 = 10%) Only Admin can set tolerance
 * Requires price to be initialized first via update_current_price
 */
export function setPriceTolerance(options: SetPriceToleranceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'pool', 'tolerance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'set_price_tolerance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetMaxPriceAgeArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	maxAgeMs: RawTransactionArgument<number | bigint>;
}
export interface SetMaxPriceAgeOptions {
	package?: string;
	arguments:
		| SetMaxPriceAgeArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				maxAgeMs: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Set maximum price age in milliseconds for a pool Only Admin can set max price
 * age Requires price to be initialized first via update_current_price
 */
export function setMaxPriceAge(options: SetMaxPriceAgeOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'pool', 'maxAgeMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'set_max_price_age',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetMaxOrderTtlArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	maxOrderTtlMs: RawTransactionArgument<number | bigint>;
}
export interface SetMaxOrderTtlOptions {
	package?: string;
	arguments:
		| SetMaxOrderTtlArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				maxOrderTtlMs: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Set the maximum lifetime (in ms) of margin limit orders for a pool.
 * User-supplied `expire_timestamp` on margin limit-order placements is clamped to
 * at most `now + max_order_ttl_ms`. Bounds margin orders' exposure to stale-price
 * exploitation if liquidity disappears after placement. Only Admin can set max
 * order TTL.
 */
export function setMaxOrderTtl(options: SetMaxOrderTtlOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'pool', 'maxOrderTtlMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'set_max_order_ttl',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetMinOpenRiskRatioArguments {
	self: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	minOpenRiskRatio: RawTransactionArgument<number | bigint>;
}
export interface SetMinOpenRiskRatioOptions {
	package?: string;
	arguments:
		| SetMinOpenRiskRatioArguments
		| [
				self: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				minOpenRiskRatio: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Set the per-pool `min_open_risk_ratio` override — the post-trade solvency floor
 * enforced on opening (risk-increasing) orders. Must sit in
 * `(liquidation_risk_ratio, min_borrow_risk_ratio]`: above liquidation so an open
 * can't land in the liquidatable zone, at or below the borrow floor. Absent an
 * override the floor defaults to the midpoint of liquidation and min_borrow. Only
 * Admin can set it.
 */
export function setMinOpenRiskRatio(options: SetMinOpenRiskRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'AdminCap', 'pool', 'minOpenRiskRatio'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'set_min_open_risk_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewPoolConfigArguments {
	self: RawTransactionArgument<string>;
	minWithdrawRiskRatio: RawTransactionArgument<number | bigint>;
	minBorrowRiskRatio: RawTransactionArgument<number | bigint>;
	liquidationRiskRatio: RawTransactionArgument<number | bigint>;
	targetLiquidationRiskRatio: RawTransactionArgument<number | bigint>;
	userLiquidationReward: RawTransactionArgument<number | bigint>;
	poolLiquidationReward: RawTransactionArgument<number | bigint>;
}
export interface NewPoolConfigOptions {
	package?: string;
	arguments:
		| NewPoolConfigArguments
		| [
				self: RawTransactionArgument<string>,
				minWithdrawRiskRatio: RawTransactionArgument<number | bigint>,
				minBorrowRiskRatio: RawTransactionArgument<number | bigint>,
				liquidationRiskRatio: RawTransactionArgument<number | bigint>,
				targetLiquidationRiskRatio: RawTransactionArgument<number | bigint>,
				userLiquidationReward: RawTransactionArgument<number | bigint>,
				poolLiquidationReward: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Create a PoolConfig with margin pool IDs and risk parameters Enable is false by
 * default, must be enabled after registration
 */
export function newPoolConfig(options: NewPoolConfigOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'u64', 'u64', 'u64', 'u64', 'u64', 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'self',
		'minWithdrawRiskRatio',
		'minBorrowRiskRatio',
		'liquidationRiskRatio',
		'targetLiquidationRiskRatio',
		'userLiquidationReward',
		'poolLiquidationReward',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'new_pool_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewPoolConfigWithLeverageArguments {
	self: RawTransactionArgument<string>;
	leverage: RawTransactionArgument<number | bigint>;
}
export interface NewPoolConfigWithLeverageOptions {
	package?: string;
	arguments:
		| NewPoolConfigWithLeverageArguments
		| [self: RawTransactionArgument<string>, leverage: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/** Create a PoolConfig with default risk parameters based on leverage */
export function newPoolConfigWithLeverage(options: NewPoolConfigWithLeverageOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'leverage'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'new_pool_config_with_leverage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PoolEnabledArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface PoolEnabledOptions {
	package?: string;
	arguments:
		| PoolEnabledArguments
		| [self: RawTransactionArgument<string>, pool: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Check if a deepbook pool is registered for margin trading */
export function poolEnabled(options: PoolEnabledOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'pool_enabled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetMarginPoolIdArguments {
	self: RawTransactionArgument<string>;
}
export interface GetMarginPoolIdOptions {
	package?: string;
	arguments: GetMarginPoolIdArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the margin pool id for the given asset. */
export function getMarginPoolId(options: GetMarginPoolIdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'get_margin_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetDeepbookPoolMarginPoolIdsArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface GetDeepbookPoolMarginPoolIdsOptions {
	package?: string;
	arguments:
		| GetDeepbookPoolMarginPoolIdsArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
/** Get the margin pool IDs for a deepbook pool */
export function getDeepbookPoolMarginPoolIds(options: GetDeepbookPoolMarginPoolIdsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'get_deepbook_pool_margin_pool_ids',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetMarginManagerIdsArguments {
	self: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface GetMarginManagerIdsOptions {
	package?: string;
	arguments:
		| GetMarginManagerIdsArguments
		| [self: RawTransactionArgument<string>, owner: RawTransactionArgument<string>];
}
/** Get the margin manager IDs for a given owner */
export function getMarginManagerIds(options: GetMarginManagerIdsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'get_margin_manager_ids',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CanLiquidateArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
	riskRatio: RawTransactionArgument<number | bigint>;
}
export interface CanLiquidateOptions {
	package?: string;
	arguments:
		| CanLiquidateArguments
		| [
				self: RawTransactionArgument<string>,
				deepbookPoolId: RawTransactionArgument<string>,
				riskRatio: RawTransactionArgument<number | bigint>,
		  ];
}
export function canLiquidate(options: CanLiquidateOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID', 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId', 'riskRatio'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'can_liquidate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BaseMarginPoolIdArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface BaseMarginPoolIdOptions {
	package?: string;
	arguments:
		| BaseMarginPoolIdArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
export function baseMarginPoolId(options: BaseMarginPoolIdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'base_margin_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QuoteMarginPoolIdArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface QuoteMarginPoolIdOptions {
	package?: string;
	arguments:
		| QuoteMarginPoolIdArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
export function quoteMarginPoolId(options: QuoteMarginPoolIdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'quote_margin_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinWithdrawRiskRatioArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface MinWithdrawRiskRatioOptions {
	package?: string;
	arguments:
		| MinWithdrawRiskRatioArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
export function minWithdrawRiskRatio(options: MinWithdrawRiskRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'min_withdraw_risk_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinBorrowRiskRatioArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface MinBorrowRiskRatioOptions {
	package?: string;
	arguments:
		| MinBorrowRiskRatioArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
export function minBorrowRiskRatio(options: MinBorrowRiskRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'min_borrow_risk_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LiquidationRiskRatioArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface LiquidationRiskRatioOptions {
	package?: string;
	arguments:
		| LiquidationRiskRatioArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
export function liquidationRiskRatio(options: LiquidationRiskRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'liquidation_risk_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TargetLiquidationRiskRatioArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface TargetLiquidationRiskRatioOptions {
	package?: string;
	arguments:
		| TargetLiquidationRiskRatioArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
export function targetLiquidationRiskRatio(options: TargetLiquidationRiskRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'target_liquidation_risk_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinOpenRiskRatioArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface MinOpenRiskRatioOptions {
	package?: string;
	arguments:
		| MinOpenRiskRatioArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
/**
 * Post-trade solvency floor for _opening_ (risk-increasing) orders, sitting in
 * `(liquidation_risk_ratio, min_borrow_risk_ratio]`. Lets a max-leverage open
 * absorb the opening trade's spread — which lands the post-trade ratio just under
 * the borrow floor — without aborting, while staying above the liquidatable zone.
 * Defaults to the midpoint of liquidation and min_borrow; an admin override
 * (`set_min_open_risk_ratio`) is honored only while it stays in the valid band, so
 * a later risk-param change can't strand it below liquidation.
 */
export function minOpenRiskRatio(options: MinOpenRiskRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'min_open_risk_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UserLiquidationRewardArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface UserLiquidationRewardOptions {
	package?: string;
	arguments:
		| UserLiquidationRewardArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
export function userLiquidationReward(options: UserLiquidationRewardOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'user_liquidation_reward',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PoolLiquidationRewardArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface PoolLiquidationRewardOptions {
	package?: string;
	arguments:
		| PoolLiquidationRewardArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
export function poolLiquidationReward(options: PoolLiquidationRewardOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'pool_liquidation_reward',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AllowedMaintainersArguments {
	self: RawTransactionArgument<string>;
}
export interface AllowedMaintainersOptions {
	package?: string;
	arguments: AllowedMaintainersArguments | [self: RawTransactionArgument<string>];
}
export function allowedMaintainers(options: AllowedMaintainersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'allowed_maintainers',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AllowedPauseCapsArguments {
	self: RawTransactionArgument<string>;
}
export interface AllowedPauseCapsOptions {
	package?: string;
	arguments: AllowedPauseCapsArguments | [self: RawTransactionArgument<string>];
}
export function allowedPauseCaps(options: AllowedPauseCapsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'allowed_pause_caps',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetPoolConfigArguments {
	self: RawTransactionArgument<string>;
	deepbookPoolId: RawTransactionArgument<string>;
}
export interface GetPoolConfigOptions {
	package?: string;
	arguments:
		| GetPoolConfigArguments
		| [self: RawTransactionArgument<string>, deepbookPoolId: RawTransactionArgument<string>];
}
/** Get the pool configuration for a deepbook pool */
export function getPoolConfig(options: GetPoolConfigOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'deepbookPoolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_registry',
			function: 'get_pool_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
