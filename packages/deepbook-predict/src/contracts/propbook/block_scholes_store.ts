/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stores the latest Block Scholes observation for each series of one underlying,
 * keyed by the series id the provider signed. Nothing here decides where a value
 * belongs: the id names its own slot, so a valid observation for one series can
 * only ever land in that series' slot, and reads derive the id they want rather
 * than trusting one supplied by a caller. Values are held exactly as the verifier
 * produced them; scaling and signed-value interpretation belong to the reading
 * package. Spot and forward share the value store because they ride one signed
 * batch and are separated by their ids; SVI has its own store because it arrives
 * as an independently signed batch.
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
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
			model_timestamp_ms: bcs.u64(),
			/**
			 * Envelope time of the batch this observation arrived in, advancing on every
			 * provider flush. Transport metadata: ordering falls back to it only between equal
			 * model times, and consumers price from the model time, never from this.
			 */
			published_at_ms: bcs.u64(),
			/** Sui clock time when the accepting transaction executed. */
			recorded_at_ms: bcs.u64(),
			value: typeParameters[0],
		},
	});
}
export const SVIParams = new MoveStruct({
	name: `${$moduleName}::SVIParams`,
	fields: {
		a_magnitude: bcs.u128(),
		a_is_negative: bcs.bool(),
		b: bcs.u128(),
		sigma: bcs.u128(),
		rho_magnitude: bcs.u128(),
		rho_is_negative: bcs.bool(),
		m_magnitude: bcs.u128(),
		m_is_negative: bcs.bool(),
	},
});
export const BlockScholesValueStore = new MoveStruct({
	name: `${$moduleName}::BlockScholesValueStore`,
	fields: {
		id: bcs.Address,
		/**
		 * The sole underlying this store holds series for; observations for any other are
		 * skipped.
		 */
		propbook_underlying_id: bcs.u32(),
		/**
		 * Package version this store runs at; writes require an exact match and `migrate`
		 * advances it forward-only after a package upgrade.
		 */
		version: bcs.u64(),
		values: table.Table,
	},
});
export const BlockScholesSVIStore = new MoveStruct({
	name: `${$moduleName}::BlockScholesSVIStore`,
	fields: {
		id: bcs.Address,
		propbook_underlying_id: bcs.u32(),
		version: bcs.u64(),
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
			sid: bcs.u256(),
			observation: typeParameters[0],
		},
	});
}
export const BlockScholesBatchIngested = new MoveStruct({
	name: `${$moduleName}::BlockScholesBatchIngested`,
	fields: {
		propbook_oracle_id: bcs.Address,
		published_at_ms: bcs.u64(),
		/** Observations carried by the batch, including those for other underlyings. */
		update_count: bcs.u64(),
		/** Observations naming a series this store holds. */
		matched: bcs.u64(),
		/** Observations that became their series' latest. */
		applied: bcs.u64(),
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
export interface ValueStoreUnderlyingIdArguments {
	store: RawTransactionArgument<string>;
}
export interface ValueStoreUnderlyingIdOptions {
	package?: string;
	arguments: ValueStoreUnderlyingIdArguments | [store: RawTransactionArgument<string>];
}
export function valueStoreUnderlyingId(options: ValueStoreUnderlyingIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'value_store_underlying_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SviStoreUnderlyingIdArguments {
	store: RawTransactionArgument<string>;
}
export interface SviStoreUnderlyingIdOptions {
	package?: string;
	arguments: SviStoreUnderlyingIdArguments | [store: RawTransactionArgument<string>];
}
export function sviStoreUnderlyingId(options: SviStoreUnderlyingIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['store'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'svi_store_underlying_id',
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
export interface SpotArguments {
	store: RawTransactionArgument<string>;
}
export interface SpotOptions {
	package?: string;
	arguments: SpotArguments | [store: RawTransactionArgument<string>];
}
/**
 * Returns the latest spot observation for this store's underlying, or `none` if
 * none has landed.
 */
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
/**
 * Returns the latest forward observation at `expiry_ms`, or `none` if none has
 * landed.
 */
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
/** Returns the latest SVI observation at `expiry_ms`, or `none` if none has landed. */
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
export interface ApplyValueBatchArguments {
	store: RawTransactionArgument<string>;
	batch: TransactionArgument;
}
export interface ApplyValueBatchOptions {
	package?: string;
	arguments:
		| ApplyValueBatchArguments
		| [store: RawTransactionArgument<string>, batch: TransactionArgument];
}
/**
 * Ingest a verified batch of spot and forward observations. The batch is taken by
 * value rather than as its unpacked updates so the envelope time comes from inside
 * the signature: it breaks ties between retransmissions of the same model data and
 * feeds the batch events, so a caller must not be able to fabricate it. Holding a
 * `ValueBatch` at all is proof of a valid Block Scholes signature, so this never
 * sees keys, bytes, or the signer registry.
 */
export function applyValueBatch(options: ApplyValueBatchOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['store', 'batch'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'block_scholes_store',
			function: 'apply_value_batch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ApplySviBatchArguments {
	store: RawTransactionArgument<string>;
	batch: TransactionArgument;
}
export interface ApplySviBatchOptions {
	package?: string;
	arguments:
		| ApplySviBatchArguments
		| [store: RawTransactionArgument<string>, batch: TransactionArgument];
}
/**
 * Ingest a verified batch of SVI observations. Same batch-by-value reasoning as
 * `apply_value_batch`.
 */
export function applySviBatch(options: ApplySviBatchOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['store', 'batch'];
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
