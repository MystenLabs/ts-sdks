/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Block Scholes forward oracle: one shared object per source id, storing
 * per-expiry forward streams keyed by expiry timestamp.
 *
 * Predict-unaware: this module stores raw source facts and leaves feed binding,
 * freshness, and pricing-safe envelopes to consumers.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/propbook::block_scholes_forward_feed';
export const RawForward = new MoveStruct({
	name: `${$moduleName}::RawForward`,
	fields: {
		bs_source_id: bcs.u32(),
		expiry_ms: bcs.u64(),
		forward: bcs.u64(),
	},
});
export const BlockScholesForwardFeed = new MoveStruct({
	name: `${$moduleName}::BlockScholesForwardFeed`,
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
			module: 'block_scholes_forward_feed',
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
			module: 'block_scholes_forward_feed',
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
			module: 'block_scholes_forward_feed',
			function: 'version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawForwardArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface RawForwardOptions {
	package?: string;
	arguments:
		| RawForwardArguments
		| [feed: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/** Latest raw BS forward read for `expiry_ms`. Aborts if no live update has landed. */
export function rawForward(options: RawForwardOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_forward_feed',
			function: 'raw_forward',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NormalizedForwardArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface NormalizedForwardOptions {
	package?: string;
	arguments:
		| NormalizedForwardArguments
		| [feed: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/** Latest Propbook-normalized forward in 1e9 price scaling for `expiry_ms`. */
export function normalizedForward(options: NormalizedForwardOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_forward_feed',
			function: 'normalized_forward',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawForwardAtArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
	timestampMs: RawTransactionArgument<number | bigint>;
}
export interface RawForwardAtOptions {
	package?: string;
	arguments:
		| RawForwardAtArguments
		| [
				feed: RawTransactionArgument<string>,
				expiryMs: RawTransactionArgument<number | bigint>,
				timestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
/** Exact raw BS forward read for `(expiry_ms, timestamp_ms)`. */
export function rawForwardAt(options: RawForwardAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs', 'timestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_forward_feed',
			function: 'raw_forward_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NormalizedForwardAtArguments {
	feed: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
	timestampMs: RawTransactionArgument<number | bigint>;
}
export interface NormalizedForwardAtOptions {
	package?: string;
	arguments:
		| NormalizedForwardAtArguments
		| [
				feed: RawTransactionArgument<string>,
				expiryMs: RawTransactionArgument<number | bigint>,
				timestampMs: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Exact Propbook-normalized forward in 1e9 price scaling for
 * `(expiry_ms, timestamp_ms)`.
 */
export function normalizedForwardAt(options: NormalizedForwardAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['feed', 'expiryMs', 'timestampMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_forward_feed',
			function: 'normalized_forward_at',
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
			module: 'block_scholes_forward_feed',
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
			module: 'block_scholes_forward_feed',
			function: 'raw_expiry_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RawForwardValueArguments {
	raw: RawTransactionArgument<string>;
}
export interface RawForwardValueOptions {
	package?: string;
	arguments: RawForwardValueArguments | [raw: RawTransactionArgument<string>];
}
export function rawForwardValue(options: RawForwardValueOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['raw'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_forward_feed',
			function: 'raw_forward_value',
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
/** Ingest a verified BS forward update into this feed's generic oracle lane. */
export function update(options: UpdateOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['feed', 'update'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_forward_feed',
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
 * Insert an exact BS forward observation keyed by the update-derived source
 * timestamp. This does not mutate the live latest observation.
 */
export function insertAt(options: InsertAtOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['feed', 'update'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_forward_feed',
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
			module: 'block_scholes_forward_feed',
			function: 'migrate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
