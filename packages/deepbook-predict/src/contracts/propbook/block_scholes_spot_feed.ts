/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stores the Block Scholes spot stream for one source in a shared Propbook oracle
 * lane. Writes require the verifier-produced `SpotUpdate` type and must match the
 * feed's immutable source ID. Canonical feed binding, freshness, and pricing
 * policy remain consumer responsibilities.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
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
/** Returns the immutable Block Scholes source ID for external feed inspection. */
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
/** Returns the write-gating storage version for external feed inspection. */
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
/** Latest raw BS spot for external inspection; aborts if none has landed. */
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
/** Exact raw BS spot for external timestamp inspection. */
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
/** Exact normalized spot for external timestamp inspection, in 1e9 scaling. */
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
			module: 'block_scholes_spot_feed',
			function: 'raw_bs_source_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawSpotValueArguments {
	raw: TransactionArgument;
}
export interface RawSpotValueOptions {
	package?: string;
	arguments: RawSpotValueArguments | [raw: TransactionArgument];
}
/** Return the source-native spot value for external raw-feed inspection. */
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
	update: TransactionArgument;
}
export interface UpdateOptions {
	package?: string;
	arguments: UpdateArguments | [feed: RawTransactionArgument<string>, update: TransactionArgument];
}
/**
 * Record a verifier-produced raw spot when its source matches this feed. After the
 * version and source checks, a zero, future, duplicate, or stale source timestamp
 * is ignored without changing `latest` or emitting an event. A zero spot is stored
 * when its timestamp advances, but its normalized read is `none`.
 */
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
	update: TransactionArgument;
}
export interface InsertAtOptions {
	package?: string;
	arguments:
		| InsertAtArguments
		| [feed: RawTransactionArgument<string>, update: TransactionArgument];
}
/**
 * Insert a verifier-produced raw spot at its exact source timestamp without
 * changing `latest`. The first lane-valid value owns the key; zero still owns the
 * key even though its normalized read is `none`.
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
