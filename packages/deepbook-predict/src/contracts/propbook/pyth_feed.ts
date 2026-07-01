/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pyth Lazer spot oracle. It decodes verified Lazer updates into source-native
 * payloads, then stores them through a generic Propbook oracle lane. Feed
 * uniqueness per Pyth Lazer source feed is enforced by `registry`.
 *
 * Fully permissionless: anyone can create, update, and migrate feeds — the
 * verified `Update` is its own provenance proof. Predict-unaware: it owns no DUSDC
 * conversion, forward derivation, freshness policy, or market-settlement
 * valuation; callers own feed binding and freshness over timestamped reads.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as oracle_lane from './oracle_lane.js';
const $moduleName = '@local-pkg/propbook::pyth_feed';
export const RawSpot = new MoveStruct({
	name: `${$moduleName}::RawSpot`,
	fields: {
		pyth_source_id: bcs.u32(),
		price_magnitude: bcs.u64(),
		price_is_negative: bcs.bool(),
		exponent_magnitude: bcs.u16(),
		exponent_is_negative: bcs.bool(),
		source_timestamp_us: bcs.u64(),
	},
});
export const PythFeed = new MoveStruct({
	name: `${$moduleName}::PythFeed`,
	fields: {
		id: bcs.Address,
		pyth_source_id: bcs.u32(),
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
			module: 'pyth_feed',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PythSourceIdArguments {
	feed: RawTransactionArgument<string>;
}
export interface PythSourceIdOptions {
	package?: string;
	arguments: PythSourceIdArguments | [feed: RawTransactionArgument<string>];
}
/** Return the configured Pyth source id. */
export function pythSourceId(options: PythSourceIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'pyth_source_id',
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
			module: 'pyth_feed',
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
/**
 * Latest raw Pyth spot read. Aborts `ERawSpotNotFound` if no live update has
 * landed.
 */
export function rawSpot(options: RawSpotOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
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
			module: 'pyth_feed',
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
/** Exact raw Pyth spot read for `timestamp_ms`. */
export function rawSpotAt(options: RawSpotAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'timestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
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
			module: 'pyth_feed',
			function: 'normalized_spot_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawPythSourceIdArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawPythSourceIdOptions {
	package?: string;
	arguments: RawPythSourceIdArguments | [raw: RawTransactionArgument<string>];
}
export function rawPythSourceId(options: RawPythSourceIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'raw_pyth_source_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawPriceMagnitudeArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawPriceMagnitudeOptions {
	package?: string;
	arguments: RawPriceMagnitudeArguments | [raw: RawTransactionArgument<string>];
}
export function rawPriceMagnitude(options: RawPriceMagnitudeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'raw_price_magnitude',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawPriceIsNegativeArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawPriceIsNegativeOptions {
	package?: string;
	arguments: RawPriceIsNegativeArguments | [raw: RawTransactionArgument<string>];
}
export function rawPriceIsNegative(options: RawPriceIsNegativeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'raw_price_is_negative',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawExponentMagnitudeArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawExponentMagnitudeOptions {
	package?: string;
	arguments: RawExponentMagnitudeArguments | [raw: RawTransactionArgument<string>];
}
export function rawExponentMagnitude(options: RawExponentMagnitudeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'raw_exponent_magnitude',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawExponentIsNegativeArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawExponentIsNegativeOptions {
	package?: string;
	arguments: RawExponentIsNegativeArguments | [raw: RawTransactionArgument<string>];
}
export function rawExponentIsNegative(options: RawExponentIsNegativeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'raw_exponent_is_negative',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawSourceTimestampUsArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawSourceTimestampUsOptions {
	package?: string;
	arguments: RawSourceTimestampUsArguments | [raw: RawTransactionArgument<string>];
}
export function rawSourceTimestampUs(options: RawSourceTimestampUsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'raw_source_timestamp_us',
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
/**
 * Decode a verified Pyth Lazer spot update, store it through the feed's generic
 * oracle lane, then emit the update event.
 */
export function update(options: UpdateOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['feed', 'update'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
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
 * Insert an exact Pyth Lazer spot observation keyed by its exact millisecond
 * source timestamp. Aborts `EInsertTimestampNotExactMillisecond` if the signed
 * source timestamp is not a whole millisecond, so the exact-history key is an
 * unambiguous millisecond a consumer can look up by equality. This does not mutate
 * `latest`.
 */
export function insertAt(options: InsertAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['feed', 'update'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
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
/** Migrate this feed to the running package version (forward-only). */
export function migrate(options: MigrateOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['feed'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'migrate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
