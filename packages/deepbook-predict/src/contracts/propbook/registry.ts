/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Unified shared registry for Propbook oracle metadata.
 *
 * The registry owns two separate namespaces:
 *
 * - source catalog: one Propbook oracle object per source-local key
 * - canonical binding: one immutable oracle per canonical consumer key
 *
 * Source oracle objects are permissionless wrappers around verified source data.
 * Canonical bindings are admin-controlled because they are the trust claim that
 * source data represents a Propbook underlying such as BTC.
 *
 * Intentionally NOT version-gated: a feed created under an old package version
 * just seeds an old version and is migratable by the feed module, so a stale
 * registry caller is harmless.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
import * as table_1 from './deps/sui/table.js';
import * as table_2 from './deps/sui/table.js';
const $moduleName = '@local-pkg/propbook::registry';
export const RegistryAdminCap = new MoveStruct({
	name: `${$moduleName}::RegistryAdminCap`,
	fields: {
		id: bcs.Address,
	},
});
export const OracleRegistry = new MoveStruct({
	name: `${$moduleName}::OracleRegistry`,
	fields: {
		id: bcs.Address,
		sources: table.Table,
		bindings: table_1.Table,
		source_bindings: table_2.Table,
	},
});
export const OracleSourceKey = new MoveStruct({
	name: `${$moduleName}::OracleSourceKey`,
	fields: {
		oracle_kind: bcs.u8(),
		source_id: bcs.u32(),
	},
});
export const OracleBindingKey = new MoveStruct({
	name: `${$moduleName}::OracleBindingKey`,
	fields: {
		propbook_underlying_id: bcs.u32(),
		oracle_kind: bcs.u8(),
		value_kind: bcs.u8(),
	},
});
export const OracleMetadata = new MoveStruct({
	name: `${$moduleName}::OracleMetadata`,
	fields: {
		propbook_underlying_id: bcs.u32(),
		oracle_kind: bcs.u8(),
		source_id: bcs.u32(),
		propbook_oracle_id: bcs.Address,
		value_kind: bcs.u8(),
	},
});
export const OracleSourceRegistered = new MoveStruct({
	name: `${$moduleName}::OracleSourceRegistered`,
	fields: {
		oracle_kind: bcs.u8(),
		source_id: bcs.u32(),
		propbook_oracle_id: bcs.Address,
	},
});
export const OracleBound = new MoveStruct({
	name: `${$moduleName}::OracleBound`,
	fields: {
		propbook_underlying_id: bcs.u32(),
		oracle_kind: bcs.u8(),
		source_id: bcs.u32(),
		propbook_oracle_id: bcs.Address,
		value_kind: bcs.u8(),
	},
});
export interface IdArguments {
	registry: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [registry: RawTransactionArgument<string>];
}
/** Return the registry object ID. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RegistryAdminCapIdArguments {
	cap: RawTransactionArgument<string>;
}
export interface RegistryAdminCapIdOptions {
	package?: string;
	arguments: RegistryAdminCapIdArguments | [cap: RawTransactionArgument<string>];
}
/** Return the registry admin cap object ID. */
export function registryAdminCapId(options: RegistryAdminCapIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'registry_admin_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ContainsPythSourceArguments {
	registry: RawTransactionArgument<string>;
	pythSourceId: RawTransactionArgument<number>;
}
export interface ContainsPythSourceOptions {
	package?: string;
	arguments:
		| ContainsPythSourceArguments
		| [registry: RawTransactionArgument<string>, pythSourceId: RawTransactionArgument<number>];
}
/** Whether a Propbook Pyth source wrapper exists for `pyth_source_id`. */
export function containsPythSource(options: ContainsPythSourceOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'pythSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'contains_pyth_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ContainsBlockScholesSpotSourceArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface ContainsBlockScholesSpotSourceOptions {
	package?: string;
	arguments:
		| ContainsBlockScholesSpotSourceArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/** Whether a Propbook BS spot wrapper exists for `bs_source_id`. */
export function containsBlockScholesSpotSource(options: ContainsBlockScholesSpotSourceOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'contains_block_scholes_spot_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ContainsBlockScholesForwardSourceArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface ContainsBlockScholesForwardSourceOptions {
	package?: string;
	arguments:
		| ContainsBlockScholesForwardSourceArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/** Whether a Propbook BS forward wrapper exists for `bs_source_id`. */
export function containsBlockScholesForwardSource(
	options: ContainsBlockScholesForwardSourceOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'contains_block_scholes_forward_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ContainsBlockScholesSviSourceArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface ContainsBlockScholesSviSourceOptions {
	package?: string;
	arguments:
		| ContainsBlockScholesSviSourceArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/** Whether a Propbook BS SVI wrapper exists for `bs_source_id`. */
export function containsBlockScholesSviSource(options: ContainsBlockScholesSviSourceOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'contains_block_scholes_svi_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookPythIdForSourceArguments {
	registry: RawTransactionArgument<string>;
	pythSourceId: RawTransactionArgument<number>;
}
export interface PropbookPythIdForSourceOptions {
	package?: string;
	arguments:
		| PropbookPythIdForSourceArguments
		| [registry: RawTransactionArgument<string>, pythSourceId: RawTransactionArgument<number>];
}
/** Propbook Pyth object ID for a Pyth source id, if a wrapper exists. */
export function propbookPythIdForSource(options: PropbookPythIdForSourceOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'pythSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_pyth_id_for_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookBlockScholesSpotIdForSourceArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface PropbookBlockScholesSpotIdForSourceOptions {
	package?: string;
	arguments:
		| PropbookBlockScholesSpotIdForSourceArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/** Propbook BS spot object ID for a BS source id, if a wrapper exists. */
export function propbookBlockScholesSpotIdForSource(
	options: PropbookBlockScholesSpotIdForSourceOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_block_scholes_spot_id_for_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookBlockScholesForwardIdForSourceArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface PropbookBlockScholesForwardIdForSourceOptions {
	package?: string;
	arguments:
		| PropbookBlockScholesForwardIdForSourceArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/** Propbook BS forward object ID for `bs_source_id`, if a wrapper exists. */
export function propbookBlockScholesForwardIdForSource(
	options: PropbookBlockScholesForwardIdForSourceOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_block_scholes_forward_id_for_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookBlockScholesSviIdForSourceArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface PropbookBlockScholesSviIdForSourceOptions {
	package?: string;
	arguments:
		| PropbookBlockScholesSviIdForSourceArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/** Propbook BS SVI object ID for `bs_source_id`, if a wrapper exists. */
export function propbookBlockScholesSviIdForSource(
	options: PropbookBlockScholesSviIdForSourceOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_block_scholes_svi_id_for_source',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookPythIdForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface PropbookPythIdForUnderlyingOptions {
	package?: string;
	arguments:
		| PropbookPythIdForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Canonical Propbook Pyth object ID for `propbook_underlying_id`, if bound. */
export function propbookPythIdForUnderlying(options: PropbookPythIdForUnderlyingOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_pyth_id_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookBlockScholesSpotIdForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface PropbookBlockScholesSpotIdForUnderlyingOptions {
	package?: string;
	arguments:
		| PropbookBlockScholesSpotIdForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Canonical Propbook BS spot object ID for `propbook_underlying_id`, if bound. */
export function propbookBlockScholesSpotIdForUnderlying(
	options: PropbookBlockScholesSpotIdForUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_block_scholes_spot_id_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookBlockScholesForwardIdForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface PropbookBlockScholesForwardIdForUnderlyingOptions {
	package?: string;
	arguments:
		| PropbookBlockScholesForwardIdForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Canonical Propbook BS forward object ID for `propbook_underlying_id`, if bound. */
export function propbookBlockScholesForwardIdForUnderlying(
	options: PropbookBlockScholesForwardIdForUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_block_scholes_forward_id_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookBlockScholesSviIdForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface PropbookBlockScholesSviIdForUnderlyingOptions {
	package?: string;
	arguments:
		| PropbookBlockScholesSviIdForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Canonical Propbook BS SVI object ID for `propbook_underlying_id`, if bound. */
export function propbookBlockScholesSviIdForUnderlying(
	options: PropbookBlockScholesSviIdForUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_block_scholes_svi_id_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PythMetadataForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface PythMetadataForUnderlyingOptions {
	package?: string;
	arguments:
		| PythMetadataForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Canonical Pyth metadata for `propbook_underlying_id`, if bound. */
export function pythMetadataForUnderlying(options: PythMetadataForUnderlyingOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'pyth_metadata_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlockScholesSpotMetadataForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface BlockScholesSpotMetadataForUnderlyingOptions {
	package?: string;
	arguments:
		| BlockScholesSpotMetadataForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Canonical BS spot metadata for `propbook_underlying_id`, if bound. */
export function blockScholesSpotMetadataForUnderlying(
	options: BlockScholesSpotMetadataForUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'block_scholes_spot_metadata_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlockScholesForwardMetadataForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface BlockScholesForwardMetadataForUnderlyingOptions {
	package?: string;
	arguments:
		| BlockScholesForwardMetadataForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Canonical BS forward metadata for `propbook_underlying_id`, if bound. */
export function blockScholesForwardMetadataForUnderlying(
	options: BlockScholesForwardMetadataForUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'block_scholes_forward_metadata_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlockScholesSviMetadataForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface BlockScholesSviMetadataForUnderlyingOptions {
	package?: string;
	arguments:
		| BlockScholesSviMetadataForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Canonical BS SVI metadata for `propbook_underlying_id`, if bound. */
export function blockScholesSviMetadataForUnderlying(
	options: BlockScholesSviMetadataForUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'block_scholes_svi_metadata_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookUnderlyingIdArguments {
	metadata: RawTransactionArgument<string>;
}
export interface PropbookUnderlyingIdOptions {
	package?: string;
	arguments: PropbookUnderlyingIdArguments | [metadata: RawTransactionArgument<string>];
}
export function propbookUnderlyingId(options: PropbookUnderlyingIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_underlying_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OracleKindArguments {
	metadata: RawTransactionArgument<string>;
}
export interface OracleKindOptions {
	package?: string;
	arguments: OracleKindArguments | [metadata: RawTransactionArgument<string>];
}
export function oracleKind(options: OracleKindOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'oracle_kind',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SourceIdArguments {
	metadata: RawTransactionArgument<string>;
}
export interface SourceIdOptions {
	package?: string;
	arguments: SourceIdArguments | [metadata: RawTransactionArgument<string>];
}
export function sourceId(options: SourceIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'source_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PropbookOracleIdArguments {
	metadata: RawTransactionArgument<string>;
}
export interface PropbookOracleIdOptions {
	package?: string;
	arguments: PropbookOracleIdArguments | [metadata: RawTransactionArgument<string>];
}
export function propbookOracleId(options: PropbookOracleIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_oracle_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ValueKindArguments {
	metadata: RawTransactionArgument<string>;
}
export interface ValueKindOptions {
	package?: string;
	arguments: ValueKindArguments | [metadata: RawTransactionArgument<string>];
}
export function valueKind(options: ValueKindOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'value_kind',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateAndSharePythFeedArguments {
	registry: RawTransactionArgument<string>;
	pythSourceId: RawTransactionArgument<number>;
}
export interface CreateAndSharePythFeedOptions {
	package?: string;
	arguments:
		| CreateAndSharePythFeedArguments
		| [registry: RawTransactionArgument<string>, pythSourceId: RawTransactionArgument<number>];
}
/**
 * Create and share the Propbook Pyth wrapper for `pyth_source_id`, then record it
 * in the source catalog. Permissionless: a duplicate source aborts before object
 * creation, and a junk source id creates an inert feed whose storage the caller
 * pays for.
 */
export function createAndSharePythFeed(options: CreateAndSharePythFeedOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'pythSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'create_and_share_pyth_feed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateAndShareBlockScholesSpotFeedArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface CreateAndShareBlockScholesSpotFeedOptions {
	package?: string;
	arguments:
		| CreateAndShareBlockScholesSpotFeedArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/**
 * Create and share the Propbook BS spot wrapper for `bs_source_id`, then record it
 * in the source catalog. Permissionless: a duplicate source aborts before object
 * creation.
 */
export function createAndShareBlockScholesSpotFeed(
	options: CreateAndShareBlockScholesSpotFeedOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'create_and_share_block_scholes_spot_feed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateAndShareBlockScholesForwardFeedArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface CreateAndShareBlockScholesForwardFeedOptions {
	package?: string;
	arguments:
		| CreateAndShareBlockScholesForwardFeedArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/**
 * Create and share the Propbook BS forward wrapper for `bs_source_id`, then record
 * it in the source catalog.
 */
export function createAndShareBlockScholesForwardFeed(
	options: CreateAndShareBlockScholesForwardFeedOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'create_and_share_block_scholes_forward_feed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateAndShareBlockScholesSviFeedArguments {
	registry: RawTransactionArgument<string>;
	bsSourceId: RawTransactionArgument<number>;
}
export interface CreateAndShareBlockScholesSviFeedOptions {
	package?: string;
	arguments:
		| CreateAndShareBlockScholesSviFeedArguments
		| [registry: RawTransactionArgument<string>, bsSourceId: RawTransactionArgument<number>];
}
/**
 * Create and share the Propbook BS SVI wrapper for `bs_source_id`, then record it
 * in the source catalog.
 */
export function createAndShareBlockScholesSviFeed(
	options: CreateAndShareBlockScholesSviFeedOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'bsSourceId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'create_and_share_block_scholes_svi_feed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BindPythToUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	adminCap: RawTransactionArgument<string>;
	feed: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface BindPythToUnderlyingOptions {
	package?: string;
	arguments:
		| BindPythToUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				adminCap: RawTransactionArgument<string>,
				feed: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Admin-bind this Pyth source feed to a canonical Propbook underlying. */
export function bindPythToUnderlying(options: BindPythToUnderlyingOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'adminCap', 'feed', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'bind_pyth_to_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BindBlockScholesSpotToUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	adminCap: RawTransactionArgument<string>;
	feed: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface BindBlockScholesSpotToUnderlyingOptions {
	package?: string;
	arguments:
		| BindBlockScholesSpotToUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				adminCap: RawTransactionArgument<string>,
				feed: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Admin-bind this BS spot source feed to a canonical Propbook underlying. */
export function bindBlockScholesSpotToUnderlying(options: BindBlockScholesSpotToUnderlyingOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'adminCap', 'feed', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'bind_block_scholes_spot_to_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BindBlockScholesSurfaceToUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	adminCap: RawTransactionArgument<string>;
	forwardFeed: RawTransactionArgument<string>;
	sviFeed: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface BindBlockScholesSurfaceToUnderlyingOptions {
	package?: string;
	arguments:
		| BindBlockScholesSurfaceToUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				adminCap: RawTransactionArgument<string>,
				forwardFeed: RawTransactionArgument<string>,
				sviFeed: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/**
 * Admin-bind this BS forward/SVI surface pair to a canonical Propbook underlying.
 * The underlying's BS spot feed must already be bound, and all three BS feeds must
 * come from the same source id.
 */
export function bindBlockScholesSurfaceToUnderlying(
	options: BindBlockScholesSurfaceToUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'adminCap', 'forwardFeed', 'sviFeed', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'bind_block_scholes_surface_to_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
