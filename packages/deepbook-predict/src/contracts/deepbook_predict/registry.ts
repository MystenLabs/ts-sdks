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

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as market_manager from './market_manager.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as vec_set_1 from './deps/sui/vec_set.js';
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
		allowed_lifecycle_caps: vec_set_1.VecSet(bcs.Address),
	},
});
export interface IdArguments {
	registry: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [registry: RawTransactionArgument<string>];
}
/** Return the registry object ID. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpiryMarketIdArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
	expiry: RawTransactionArgument<number | bigint>;
}
export interface ExpiryMarketIdOptions {
	package?: string;
	arguments:
		| ExpiryMarketIdArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
				expiry: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Return the expiry market ID for `(propbook_underlying_id, expiry)`, if one has
 * been created.
 */
export function expiryMarketId(options: ExpiryMarketIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, 'u32', 'u64'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId', 'expiry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'expiry_market_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintPauseCapArguments {
	registry: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface MintPauseCapOptions {
	package?: string;
	arguments:
		| MintPauseCapArguments
		| [registry: RawTransactionArgument<string>, AdminCap: RawTransactionArgument<string>];
}
/**
 * Mint a new `PauseCap`. Admin-only and bypasses the version gate so the kill
 * switch remains available even when admin has misconfigured versions.
 */
export function mintPauseCap(options: MintPauseCapOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'mint_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RevokePauseCapArguments {
	registry: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	pauseCapId: RawTransactionArgument<string>;
}
export interface RevokePauseCapOptions {
	package?: string;
	arguments:
		| RevokePauseCapArguments
		| [
				registry: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				pauseCapId: RawTransactionArgument<string>,
		  ];
}
/** Revoke a previously minted `PauseCap` by ID. Admin-only. */
export function revokePauseCap(options: RevokePauseCapOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['registry', 'AdminCap', 'pauseCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'revoke_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MintLifecycleCapArguments {
	registry: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
}
export interface MintLifecycleCapOptions {
	package?: string;
	arguments:
		| MintLifecycleCapArguments
		| [
				registry: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
		  ];
}
/**
 * Mint a new `MarketLifecycleCap`. Admin-only and version-gated because granting
 * privileged lifecycle authority under a version freeze is risky.
 */
export function mintLifecycleCap(options: MintLifecycleCapOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'config', 'AdminCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'mint_lifecycle_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RevokeLifecycleCapArguments {
	registry: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	lifecycleCapId: RawTransactionArgument<string>;
}
export interface RevokeLifecycleCapOptions {
	package?: string;
	arguments:
		| RevokeLifecycleCapArguments
		| [
				registry: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				lifecycleCapId: RawTransactionArgument<string>,
		  ];
}
/**
 * Revoke a previously minted `MarketLifecycleCap` by ID. Admin-only. Deliberately
 * not version-gated (like pause-cap revocation): revocation is harm-reducing and
 * must stay available even when the running package version is frozen below the
 * protocol watermark.
 */
export function revokeLifecycleCap(options: RevokeLifecycleCapOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['registry', 'AdminCap', 'lifecycleCapId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'revoke_lifecycle_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateLifecycleProofArguments {
	registry: RawTransactionArgument<string>;
	lifecycleCap: RawTransactionArgument<string>;
}
export interface GenerateLifecycleProofOptions {
	package?: string;
	arguments:
		| GenerateLifecycleProofArguments
		| [registry: RawTransactionArgument<string>, lifecycleCap: RawTransactionArgument<string>];
}
/**
 * Generate a transaction-local proof that `lifecycle_cap` is currently
 * allowlisted. Consumers take the proof by value so a revoked lifecycle cap cannot
 * authorize cross-module lifecycle actions.
 */
export function generateLifecycleProof(options: GenerateLifecycleProofOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'lifecycleCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'generate_lifecycle_proof',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PauseTradingPauseCapArguments {
	config: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	pauseCap: RawTransactionArgument<string>;
}
export interface PauseTradingPauseCapOptions {
	package?: string;
	arguments:
		| PauseTradingPauseCapArguments
		| [
				config: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				pauseCap: RawTransactionArgument<string>,
		  ];
}
/** Force `trading_paused = true` via a valid `PauseCap`. One-way. */
export function pauseTradingPauseCap(options: PauseTradingPauseCapOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['config', 'registry', 'pauseCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'pause_trading_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PauseExpiryMarketMintPauseCapArguments {
	market: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	pauseCap: RawTransactionArgument<string>;
}
export interface PauseExpiryMarketMintPauseCapOptions {
	package?: string;
	arguments:
		| PauseExpiryMarketMintPauseCapArguments
		| [
				market: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				pauseCap: RawTransactionArgument<string>,
		  ];
}
/**
 * Force `mint_paused = true` on a single expiry market via a valid `PauseCap`.
 * One-way; admin's `expiry_market::set_mint_paused` is needed to unpause.
 */
export function pauseExpiryMarketMintPauseCap(options: PauseExpiryMarketMintPauseCapOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['market', 'registry', 'pauseCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'pause_expiry_market_mint_pause_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RegisterUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface RegisterUnderlyingOptions {
	package?: string;
	arguments:
		| RegisterUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/**
 * Record admin approval of one Propbook underlying. Source IDs and canonical
 * oracle object IDs remain owned by Propbook; this row only gates which
 * underlyings Predict will build markets on and stores deployment watermarks.
 */
export function registerUnderlying(options: RegisterUnderlyingOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'config', 'AdminCap', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'register_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetCadenceConfigArguments {
	registry: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
	cadenceId: RawTransactionArgument<number>;
	tickSize: RawTransactionArgument<number | bigint>;
	admissionTickSize: RawTransactionArgument<number | bigint>;
	maxExpiryAllocation: RawTransactionArgument<number | bigint>;
	initialExpiryCash: RawTransactionArgument<number | bigint>;
	windowSize: RawTransactionArgument<number | bigint>;
}
export interface SetCadenceConfigOptions {
	package?: string;
	arguments:
		| SetCadenceConfigArguments
		| [
				registry: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
				cadenceId: RawTransactionArgument<number>,
				tickSize: RawTransactionArgument<number | bigint>,
				admissionTickSize: RawTransactionArgument<number | bigint>,
				maxExpiryAllocation: RawTransactionArgument<number | bigint>,
				initialExpiryCash: RawTransactionArgument<number | bigint>,
				windowSize: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Set all deployment terms for one underlying's cadence. Passing zero for all five
 * values disables the cadence; otherwise all values must be nonzero and valid.
 */
export function setCadenceConfig(options: SetCadenceConfigOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
			function: 'set_cadence_config',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateExpiryMarketArguments {
	registry: RawTransactionArgument<string>;
	poolVault: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	propbookRegistry: RawTransactionArgument<string>;
	lifecycleCap: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
	cadenceId: RawTransactionArgument<number>;
}
export interface CreateExpiryMarketOptions {
	package?: string;
	arguments:
		| CreateExpiryMarketArguments
		| [
				registry: RawTransactionArgument<string>,
				poolVault: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				propbookRegistry: RawTransactionArgument<string>,
				lifecycleCap: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
				cadenceId: RawTransactionArgument<number>,
		  ];
}
/**
 * Create the next deployable `ExpiryMarket` for one cadence on a Propbook
 * underlying.
 *
 * Requires an allowlisted `MarketLifecycleCap`. The market manager enforces one
 * market per `(propbook_underlying_id, expiry)`, that the underlying is
 * admin-approved for Predict, that the cadence is enabled and inside its
 * deployment window after skipping enabled higher-rank cadence slots and already
 * created markets, and — via Propbook's admin-gated canonical binding — that Pyth
 * spot, BS spot, and the selected expiry's BS forward/SVI feeds are bound for the
 * underlying. The market snapshots the cadence tick size and admission tick size,
 * while pool accounting snapshots the cadence allocation cap and initial expiry
 * cash target. Priced flows resolve the canonical oracle object IDs from
 * Propbook's insert-only bindings. The market is created with zero cash and
 * registered with the pool vault as an accounting row only; it is not mintable
 * until `plp::rebalance_expiry_cash` funds it.
 */
export function createExpiryMarket(options: CreateExpiryMarketOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
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
			function: 'create_expiry_market',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateBuilderCodeArguments {
	registry: RawTransactionArgument<string>;
	config: RawTransactionArgument<string>;
	index: RawTransactionArgument<number | bigint>;
}
export interface CreateBuilderCodeOptions {
	package?: string;
	arguments:
		| CreateBuilderCodeArguments
		| [
				registry: RawTransactionArgument<string>,
				config: RawTransactionArgument<string>,
				index: RawTransactionArgument<number | bigint>,
		  ];
}
/** Create a derived shared BuilderCode for the caller and index. */
export function createBuilderCode(options: CreateBuilderCodeOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['registry', 'config', 'index'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'create_builder_code',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
