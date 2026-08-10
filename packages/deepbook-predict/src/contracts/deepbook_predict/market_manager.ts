/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Market identity and deployment cadence manager for Predict.
 *
 * `Registry` owns this state and delegates market admission to it. Fixed cadence
 * IDs, periods, and rank order are upgrade-required. Underlying rows, cadence
 * deployment terms, and per-underlying watermarks are stored here.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::market_manager';
export const MarketKey = new MoveStruct({
	name: `${$moduleName}::MarketKey`,
	fields: {
		propbook_underlying_id: bcs.u32(),
		expiry: U64,
	},
});
export const MarketManager = new MoveStruct({
	name: `${$moduleName}::MarketManager`,
	fields: {
		/** Propbook underlying ID -> deployment watermarks. */
		underlying_configs: table.Table,
		/** Created markets keyed by `(propbook_underlying_id, expiry)`. */
		market_ids: table.Table,
	},
});
export const CadenceConfig = new MoveStruct({
	name: `${$moduleName}::CadenceConfig`,
	fields: {
		/** Raw-price-per-tick factor snapshotted into each created market. */
		tick_size: U64,
		/** Coarser raw-price step that new finite mint boundaries must align to. */
		admission_tick_size: U64,
		/**
		 * DUSDC pool allocation cap snapshotted into pool accounting for each created
		 * expiry.
		 */
		max_expiry_allocation: U64,
		/**
		 * Minimum DUSDC cash target snapshotted into pool accounting for each created
		 * expiry.
		 */
		initial_expiry_cash: U64,
		/**
		 * Number of cadence periods in the rolling future deployment horizon. Zero
		 * disables this cadence.
		 */
		window_size: U64,
	},
});
export const DeployableMarket = new MoveStruct({
	name: `${$moduleName}::DeployableMarket`,
	fields: {
		expiry: U64,
		cadence: CadenceConfig,
	},
});
export const UnderlyingMarketConfig = new MoveStruct({
	name: `${$moduleName}::UnderlyingMarketConfig`,
	fields: {
		/** Deployment config indexed by cadence ID. */
		cadences: bcs.vector(CadenceConfig),
		/** Highest deployed expiry timestamp indexed by cadence ID. */
		last_deployed_expiries: bcs.vector(bcs.u64()),
	},
});
export interface CadenceTickSizeArguments {
	config: TransactionArgument;
}
export interface CadenceTickSizeOptions {
	package?: string;
	arguments: CadenceTickSizeArguments | [config: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the raw-price-per-tick factor for SDK and devInspect cadence reads. */
export function cadenceTickSize(options: CadenceTickSizeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'market_manager',
			function: 'cadence_tick_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CadenceAdmissionTickSizeArguments {
	config: TransactionArgument;
}
export interface CadenceAdmissionTickSizeOptions {
	package?: string;
	arguments: CadenceAdmissionTickSizeArguments | [config: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the admission-grid step for SDK and devInspect cadence reads. */
export function cadenceAdmissionTickSize(options: CadenceAdmissionTickSizeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'market_manager',
			function: 'cadence_admission_tick_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CadenceMaxExpiryAllocationArguments {
	config: TransactionArgument;
}
export interface CadenceMaxExpiryAllocationOptions {
	package?: string;
	arguments: CadenceMaxExpiryAllocationArguments | [config: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the expiry allocation cap for SDK and devInspect cadence reads. */
export function cadenceMaxExpiryAllocation(options: CadenceMaxExpiryAllocationOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'market_manager',
			function: 'cadence_max_expiry_allocation',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CadenceInitialExpiryCashArguments {
	config: TransactionArgument;
}
export interface CadenceInitialExpiryCashOptions {
	package?: string;
	arguments: CadenceInitialExpiryCashArguments | [config: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the initial expiry cash target for SDK and devInspect cadence reads. */
export function cadenceInitialExpiryCash(options: CadenceInitialExpiryCashOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'market_manager',
			function: 'cadence_initial_expiry_cash',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CadenceWindowSizeArguments {
	config: TransactionArgument;
}
export interface CadenceWindowSizeOptions {
	package?: string;
	arguments: CadenceWindowSizeArguments | [config: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return the rolling deployment horizon for SDK and devInspect cadence reads. */
export function cadenceWindowSize(options: CadenceWindowSizeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'market_manager',
			function: 'cadence_window_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CadenceEnabledArguments {
	config: TransactionArgument;
}
export interface CadenceEnabledOptions {
	package?: string;
	arguments: CadenceEnabledArguments | [config: TransactionArgument];
	config?: {
		predictPackageId?: string;
	};
}
/** Return whether this cadence is enabled for SDK and devInspect discovery. */
export function cadenceEnabled(options: CadenceEnabledOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['config'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'market_manager',
			function: 'cadence_enabled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
