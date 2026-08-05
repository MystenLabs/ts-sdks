/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stores one advancing latest observation and an independent insert-only
 * exact-timestamp history for a Propbook feed. `source_timestamp_ms` is the
 * canonical ordering, freshness, and exact-history key; source adapters may retain
 * richer native timestamps inside the payload. Latest updates ignore invalid or
 * non-advancing timestamps, while exact inserts ignore invalid or previously
 * occupied keys without changing the latest value.
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/propbook::oracle_lane';
/**
 * A source value paired with its source publication time and on-chain recording
 * time. Raw and normalized projections preserve this envelope so consumers can
 * apply one freshness policy. `writer_digest` is the digest of the transaction
 * that accepted the observation; consumers use it to refuse pricing against an
 * observation written in the same PTB.
 */
export function OracleRead<Value extends BcsType<any>>(...typeParameters: [Value]) {
	return new MoveStruct({
		name: `${$moduleName}::OracleRead<${typeParameters[0].name as Value['name']}>`,
		fields: {
			/** Source publication time in Unix milliseconds and the key used for exact reads. */
			source_timestamp_ms: bcs.u64(),
			/** Sui clock time in Unix milliseconds when the update transaction executed. */
			update_timestamp_ms: bcs.u64(),
			/** Digest of the transaction that wrote this observation. */
			writer_digest: bcs.vector(bcs.u8()),
			value: typeParameters[0],
		},
	});
}
/** Latest and exact-timestamp storage for one feed stream. */
export function OracleLane<Payload extends BcsType<any>>(...typeParameters: [Payload]) {
	return new MoveStruct({
		name: `${$moduleName}::OracleLane<${typeParameters[0].name as Payload['name']}>`,
		fields: {
			/** Most recent valid source observation submitted through `update`. */
			latest: bcs.option(OracleRead(typeParameters[0])),
			/**
			 * First accepted observation at each exact source timestamp; entries are never
			 * overwritten.
			 */
			exact_reads: table.Table,
		},
	});
}
/**
 * Emitted when a feed accepts a source-native observation into its live oracle
 * state.
 */
export function ObservationRecorded<Observation extends BcsType<any>>(
	...typeParameters: [Observation]
) {
	return new MoveStruct({
		name: `${$moduleName}::ObservationRecorded<${typeParameters[0].name as Observation['name']}>`,
		fields: {
			propbook_oracle_id: bcs.Address,
			observation: typeParameters[0],
		},
	});
}
/** Emitted when a feed inserts source-native data keyed by exact source timestamp. */
export function ObservationInserted<Observation extends BcsType<any>>(
	...typeParameters: [Observation]
) {
	return new MoveStruct({
		name: `${$moduleName}::ObservationInserted<${typeParameters[0].name as Observation['name']}>`,
		fields: {
			propbook_oracle_id: bcs.Address,
			observation: typeParameters[0],
		},
	});
}
export interface ReadSourceTimestampMsArguments {
	read: TransactionArgument;
}
export interface ReadSourceTimestampMsOptions {
	package?: string;
	arguments: ReadSourceTimestampMsArguments | [read: TransactionArgument];
	typeArguments: [string];
}
export function readSourceTimestampMs(options: ReadSourceTimestampMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['read'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'oracle_lane',
			function: 'read_source_timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReadUpdateTimestampMsArguments {
	read: TransactionArgument;
}
export interface ReadUpdateTimestampMsOptions {
	package?: string;
	arguments: ReadUpdateTimestampMsArguments | [read: TransactionArgument];
	typeArguments: [string];
}
export function readUpdateTimestampMs(options: ReadUpdateTimestampMsOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['read'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'oracle_lane',
			function: 'read_update_timestamp_ms',
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
			module: 'oracle_lane',
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
			module: 'oracle_lane',
			function: 'read_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
