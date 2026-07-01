/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Generic Propbook oracle lane. A lane is one advancing source stream with:
 *
 * - one latest source observation,
 * - insert-only exact timestamp history, and
 * - the normal latest / exact insertion events.
 *
 * `source_timestamp_ms` is Propbook's canonical freshness key. Source modules may
 * keep richer native timestamps inside `Payload`, but lane ordering, exact-history
 * keys, and future-source checks are all millisecond-denominated; lane writes that
 * are future, zero, stale, or duplicate are no-ops.
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/propbook::oracle_lane';
/**
 * Timestamped oracle read. Raw and normalized reads use the same timestamp
 * envelope, so consumers can apply one freshness policy regardless of which
 * projection they read.
 */
export function OracleRead<Value extends BcsType<any>>(...typeParameters: [Value]) {
	return new MoveStruct({
		name: `${$moduleName}::OracleRead<${typeParameters[0].name as Value['name']}>`,
		fields: {
			source_timestamp_ms: bcs.u64(),
			update_timestamp_ms: bcs.u64(),
			value: typeParameters[0],
		},
	});
}
/** One advancing oracle lane. */
export function OracleLane<Payload extends BcsType<any>>(...typeParameters: [Payload]) {
	return new MoveStruct({
		name: `${$moduleName}::OracleLane<${typeParameters[0].name as Payload['name']}>`,
		fields: {
			latest: bcs.option(OracleRead(typeParameters[0])),
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
	read: RawTransactionArgument<string>;
}
export interface ReadSourceTimestampMsOptions {
	package?: string;
	arguments: ReadSourceTimestampMsArguments | [read: RawTransactionArgument<string>];
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
	read: RawTransactionArgument<string>;
}
export interface ReadUpdateTimestampMsOptions {
	package?: string;
	arguments: ReadUpdateTimestampMsArguments | [read: RawTransactionArgument<string>];
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
export interface ReadValueArguments {
	read: RawTransactionArgument<string>;
}
export interface ReadValueOptions {
	package?: string;
	arguments: ReadValueArguments | [read: RawTransactionArgument<string>];
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
