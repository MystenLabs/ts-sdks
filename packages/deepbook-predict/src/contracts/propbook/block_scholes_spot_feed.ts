/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Block Scholes spot oracle: one shared object per source id, storing the
 * source-native spot stream through a generic Propbook oracle lane.
 *
 * The verified `SpotUpdate` is its own provenance proof. Predict-unaware: this
 * module stores raw source facts and leaves feed binding, freshness, and
 * pricing-safe envelopes to consumers.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as oracle_lane from './oracle_lane.js';
const $moduleName = '@local-pkg/propbook::block_scholes_spot_feed';
export const RawSpot = new MoveStruct({
	name: `${$moduleName}::RawSpot`,
	fields: {
		bs_source_id: bcs.u32(),
		spot: bcs.u64(),
	},
});
export const BlockScholesSpotFeed = new MoveStruct({
	name: `${$moduleName}::BlockScholesSpotFeed`,
	fields: {
		id: bcs.Address,
		bs_source_id: bcs.u32(),
		/**
		 * Package version this feed runs at; updates require an exact match and `migrate`
		 * advances it forward-only after a package upgrade.
		 */
		version: bcs.u64(),
		lane: oracle_lane.OracleLane(RawSpot),
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
			module: 'block_scholes_spot_feed',
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
			module: 'block_scholes_spot_feed',
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
			module: 'block_scholes_spot_feed',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawSpotArguments {
	feed: RawTransactionArgument<string>;
}
export interface RawSpotOptions {
	package?: string;
	arguments: RawSpotArguments | [feed: RawTransactionArgument<string>];
}
/** Latest raw BS spot read. Aborts if no live update has landed. */
export function rawSpot(options: RawSpotOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_spot_feed',
			function: 'raw_spot',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NormalizedSpotArguments {
	feed: RawTransactionArgument<string>;
}
export interface NormalizedSpotOptions {
	package?: string;
	arguments: NormalizedSpotArguments | [feed: RawTransactionArgument<string>];
}
/** Latest Propbook-normalized spot in 1e9 price scaling. */
export function normalizedSpot(options: NormalizedSpotOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_spot_feed',
			function: 'normalized_spot',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawSpotAtArguments {
	feed: RawTransactionArgument<string>;
	timestampMs: RawTransactionArgument<number | bigint>;
}
export interface RawSpotAtOptions {
	package?: string;
	arguments:
		| RawSpotAtArguments
		| [feed: RawTransactionArgument<string>, timestampMs: RawTransactionArgument<number | bigint>];
}
/** Exact raw BS spot read for `timestamp_ms`. */
export function rawSpotAt(options: RawSpotAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'timestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_spot_feed',
			function: 'raw_spot_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NormalizedSpotAtArguments {
	feed: RawTransactionArgument<string>;
	timestampMs: RawTransactionArgument<number | bigint>;
}
export interface NormalizedSpotAtOptions {
	package?: string;
	arguments:
		| NormalizedSpotAtArguments
		| [feed: RawTransactionArgument<string>, timestampMs: RawTransactionArgument<number | bigint>];
}
/** Exact Propbook-normalized spot in 1e9 price scaling for `timestamp_ms`. */
export function normalizedSpotAt(options: NormalizedSpotAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'timestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_spot_feed',
			function: 'normalized_spot_at',
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
			module: 'block_scholes_spot_feed',
			function: 'raw_bs_source_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawSpotValueArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawSpotValueOptions {
	package?: string;
	arguments: RawSpotValueArguments | [raw: RawTransactionArgument<string>];
}
export function rawSpotValue(options: RawSpotValueOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_spot_feed',
			function: 'raw_spot_value',
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
/** Ingest a verified BS spot update into this feed's generic oracle lane. */
export function update(options: UpdateOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['feed', 'update'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_spot_feed',
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
 * Insert an exact BS spot observation keyed by the update-derived source
 * timestamp. This does not mutate the live latest observation.
 */
export function insertAt(options: InsertAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['feed', 'update'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_spot_feed',
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
			module: 'block_scholes_spot_feed',
			function: 'migrate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
