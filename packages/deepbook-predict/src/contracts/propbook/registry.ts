/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Owns Propbook's permissionless source catalog and admin-selected canonical
 * oracle bindings. Registering a source creates its wrapper but does not make it
 * canonical; a binding is the trust claim that the source represents a particular
 * Propbook underlying and value kind. A source key can serve only one underlying
 * for its lifetime, even after its active binding is replaced. Registry operations
 * are not version-gated because each feed owns its write version and migration
 * path.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/sui/table.js';
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
		/** Provider/source pair to the shared feed object created for that source. */
		sources: table.Table,
		/** Underlying/provider/value tuple to its active canonical feed metadata. */
		bindings: table.Table,
		/** Provider/source pair to the sole underlying it may serve. */
		source_bindings: table.Table,
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
export const OracleRebound = new MoveStruct({
	name: `${$moduleName}::OracleRebound`,
	fields: {
		propbook_underlying_id: bcs.u32(),
		oracle_kind: bcs.u8(),
		value_kind: bcs.u8(),
		old_source_id: bcs.u32(),
		old_propbook_oracle_id: bcs.Address,
		new_source_id: bcs.u32(),
		new_propbook_oracle_id: bcs.Address,
	},
});
export interface IdArguments {
	registry: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [registry: RawTransactionArgument<string>];
}
/** Returns the registry identity for external composition and PTB construction. */
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
/**
 * Returns the admin capability identity for administration tooling and object
 * discovery.
 */
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
/** Returns whether the Pyth source wrapper exists in the external source catalog. */
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
/**
 * Returns whether the Block Scholes spot wrapper exists in the external source
 * catalog.
 */
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
/**
 * Returns whether the Block Scholes forward wrapper exists in the external source
 * catalog.
 */
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
/**
 * Returns whether the Block Scholes SVI wrapper exists in the external source
 * catalog.
 */
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
/** Resolves a registered Pyth source wrapper for external composition or discovery. */
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
/**
 * Resolves a registered Block Scholes spot wrapper for external composition or
 * discovery.
 */
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
/**
 * Resolves a registered Block Scholes forward wrapper for external composition or
 * discovery.
 */
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
/**
 * Resolves a registered Block Scholes SVI wrapper for external composition or
 * discovery.
 */
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
/** Resolves the canonical Pyth feed for external composition or discovery. */
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
/**
 * Resolves the canonical Block Scholes spot feed for external composition or
 * discovery.
 */
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
/**
 * Resolves the canonical Block Scholes forward feed for external composition or
 * discovery.
 */
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
/**
 * Resolves the canonical Block Scholes SVI feed for external composition or
 * discovery.
 */
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
/**
 * Returns the canonical Pyth binding metadata for external composition or
 * inspection.
 */
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
/**
 * Returns the canonical Block Scholes spot binding metadata for external
 * composition or inspection.
 */
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
/**
 * Returns the canonical Block Scholes forward binding metadata for external
 * composition or inspection.
 */
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
/**
 * Returns the canonical Block Scholes SVI binding metadata for external
 * composition or inspection.
 */
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
	metadata: TransactionArgument;
}
export interface PropbookUnderlyingIdOptions {
	package?: string;
	arguments: PropbookUnderlyingIdArguments | [metadata: TransactionArgument];
}
/** Return the bound underlying ID for external registry discovery. */
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
	metadata: TransactionArgument;
}
export interface OracleKindOptions {
	package?: string;
	arguments: OracleKindArguments | [metadata: TransactionArgument];
}
/** Return the oracle-kind discriminator for external registry discovery. */
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
	metadata: TransactionArgument;
}
export interface SourceIdOptions {
	package?: string;
	arguments: SourceIdArguments | [metadata: TransactionArgument];
}
/** Return the provider source ID for external registry discovery. */
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
	metadata: TransactionArgument;
}
export interface PropbookOracleIdOptions {
	package?: string;
	arguments: PropbookOracleIdArguments | [metadata: TransactionArgument];
}
/** Return the canonical feed object ID for external PTB construction. */
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
	metadata: TransactionArgument;
}
export interface ValueKindOptions {
	package?: string;
	arguments: ValueKindArguments | [metadata: TransactionArgument];
}
/** Return the value-kind discriminator for external registry discovery. */
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
export interface ReplacePythBindingForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	adminCap: RawTransactionArgument<string>;
	feed: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface ReplacePythBindingForUnderlyingOptions {
	package?: string;
	arguments:
		| ReplacePythBindingForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				adminCap: RawTransactionArgument<string>,
				feed: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/**
 * Admin-replace the canonical Pyth source feed for a Propbook underlying.
 *
 * The replacement feed must already be registered in the source catalog. A source
 * key already assigned to another underlying remains ineligible forever;
 * replacement does not create an unbound intermediate state.
 */
export function replacePythBindingForUnderlying(options: ReplacePythBindingForUnderlyingOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'adminCap', 'feed', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'replace_pyth_binding_for_underlying',
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
export interface ReplaceBlockScholesBindingsForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	adminCap: RawTransactionArgument<string>;
	spotFeed: RawTransactionArgument<string>;
	forwardFeed: RawTransactionArgument<string>;
	sviFeed: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface ReplaceBlockScholesBindingsForUnderlyingOptions {
	package?: string;
	arguments:
		| ReplaceBlockScholesBindingsForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				adminCap: RawTransactionArgument<string>,
				spotFeed: RawTransactionArgument<string>,
				forwardFeed: RawTransactionArgument<string>,
				sviFeed: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/**
 * Admin-replace all canonical Block Scholes feeds for a Propbook underlying.
 *
 * Spot, forward, and SVI are replaced atomically and must all come from the same
 * `bs_source_id`, preserving the same-source surface invariant consumers rely on.
 */
export function replaceBlockScholesBindingsForUnderlying(
	options: ReplaceBlockScholesBindingsForUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, null, null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = [
		'registry',
		'adminCap',
		'spotFeed',
		'forwardFeed',
		'sviFeed',
		'propbookUnderlyingId',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'replace_block_scholes_bindings_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
