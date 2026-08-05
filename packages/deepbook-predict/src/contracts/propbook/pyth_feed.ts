/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Decodes verifier-produced Pyth Lazer spot updates and stores their source-native
 * fields in a shared Propbook oracle lane. Writes are permissionless because
 * possession of `LazerUpdate` carries the upstream verification result; the
 * registry separately owns source uniqueness and canonical binding. A Lazer update
 * carries two distinct clocks: the envelope `timestamp()` is when the signed
 * update was published, and the per-feed `feed_update_timestamp()` is when the
 * price it carries was generated. They are equal only when the update carries a
 * freshly generated aggregate; when Pyth has no new aggregate it carries the
 * previous price forward under a newer envelope. `latest` keys on the generation
 * time so a carried price ages by its true age, while the exact-history key stays
 * on the envelope so a settlement tick resolves to the canonical price as of that
 * tick. This module normalizes positive prices to 1e9 scale but leaves freshness
 * and market-use policy to consumers.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
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
		feed_update_timestamp_us: bcs.u64(),
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
/** Returns the immutable Pyth source ID for external feed inspection. */
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
/** Returns the write-gating storage version for external feed inspection. */
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
/** Latest raw Pyth spot for external inspection; aborts if none has landed. */
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
	sourceTimestampMs: RawTransactionArgument<number | bigint>;
}
export interface RawSpotAtOptions {
	package?: string;
	arguments:
		| RawSpotAtArguments
		| [
				feed: RawTransactionArgument<string>,
				sourceTimestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
/** Exact raw Pyth spot for external timestamp inspection. */
export function rawSpotAt(options: RawSpotAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'sourceTimestampMs'];
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
	sourceTimestampMs: RawTransactionArgument<number | bigint>;
}
export interface NormalizedSpotAtOptions {
	package?: string;
	arguments:
		| NormalizedSpotAtArguments
		| [
				feed: RawTransactionArgument<string>,
				sourceTimestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
/** Exact Propbook-normalized spot in 1e9 price scaling for `source_timestamp_ms`. */
export function normalizedSpotAt(options: NormalizedSpotAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'sourceTimestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'normalized_spot_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawPythSourceIdArguments {
	raw: TransactionArgument;
}
export interface RawPythSourceIdOptions {
	package?: string;
	arguments: RawPythSourceIdArguments | [raw: TransactionArgument];
}
/** Return the Pyth source ID for external raw-feed inspection. */
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
	raw: TransactionArgument;
}
export interface RawPriceMagnitudeOptions {
	package?: string;
	arguments: RawPriceMagnitudeArguments | [raw: TransactionArgument];
}
/** Return the unsigned price magnitude for external raw-feed inspection. */
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
	raw: TransactionArgument;
}
export interface RawPriceIsNegativeOptions {
	package?: string;
	arguments: RawPriceIsNegativeArguments | [raw: TransactionArgument];
}
/** Return the price sign for external raw-feed inspection. */
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
	raw: TransactionArgument;
}
export interface RawExponentMagnitudeOptions {
	package?: string;
	arguments: RawExponentMagnitudeArguments | [raw: TransactionArgument];
}
/** Return the unsigned exponent magnitude for external raw-feed inspection. */
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
	raw: TransactionArgument;
}
export interface RawExponentIsNegativeOptions {
	package?: string;
	arguments: RawExponentIsNegativeArguments | [raw: TransactionArgument];
}
/** Return the exponent sign for external raw-feed inspection. */
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
export interface RawFeedUpdateTimestampUsArguments {
	raw: TransactionArgument;
}
export interface RawFeedUpdateTimestampUsOptions {
	package?: string;
	arguments: RawFeedUpdateTimestampUsArguments | [raw: TransactionArgument];
}
/**
 * Return the microsecond time at which Pyth generated this price, for external
 * raw-feed inspection. This is the price's true age; it can be older than the
 * envelope that delivered it.
 */
export function rawFeedUpdateTimestampUs(options: RawFeedUpdateTimestampUsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pyth_feed',
			function: 'raw_feed_update_timestamp_us',
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
 * Decode and record a verifier-produced Pyth Lazer update when its generation
 * timestamp advances. A zero, future, duplicate, or stale generation timestamp is
 * ignored without changing `latest` or emitting an event; a price Pyth carried
 * forward therefore leaves `latest` untouched, so redelivery cannot renew a
 * consumer's freshness window. The raw observation may be stored even when its
 * positive normalized projection is unavailable.
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
	update: TransactionArgument;
}
export interface InsertAtOptions {
	package?: string;
	arguments:
		| InsertAtArguments
		| [feed: RawTransactionArgument<string>, update: TransactionArgument];
}
/**
 * Insert an exact Pyth Lazer spot observation keyed by its exact millisecond
 * envelope timestamp. Aborts `EInsertTimestampNotExactMillisecond` if the envelope
 * timestamp is not a whole millisecond, so the exact-history key is an unambiguous
 * millisecond a consumer can look up by equality. Aborts
 * `ESettlementCarryExceedsWindow` if Pyth generated the price more than
 * `constants::max_settlement_carry_ms` before that envelope, so a long-carried
 * price cannot claim a settlement key. This does not mutate `latest`. The first
 * lane-valid raw observation owns the key and cannot be replaced, even if its
 * normalized projection is unavailable.
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
