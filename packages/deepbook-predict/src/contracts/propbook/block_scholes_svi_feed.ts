/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Block Scholes SVI oracle: one shared object per source id, storing per-expiry
 * volatility-surface streams keyed by expiry timestamp.
 *
 * Propbook does not validate Predict's pricing-safe SVI envelope; consumers own
 * any bounds or no-arbitrage policy needed by their pricing math.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as i64 from './deps/fixed_math/i64.js';
import * as i64_1 from './deps/fixed_math/i64.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/propbook::block_scholes_svi_feed';
export const SVIParams = new MoveStruct({
	name: `${$moduleName}::SVIParams`,
	fields: {
		a: bcs.u64(),
		b: bcs.u64(),
		rho: i64.I64,
		m: i64_1.I64,
		sigma: bcs.u64(),
	},
});
export const RawSVI = new MoveStruct({
	name: `${$moduleName}::RawSVI`,
	fields: {
		bs_source_id: bcs.u32(),
		expiry_ms: bcs.u64(),
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
/** Return the feed object ID. */
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
/** Return the Block Scholes source id this feed is bound to. */
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
/** Return the package version this feed runs at. */
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
/** Latest raw BS SVI read for `expiry_ms`. Aborts if no live update has landed. */
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
/** Exact raw BS SVI read for `(expiry_ms, timestamp_ms)`. */
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
/** Exact Propbook-normalized SVI params for `(expiry_ms, timestamp_ms)`. */
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
	raw: RawTransactionArgument<string>;
}
export interface RawBsSourceIdOptions {
	package?: string;
	arguments: RawBsSourceIdArguments | [raw: RawTransactionArgument<string>];
}
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
	raw: RawTransactionArgument<string>;
}
export interface RawExpiryMsOptions {
	package?: string;
	arguments: RawExpiryMsArguments | [raw: RawTransactionArgument<string>];
}
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
export interface RawSviParamsArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawSviParamsOptions {
	package?: string;
	arguments: RawSviParamsArguments | [raw: RawTransactionArgument<string>];
}
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
	params: RawTransactionArgument<string>;
}
export interface AOptions {
	package?: string;
	arguments: AArguments | [params: RawTransactionArgument<string>];
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
	params: RawTransactionArgument<string>;
}
export interface BOptions {
	package?: string;
	arguments: BArguments | [params: RawTransactionArgument<string>];
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
	params: RawTransactionArgument<string>;
}
export interface RhoOptions {
	package?: string;
	arguments: RhoArguments | [params: RawTransactionArgument<string>];
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
	params: RawTransactionArgument<string>;
}
export interface MOptions {
	package?: string;
	arguments: MArguments | [params: RawTransactionArgument<string>];
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
	params: RawTransactionArgument<string>;
}
export interface SigmaOptions {
	package?: string;
	arguments: SigmaArguments | [params: RawTransactionArgument<string>];
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
	update: RawTransactionArgument<string>;
}
export interface UpdateOptions {
	package?: string;
	arguments:
		| UpdateArguments
		| [feed: RawTransactionArgument<string>, update: RawTransactionArgument<string>];
}
/** Ingest a verified BS SVI update into this feed's generic oracle lane. */
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
	update: RawTransactionArgument<string>;
}
export interface InsertAtOptions {
	package?: string;
	arguments:
		| InsertAtArguments
		| [feed: RawTransactionArgument<string>, update: RawTransactionArgument<string>];
}
/**
 * Insert an exact BS SVI observation keyed by the update-derived source timestamp.
 * This does not mutate the live latest observation.
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
