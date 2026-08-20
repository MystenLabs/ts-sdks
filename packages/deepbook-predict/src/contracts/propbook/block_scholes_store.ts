/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stores the latest verifier-authenticated Block Scholes observations for one
 * immutable base asset. Propbook derives every accepted series id from that
 * identity through the upstream SID package, so a valid observation for another
 * asset cannot enter this store. Values are held exactly as the verifier produced
 * them; scaling and signed-value interpretation belong to the reading package.
 * Value and SVI observations use separate stores because the verifier exposes
 * distinct batch and value types. The registry creates and binds both stores
 * atomically from one base-asset input.
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { U64, U128, U256 } from '../../bcs/integers.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/propbook::block_scholes_store';
/**
 * One accepted observation and the three clocks that describe it. The clocks
 * answer different questions and are not interchangeable: a series that has not
 * moved is retransmitted with its original model time, so only `published_at_ms`
 * distinguishes a quiet feed from a stopped one.
 */
export function BsRead<Value extends BcsType<any>>(...typeParameters: [Value]) {
	return new MoveStruct({
		name: `${$moduleName}::BsRead<${typeParameters[0].name as Value['name']}>`,
		fields: {
			/**
			 * Provider time the series data is "as of", held fixed across retransmissions of a
			 * value that has not changed. The provider's per-series replay key: ordering keys
			 * on this first.
			 */
			model_timestamp_ms: U64,
			/**
			 * Envelope time of the batch this observation arrived in, advancing on every
			 * provider flush. Transport metadata: ordering falls back to it only between equal
			 * model times, and consumers price from the model time, never from this.
			 */
			published_at_ms: U64,
			/** Sui clock time when the accepting transaction executed. */
			recorded_at_ms: U64,
			/** Digest of the transaction that accepted this observation. */
			writer_digest: bcs.vector(bcs.u8()),
			value: typeParameters[0],
		},
	});
}
export const SVIParams = new MoveStruct({
	name: `${$moduleName}::SVIParams`,
	fields: {
		a_magnitude: U128,
		a_is_negative: bcs.bool(),
		b: U128,
		sigma: U128,
		rho_magnitude: U128,
		rho_is_negative: bcs.bool(),
		m_magnitude: U128,
		m_is_negative: bcs.bool(),
	},
});
export const BlockScholesValueStore = new MoveStruct({
	name: `${$moduleName}::BlockScholesValueStore`,
	fields: {
		id: bcs.Address,
		block_scholes_base_asset: bcs.string(),
		/**
		 * Package version this store runs at; writes require an exact match and `migrate`
		 * advances it forward-only after a package upgrade.
		 */
		version: U64,
		values: table.Table,
	},
});
export const BlockScholesSVIStore = new MoveStruct({
	name: `${$moduleName}::BlockScholesSVIStore`,
	fields: {
		id: bcs.Address,
		block_scholes_base_asset: bcs.string(),
		version: U64,
		svis: table.Table,
	},
});
/**
 * Emitted only for observations that were stored, so its presence means the series
 * advanced.
 */
export function BlockScholesObservationRecorded<Observation extends BcsType<any>>(
	...typeParameters: [Observation]
) {
	return new MoveStruct({
		name: `${$moduleName}::BlockScholesObservationRecorded<${typeParameters[0].name as Observation['name']}>`,
		fields: {
			propbook_oracle_id: bcs.Address,
			sid: U256,
			/** `0` = spot, `1` = forward, and `2` = SVI. */
			series_kind: bcs.u8(),
			/** Absolute unix-millisecond expiry; zero for the non-expiring spot series. */
			expiry_ms: U64,
			observation: typeParameters[0],
		},
	});
}
export const BlockScholesBatchIngested = new MoveStruct({
	name: `${$moduleName}::BlockScholesBatchIngested`,
	fields: {
		propbook_oracle_id: bcs.Address,
		/** `0` = spot, `1` = forward, and `2` = SVI. */
		series_kind: bcs.u8(),
		published_at_ms: U64,
		/** Verified observations carried by the batch. */
		update_count: U64,
		/** Observations that became their series' latest. */
		applied: U64,
	},
});
export interface ValueStoreIdArguments {
	store: RawTransactionArgument<string>;
}
export interface ValueStoreIdOptions {
	package?: string;
	arguments: ValueStoreIdArguments | [store: RawTransactionArgument<string>];
}
export function valueStoreId(options: ValueStoreIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'value_store_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviStoreIdArguments {
	store: RawTransactionArgument<string>;
}
export interface SviStoreIdOptions {
	package?: string;
	arguments: SviStoreIdArguments | [store: RawTransactionArgument<string>];
}
export function sviStoreId(options: SviStoreIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_store_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValueStoreBaseAssetArguments {
	store: RawTransactionArgument<string>;
}
export interface ValueStoreBaseAssetOptions {
	package?: string;
	arguments: ValueStoreBaseAssetArguments | [store: RawTransactionArgument<string>];
}
/**
 * Returns the immutable provider base-asset spelling for external composition or
 * devInspect.
 */
export function valueStoreBaseAsset(options: ValueStoreBaseAssetOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'value_store_base_asset',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviStoreBaseAssetArguments {
	store: RawTransactionArgument<string>;
}
export interface SviStoreBaseAssetOptions {
	package?: string;
	arguments: SviStoreBaseAssetArguments | [store: RawTransactionArgument<string>];
}
/**
 * Returns the immutable provider base-asset spelling for external composition or
 * devInspect.
 */
export function sviStoreBaseAsset(options: SviStoreBaseAssetOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_store_base_asset',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValueStoreVersionArguments {
	store: RawTransactionArgument<string>;
}
export interface ValueStoreVersionOptions {
	package?: string;
	arguments: ValueStoreVersionArguments | [store: RawTransactionArgument<string>];
}
export function valueStoreVersion(options: ValueStoreVersionOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'value_store_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviStoreVersionArguments {
	store: RawTransactionArgument<string>;
}
export interface SviStoreVersionOptions {
	package?: string;
	arguments: SviStoreVersionArguments | [store: RawTransactionArgument<string>];
}
export function sviStoreVersion(options: SviStoreVersionOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_store_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotSidArguments {
	store: RawTransactionArgument<string>;
}
export interface SpotSidOptions {
	package?: string;
	arguments: SpotSidArguments | [store: RawTransactionArgument<string>];
}
/** Returns the canonical spot series id for external subscription construction. */
export function spotSid(options: SpotSidOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'spot_sid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ForwardSidArguments {
	store: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface ForwardSidOptions {
	package?: string;
	arguments:
		| ForwardSidArguments
		| [store: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/** Returns one canonical forward series id for external subscription construction. */
export function forwardSid(options: ForwardSidOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['store', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'forward_sid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviSidArguments {
	store: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface SviSidOptions {
	package?: string;
	arguments:
		| SviSidArguments
		| [store: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/** Returns one canonical SVI series id for external subscription construction. */
export function sviSid(options: SviSidOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['store', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_sid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SpotArguments {
	store: RawTransactionArgument<string>;
}
export interface SpotOptions {
	package?: string;
	arguments: SpotArguments | [store: RawTransactionArgument<string>];
}
/** Returns the latest canonical spot observation, or `none` if none has landed. */
export function spot(options: SpotOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'spot',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ForwardArguments {
	store: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface ForwardOptions {
	package?: string;
	arguments:
		| ForwardArguments
		| [store: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/** Returns the latest canonical forward observation at `expiry_ms`. */
export function forward(options: ForwardOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['store', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'forward',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviArguments {
	store: RawTransactionArgument<string>;
	expiryMs: RawTransactionArgument<number | bigint>;
}
export interface SviOptions {
	package?: string;
	arguments:
		| SviArguments
		| [store: RawTransactionArgument<string>, expiryMs: RawTransactionArgument<number | bigint>];
}
/** Returns the latest canonical SVI observation at `expiry_ms`. */
export function svi(options: SviOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['store', 'expiryMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ReadModelTimestampMsArguments {
	read: TransactionArgument;
}
export interface ReadModelTimestampMsOptions {
	package?: string;
	arguments: ReadModelTimestampMsArguments | [read: TransactionArgument];
	typeArguments: [string];
}
export function readModelTimestampMs(options: ReadModelTimestampMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['read'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'read_model_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReadPublishedAtMsArguments {
	read: TransactionArgument;
}
export interface ReadPublishedAtMsOptions {
	package?: string;
	arguments: ReadPublishedAtMsArguments | [read: TransactionArgument];
	typeArguments: [string];
}
export function readPublishedAtMs(options: ReadPublishedAtMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['read'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'read_published_at_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReadRecordedAtMsArguments {
	read: TransactionArgument;
}
export interface ReadRecordedAtMsOptions {
	package?: string;
	arguments: ReadRecordedAtMsArguments | [read: TransactionArgument];
	typeArguments: [string];
}
export function readRecordedAtMs(options: ReadRecordedAtMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['read'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'read_recorded_at_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReadWriterDigestArguments {
	read: TransactionArgument;
}
export interface ReadWriterDigestOptions {
	package?: string;
	arguments: ReadWriterDigestArguments | [read: TransactionArgument];
	typeArguments: [string];
}
export function readWriterDigest(options: ReadWriterDigestOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['read'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'read_writer_digest',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReadValueArguments {
	read: TransactionArgument;
}
export interface ReadValueOptions {
	package?: string;
	arguments: ReadValueArguments | [read: TransactionArgument];
	typeArguments: [string];
}
export function readValue(options: ReadValueOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['read'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'read_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SviAMagnitudeArguments {
	params: TransactionArgument;
}
export interface SviAMagnitudeOptions {
	package?: string;
	arguments: SviAMagnitudeArguments | [params: TransactionArgument];
}
export function sviAMagnitude(options: SviAMagnitudeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_a_magnitude',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviAIsNegativeArguments {
	params: TransactionArgument;
}
export interface SviAIsNegativeOptions {
	package?: string;
	arguments: SviAIsNegativeArguments | [params: TransactionArgument];
}
export function sviAIsNegative(options: SviAIsNegativeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_a_is_negative',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviBArguments {
	params: TransactionArgument;
}
export interface SviBOptions {
	package?: string;
	arguments: SviBArguments | [params: TransactionArgument];
}
export function sviB(options: SviBOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_b',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviSigmaArguments {
	params: TransactionArgument;
}
export interface SviSigmaOptions {
	package?: string;
	arguments: SviSigmaArguments | [params: TransactionArgument];
}
export function sviSigma(options: SviSigmaOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_sigma',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviRhoMagnitudeArguments {
	params: TransactionArgument;
}
export interface SviRhoMagnitudeOptions {
	package?: string;
	arguments: SviRhoMagnitudeArguments | [params: TransactionArgument];
}
export function sviRhoMagnitude(options: SviRhoMagnitudeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_rho_magnitude',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviRhoIsNegativeArguments {
	params: TransactionArgument;
}
export interface SviRhoIsNegativeOptions {
	package?: string;
	arguments: SviRhoIsNegativeArguments | [params: TransactionArgument];
}
export function sviRhoIsNegative(options: SviRhoIsNegativeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_rho_is_negative',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviMMagnitudeArguments {
	params: TransactionArgument;
}
export interface SviMMagnitudeOptions {
	package?: string;
	arguments: SviMMagnitudeArguments | [params: TransactionArgument];
}
export function sviMMagnitude(options: SviMMagnitudeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_m_magnitude',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviMIsNegativeArguments {
	params: TransactionArgument;
}
export interface SviMIsNegativeOptions {
	package?: string;
	arguments: SviMIsNegativeArguments | [params: TransactionArgument];
}
export function sviMIsNegative(options: SviMIsNegativeOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['params'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_m_is_negative',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ApplySpotBatchArguments {
	store: RawTransactionArgument<string>;
	batch: TransactionArgument;
}
export interface ApplySpotBatchOptions {
	package?: string;
	arguments:
		ApplySpotBatchArguments | [store: RawTransactionArgument<string>, batch: TransactionArgument];
}
/** Ingest the canonical spot batch for this store's base asset. */
export function applySpotBatch(options: ApplySpotBatchOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['store', 'batch'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'apply_spot_batch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ApplyForwardBatchArguments {
	store: RawTransactionArgument<string>;
	batch: TransactionArgument;
	expiriesMs: RawTransactionArgument<Array<number | bigint>>;
}
export interface ApplyForwardBatchOptions {
	package?: string;
	arguments:
		| ApplyForwardBatchArguments
		| [
				store: RawTransactionArgument<string>,
				batch: TransactionArgument,
				expiriesMs: RawTransactionArgument<Array<number | bigint>>,
		  ];
}
/**
 * Ingest canonical forwards for this store's base asset. `expiries_ms[i]` is an
 * untrusted descriptor witness for signed update `i`; equality with the
 * upstream-derived SID proves the association before any observation is stored.
 */
export function applyForwardBatch(options: ApplyForwardBatchOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, 'vector<u64>', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['store', 'batch', 'expiriesMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'apply_forward_batch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ApplySviBatchArguments {
	store: RawTransactionArgument<string>;
	batch: TransactionArgument;
	expiriesMs: RawTransactionArgument<Array<number | bigint>>;
}
export interface ApplySviBatchOptions {
	package?: string;
	arguments:
		| ApplySviBatchArguments
		| [
				store: RawTransactionArgument<string>,
				batch: TransactionArgument,
				expiriesMs: RawTransactionArgument<Array<number | bigint>>,
		  ];
}
/** Ingest canonical SVI observations for this store's base asset. */
export function applySviBatch(options: ApplySviBatchOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, 'vector<u64>', '0x2::clock::Clock'] satisfies (
		string | null
	)[];
	const parameterNames = ['store', 'batch', 'expiriesMs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'apply_svi_batch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MigrateValueStoreArguments {
	store: RawTransactionArgument<string>;
}
export interface MigrateValueStoreOptions {
	package?: string;
	arguments: MigrateValueStoreArguments | [store: RawTransactionArgument<string>];
}
/**
 * Migrate this store to the running package version. Forward-only:
 * `current_version!()` is compiled into each package version's bytecode.
 */
export function migrateValueStore(options: MigrateValueStoreOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'migrate_value_store',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MigrateSviStoreArguments {
	store: RawTransactionArgument<string>;
}
export interface MigrateSviStoreOptions {
	package?: string;
	arguments: MigrateSviStoreArguments | [store: RawTransactionArgument<string>];
}
export function migrateSviStore(options: MigrateSviStoreOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'migrate_svi_store',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
