/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stores Block Scholes SVI surface streams for one source, partitioned by expiry
 * into independent Propbook oracle lanes. Writes require the verifier-produced
 * `SVIUpdate` type and must match the feed's immutable source ID. Propbook
 * preserves the signed surface parameters but does not impose consumer-specific
 * pricing or no-arbitrage policy.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as i64 from './deps/fixed_math/i64.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/propbook::block_scholes_svi_feed';
export const SVIParams = new MoveStruct({
	name: `${$moduleName}::SVIParams`,
	fields: {
		a: i64.I64,
		b: bcs.u64(),
		rho: i64.I64,
		m: i64.I64,
		sigma: bcs.u64(),
	},
});
export const RawSVI = new MoveStruct({
	name: `${$moduleName}::RawSVI`,
	fields: {
		bs_source_id: bcs.u32(),
		expiry_ms: bcs.u64(),
		params_timestamp_ms: bcs.u64(),
		svi: SVIParams,
	},
});
export const BlockScholesSVIFeed = new MoveStruct({
	name: `${$moduleName}::BlockScholesSVIFeed`,
	fields: {
		id: bcs.Address,
		bs_source_id: bcs.u32(),
		/**
		 * Package version this feed runs at; updates require an exact match and `migrate`
		 * advances it forward-only after a package upgrade.
		 */
		version: bcs.u64(),
		expiries: table.Table,
	},
});
export interface IdArguments {
	feed: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [feed: RawTransactionArgument<string>];
}
/**
 * Returns the feed identity for external composition and canonical-binding
 * discovery.
 */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BsSourceIdArguments {
	feed: RawTransactionArgument<string>;
}
export interface BsSourceIdOptions {
	package?: string;
	arguments: BsSourceIdArguments | [feed: RawTransactionArgument<string>];
}
/** Returns the immutable Block Scholes source ID for external feed inspection. */
export function bsSourceId(options: BsSourceIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'bs_source_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VersionArguments {
	feed: RawTransactionArgument<string>;
}
export interface VersionOptions {
	package?: string;
	arguments: VersionArguments | [feed: RawTransactionArgument<string>];
}
/** Returns the write-gating storage version for external feed inspection. */
export function version(options: VersionOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawSviArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface RawSviOptions {
	package?: string;
	arguments:
		| RawSviArguments
		| [feed: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/** Latest raw SVI parameters for external inspection; aborts if none has landed. */
export function rawSvi(options: RawSviOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'raw_svi',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NormalizedSviArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface NormalizedSviOptions {
	package?: string;
	arguments:
		| NormalizedSviArguments
		| [feed: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/** Latest Propbook-normalized SVI params for `expiry_ms`. */
export function normalizedSvi(options: NormalizedSviOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'normalized_svi',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ParamsTimestampMsArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface ParamsTimestampMsOptions {
	package?: string;
	arguments:
		| ParamsTimestampMsArguments
		| [feed: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/**
 * Source timestamp of the first accepted envelope carrying the latest exact
 * normalized SVI tuple for `expiry_ms`.
 */
export function paramsTimestampMs(options: ParamsTimestampMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'params_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawSviAtArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
	timestampMs: RawTransactionArgument<number | bigint>;
}
export interface RawSviAtOptions {
	package?: string;
	arguments:
		| RawSviAtArguments
		| [
				feed: RawTransactionArgument<string>,
				expiryMs: RawTransactionArgument<number | bigint>,
				timestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
/** Exact source-native SVI read for external Move, PTB, and devInspect consumers. */
export function rawSviAt(options: RawSviAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs', 'timestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'raw_svi_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NormalizedSviAtArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
	timestampMs: RawTransactionArgument<number | bigint>;
}
export interface NormalizedSviAtOptions {
	package?: string;
	arguments:
		| NormalizedSviAtArguments
		| [
				feed: RawTransactionArgument<string>,
				expiryMs: RawTransactionArgument<number | bigint>,
				timestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
/** Exact normalized SVI parameters for external timestamp inspection. */
export function normalizedSviAt(options: NormalizedSviAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs', 'timestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'normalized_svi_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawBsSourceIdArguments {
	raw: TransactionArgument;
}
export interface RawBsSourceIdOptions {
	package?: string;
	arguments: RawBsSourceIdArguments | [raw: TransactionArgument];
}
/** Return the provider source ID for external raw-feed inspection. */
export function rawBsSourceId(options: RawBsSourceIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'raw_bs_source_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawExpiryMsArguments {
	raw: TransactionArgument;
}
export interface RawExpiryMsOptions {
	package?: string;
	arguments: RawExpiryMsArguments | [raw: TransactionArgument];
}
/** Return the quoted expiry timestamp for external raw-feed inspection. */
export function rawExpiryMs(options: RawExpiryMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'raw_expiry_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawParamsTimestampMsArguments {
	raw: TransactionArgument;
}
export interface RawParamsTimestampMsOptions {
	package?: string;
	arguments: RawParamsTimestampMsArguments | [raw: TransactionArgument];
}
/** Return when the currently stored normalized parameter tuple first appeared. */
export function rawParamsTimestampMs(options: RawParamsTimestampMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'raw_params_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawSviParamsArguments {
	raw: TransactionArgument;
}
export interface RawSviParamsOptions {
	package?: string;
	arguments: RawSviParamsArguments | [raw: TransactionArgument];
}
/** Return the source-native SVI parameters for external raw-feed inspection. */
export function rawSviParams(options: RawSviParamsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'raw_svi_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AArguments {
	params: TransactionArgument;
}
export interface AOptions {
	package?: string;
	arguments: AArguments | [params: TransactionArgument];
}
export function a(options: AOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'a',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BArguments {
	params: TransactionArgument;
}
export interface BOptions {
	package?: string;
	arguments: BArguments | [params: TransactionArgument];
}
export function b(options: BOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'b',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RhoArguments {
	params: TransactionArgument;
}
export interface RhoOptions {
	package?: string;
	arguments: RhoArguments | [params: TransactionArgument];
}
export function rho(options: RhoOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'rho',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MArguments {
	params: TransactionArgument;
}
export interface MOptions {
	package?: string;
	arguments: MArguments | [params: TransactionArgument];
}
export function m(options: MOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'm',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SigmaArguments {
	params: TransactionArgument;
}
export interface SigmaOptions {
	package?: string;
	arguments: SigmaArguments | [params: TransactionArgument];
}
export function sigma(options: SigmaOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'sigma',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateArguments {
	feed: RawTransactionArgument<string>;
	update: TransactionArgument;
}
export interface UpdateOptions {
	package?: string;
	arguments: UpdateArguments | [feed: RawTransactionArgument<string>, update: TransactionArgument];
}
/**
 * Record a verifier-produced SVI update in the lane selected by its expiry. After
 * the version and source checks, a zero, future, duplicate, or stale source
 * timestamp is ignored without changing `latest` or emitting an event.
 */
export function update(options: UpdateOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['feed', 'update'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'update',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InsertAtArguments {
	feed: RawTransactionArgument<string>;
	update: TransactionArgument;
}
export interface InsertAtOptions {
	package?: string;
	arguments:
		| InsertAtArguments
		| [feed: RawTransactionArgument<string>, update: TransactionArgument];
}
/**
 * Inserts a verifier-produced SVI observation at its exact source timestamp
 * without changing `latest`. The first valid observation accepted for an expiry
 * and timestamp owns that key; later inserts are ignored.
 */
export function insertAt(options: InsertAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['feed', 'update'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'insert_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MigrateArguments {
	feed: RawTransactionArgument<string>;
}
export interface MigrateOptions {
	package?: string;
	arguments: MigrateArguments | [feed: RawTransactionArgument<string>];
}
/**
 * Migrate this feed to the running package version. Forward-only:
 * `current_version!()` is compiled into each package version's bytecode.
 */
export function migrate(options: MigrateOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_svi_feed',
			function: 'migrate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
