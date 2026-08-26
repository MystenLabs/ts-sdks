/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Registry and creation entrypoints for the Predict protocol.
 *
 * This module creates shared setup objects, owns registry-level capabilities, and
 * exposes registry-owned governance/creation entrypoints. Market identity, cadence
 * policy, underlying watermarks, and market uniqueness live in the embedded
 * `market_manager`. Runtime pool accounting, expiry risk, oracle feeds, and user
 * positions stay in their owning modules.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as market_manager from './market_manager.js';
import * as vec_set from './deps/sui/vec_set.js';
const $moduleName = '@local-pkg/deepbook_predict::registry';
export const Registry = new MoveStruct({
	name: `${$moduleName}::Registry`,
	fields: {
		id: bcs.Address,
		/**
		 * Market identity, cadence deployment terms, underlying watermarks, and
		 * uniqueness.
		 */
		market_manager: market_manager.MarketManager,
		/**
		 * IDs of `PauseCap` objects currently authorized to use pause-only entries. Admin
		 * mints into this set and revokes from it.
		 */
		allowed_pause_caps: vec_set.VecSet(bcs.Address),
		/**
		 * IDs of `MarketLifecycleCap` objects currently authorized for privileged
		 * lifecycle entries such as market creation and full-pool valuation. Admin mints
		 * into this set and revokes from it.
		 */
		allowed_lifecycle_caps: vec_set.VecSet(bcs.Address),
	},
});
export interface IdArguments {
	registry?: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments?: IdArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return the registry object ID for external discovery and PTB construction. */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'id',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface ExpiryMarketIdArguments {
	registry?: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
	expiry: RawTransactionArgument<number | bigint>;
}
export interface ExpiryMarketIdOptions {
	package?: string;
	arguments: ExpiryMarketIdArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/** Resolve an expiry market ID for external discovery and PTB construction. */
export function expiryMarketId(options: ExpiryMarketIdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, 'u32', 'u64'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId', 'expiry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'expiry_market_id',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CadenceConfigArguments {
	registry?: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
	cadenceId: RawTransactionArgument<number>;
}
export interface CadenceConfigOptions {
	package?: string;
	arguments: CadenceConfigArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/** Return deployment policy for SDK and devInspect market discovery. */
export function cadenceConfig(options: CadenceConfigOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, 'u32', 'u8'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId', 'cadenceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'cadence_config',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CadenceConfigsArguments {
	registry?: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface CadenceConfigsOptions {
	package?: string;
	arguments: CadenceConfigsArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Return one underlying's complete deployment policy as a single coherent
 * snapshot, for off-chain consumers (SDK and devInspect cadence discovery by the
 * keeper, price updater, and dashboard) that would otherwise need one read per
 * cadence. The vector holds one entry per supported cadence, indexed by cadence
 * ID; disabled cadences are present as their all-zero configuration. Aborts if the
 * underlying is not registered.
 */
export function cadenceConfigs(options: CadenceConfigsOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'cadence_configs',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface MintPauseCapArguments {
	registry?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface MintPauseCapOptions {
	package?: string;
	arguments: MintPauseCapArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Mint a new `PauseCap`. This bypasses the version gate so emergency pause
 * authority remains available from a package version below the runtime floor.
 */
export function mintPauseCap(options: MintPauseCapOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'mint_pause_cap',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RevokePauseCapArguments {
	registry?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pauseCapId: RawTransactionArgument<string>;
}
export interface RevokePauseCapOptions {
	package?: string;
	arguments: RevokePauseCapArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/** Revoke a previously minted `PauseCap` by ID. Admin-only. */
export function revokePauseCap(options: RevokePauseCapOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['registry', 'AdminCap', 'pauseCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'revoke_pause_cap',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface MintLifecycleCapArguments {
	registry?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface MintLifecycleCapOptions {
	package?: string;
	arguments: MintLifecycleCapArguments;
	config?: {
		registry: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Mint a version-gated `MarketLifecycleCap` with market-creation and valuation
 * authority.
 */
export function mintLifecycleCap(options: MintLifecycleCapOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'config', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'mint_lifecycle_cap',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RevokeLifecycleCapArguments {
	registry?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	lifecycleCapId: RawTransactionArgument<string>;
}
export interface RevokeLifecycleCapOptions {
	package?: string;
	arguments: RevokeLifecycleCapArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/** Revoke a `MarketLifecycleCap` by ID without applying the version gate. */
export function revokeLifecycleCap(options: RevokeLifecycleCapOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['registry', 'AdminCap', 'lifecycleCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'revoke_lifecycle_cap',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface GenerateLifecycleProofArguments {
	registry?: RawTransactionArgument<string>;
	lifecycleCap: RawTransactionArgument<string>;
}
export interface GenerateLifecycleProofOptions {
	package?: string;
	arguments: GenerateLifecycleProofArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Generate a transaction-local proof that `lifecycle_cap` is currently
 * allowlisted. Consumers take the proof by value so a revoked lifecycle cap cannot
 * authorize cross-module lifecycle actions.
 */
export function generateLifecycleProof(options: GenerateLifecycleProofOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'lifecycleCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'generate_lifecycle_proof',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface PauseTradingPauseCapArguments {
	config?: RawTransactionArgument<string>;
	registry?: RawTransactionArgument<string>;
	pauseCap: RawTransactionArgument<string>;
}
export interface PauseTradingPauseCapOptions {
	package?: string;
	arguments: PauseTradingPauseCapArguments;
	config?: {
		protocolConfig: ConfigValue;
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/** Force `trading_paused = true` via a valid `PauseCap`. One-way. */
export function pauseTradingPauseCap(options: PauseTradingPauseCapOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['config', 'registry', 'pauseCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'pause_trading_pause_cap',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface FreezeProtocolPauseCapArguments {
	config?: RawTransactionArgument<string>;
	registry?: RawTransactionArgument<string>;
	pauseCap: RawTransactionArgument<string>;
}
export interface FreezeProtocolPauseCapOptions {
	package?: string;
	arguments: FreezeProtocolPauseCapArguments;
	config?: {
		protocolConfig: ConfigValue;
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Force the protocol-wide emergency freeze via a valid `PauseCap`. One-way;
 * admin's `protocol_config::set_frozen` is needed to lift the freeze.
 */
export function freezeProtocolPauseCap(options: FreezeProtocolPauseCapOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['config', 'registry', 'pauseCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'freeze_protocol_pause_cap',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface PauseExpiryMarketMintPauseCapArguments {
	market: RawTransactionArgument<string>;
	registry?: RawTransactionArgument<string>;
	pauseCap: RawTransactionArgument<string>;
}
export interface PauseExpiryMarketMintPauseCapOptions {
	package?: string;
	arguments: PauseExpiryMarketMintPauseCapArguments;
	config?: {
		registry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Force `mint_paused = true` on a single expiry market via a valid `PauseCap`.
 * One-way; admin's `expiry_market::set_mint_paused` is needed to unpause.
 */
export function pauseExpiryMarketMintPauseCap(options: PauseExpiryMarketMintPauseCapOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['market', 'registry', 'pauseCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'pause_expiry_market_mint_pause_cap',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface RegisterUnderlyingArguments {
	registry?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface RegisterUnderlyingOptions {
	package?: string;
	arguments: RegisterUnderlyingArguments;
	config?: {
		registry: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Record admin approval of one Propbook underlying. Source IDs and canonical
 * oracle object IDs remain owned by Propbook; this row only gates which
 * underlyings Predict will build markets on and stores deployment watermarks.
 */
export function registerUnderlying(options: RegisterUnderlyingOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'config', 'AdminCap', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'register_underlying',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface SetTemplateCadenceConfigArguments {
	registry?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
	cadenceId: RawTransactionArgument<number>;
	tickSize: RawTransactionArgument<number | bigint>;
	admissionTickSize: RawTransactionArgument<number | bigint>;
	maxExpiryAllocation: RawTransactionArgument<number | bigint>;
	initialExpiryCash: RawTransactionArgument<number | bigint>;
	windowSize: RawTransactionArgument<number | bigint>;
}
export interface SetTemplateCadenceConfigOptions {
	package?: string;
	arguments: SetTemplateCadenceConfigArguments;
	config?: {
		registry: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Set all deployment terms for one underlying's cadence. Passing zero for all five
 * values disables the cadence; otherwise all values must be nonzero and valid.
 */
export function setTemplateCadenceConfig(options: SetTemplateCadenceConfigOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		'u32',
		'u8',
		'u64',
		'u64',
		'u64',
		'u64',
		'u64',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'config',
		'AdminCap',
		'propbookUnderlyingId',
		'cadenceId',
		'tickSize',
		'admissionTickSize',
		'maxExpiryAllocation',
		'initialExpiryCash',
		'windowSize',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'set_template_cadence_config',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CreateAndShareExpiryMarketArguments {
	registry?: RawTransactionArgument<string>;
	poolVault?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	propbookRegistry?: RawTransactionArgument<string>;
	lifecycleCap: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
	cadenceId: RawTransactionArgument<number>;
}
export interface CreateAndShareExpiryMarketOptions {
	package?: string;
	arguments: CreateAndShareExpiryMarketArguments;
	config?: {
		registry: ConfigValue;
		poolVault: ConfigValue;
		protocolConfig: ConfigValue;
		oracleRegistry: ConfigValue;
		predictPackageId?: string;
	};
}
/**
 * Create the next deployable `ExpiryMarket` for one cadence on a Propbook
 * underlying.
 *
 * Requires an allowlisted lifecycle capability, a registered underlying with all
 * canonical feed objects bound, and an enabled cadence with a deployable slot.
 * Higher-rank cadence overlaps and existing markets are skipped. The market
 * snapshots cadence and expiry policy, starts with zero cash, and cannot mint
 * until pool rebalancing funds it. Live pricing reads current Propbook bindings.
 */
export function createAndShareExpiryMarket(options: CreateAndShareExpiryMarketOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u32',
		'u8',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'poolVault',
		'config',
		'propbookRegistry',
		'lifecycleCap',
		'propbookUnderlyingId',
		'cadenceId',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'create_and_share_expiry_market',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
					poolVault: options.arguments?.poolVault ?? options.config?.poolVault,
					config: options.arguments?.config ?? options.config?.protocolConfig,
					propbookRegistry: options.arguments?.propbookRegistry ?? options.config?.oracleRegistry,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
export interface CreateAndShareBuilderCodeArguments {
	registry?: RawTransactionArgument<string>;
	config?: RawTransactionArgument<string>;
	index: RawTransactionArgument<number | bigint>;
}
export interface CreateAndShareBuilderCodeOptions {
	package?: string;
	arguments: CreateAndShareBuilderCodeArguments;
	config?: {
		registry: ConfigValue;
		protocolConfig: ConfigValue;
		predictPackageId?: string;
	};
}
/** Create a derived shared BuilderCode for the caller and index. */
export function createAndShareBuilderCode(options: CreateAndShareBuilderCodeOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['registry', 'config', 'index'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'create_and_share_builder_code',
			arguments: normalizeMoveArguments(
				{
					...options.arguments,
					registry: options.arguments?.registry ?? options.config?.registry,
					config: options.arguments?.config ?? options.config?.protocolConfig,
				},
				argumentsTypes,
				parameterNames,
			),
		});
}
