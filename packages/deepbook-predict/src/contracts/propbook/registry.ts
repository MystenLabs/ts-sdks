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
		/**
		 * Underlying to its canonical Block Scholes store pair. Each store owns the
		 * immutable Block Scholes base asset that gates its reads and writes. The pair is
		 * permanent storage: newer signed observations and in-place version migrations
		 * recover it without an admin source switch.
		 */
		block_scholes_stores: table.Table,
	},
});
export const BlockScholesStorePair = new MoveStruct({
	name: `${$moduleName}::BlockScholesStorePair`,
	fields: {
		value_store_id: bcs.Address,
		svi_store_id: bcs.Address,
		block_scholes_base_asset: bcs.string(),
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
export const BlockScholesStoresRegistered = new MoveStruct({
	name: `${$moduleName}::BlockScholesStoresRegistered`,
	fields: {
		propbook_underlying_id: bcs.u32(),
		value_store_id: bcs.Address,
		svi_store_id: bcs.Address,
		block_scholes_base_asset: bcs.string(),
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
export interface PropbookBlockScholesStorePairForUnderlyingArguments {
	registry: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
}
export interface PropbookBlockScholesStorePairForUnderlyingOptions {
	package?: string;
	arguments:
		| PropbookBlockScholesStorePairForUnderlyingArguments
		| [
				registry: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
		  ];
}
/** Resolves the complete immutable Block Scholes binding for an underlying. */
export function propbookBlockScholesStorePairForUnderlying(
	options: PropbookBlockScholesStorePairForUnderlyingOptions,
) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['registry', 'propbookUnderlyingId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'propbook_block_scholes_store_pair_for_underlying',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlockScholesValueStoreIdArguments {
	pair: TransactionArgument;
}
export interface BlockScholesValueStoreIdOptions {
	package?: string;
	arguments: BlockScholesValueStoreIdArguments | [pair: TransactionArgument];
}
/**
 * Returns the canonical value-store identity for external composition or
 * discovery.
 */
export function blockScholesValueStoreId(options: BlockScholesValueStoreIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pair'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'block_scholes_value_store_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlockScholesBaseAssetArguments {
	pair: TransactionArgument;
}
export interface BlockScholesBaseAssetOptions {
	package?: string;
	arguments: BlockScholesBaseAssetArguments | [pair: TransactionArgument];
}
/**
 * Returns the bound provider base asset for external composition, discovery, or
 * devInspect confirmation that the binding names the asset the subscription
 * resolves to.
 */
export function blockScholesBaseAsset(options: BlockScholesBaseAssetOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pair'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'block_scholes_base_asset',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlockScholesSviStoreIdArguments {
	pair: TransactionArgument;
}
export interface BlockScholesSviStoreIdOptions {
	package?: string;
	arguments: BlockScholesSviStoreIdArguments | [pair: TransactionArgument];
}
/** Returns the canonical SVI-store identity for external composition or discovery. */
export function blockScholesSviStoreId(options: BlockScholesSviStoreIdOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pair'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'block_scholes_svi_store_id',
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
export interface CreateAndShareBlockScholesStoresArguments {
	registry: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	propbookUnderlyingId: RawTransactionArgument<number>;
	blockScholesBaseAsset: RawTransactionArgument<string>;
}
export interface CreateAndShareBlockScholesStoresOptions {
	package?: string;
	arguments:
		| CreateAndShareBlockScholesStoresArguments
		| [
				registry: RawTransactionArgument<string>,
				AdminCap: RawTransactionArgument<string>,
				propbookUnderlyingId: RawTransactionArgument<number>,
				blockScholesBaseAsset: RawTransactionArgument<string>,
		  ];
}
/**
 * Create and share this underlying's Block Scholes store partition and bind its
 * source identity. Admin-gated and once per underlying so consumers have one
 * immutable descriptor and store pair.
 *
 * `block_scholes_base_asset` is carried into every derived series id exactly as
 * spelled, and no on-chain fact can say whether it is the asset this underlying is
 * meant to track: a spelling the provider does not serve makes the underlying
 * permanently unfeedable, and a spelling naming a _different_ real asset prices
 * this underlying off that asset with every check passing. Confirm it against the
 * provider's acknowledged subscription before this call — the emitted
 * `BlockScholesStoresRegistered` and `block_scholes_base_asset` reader exist so
 * that confirmation can be made against the chain rather than against the intent.
 * Bad observations are corrected by newer signed rows, and version changes migrate
 * in place. A structural replacement — including recovery from a wrong permanent
 * base-asset binding — belongs in the package upgrade that defines its migration
 * rather than in a generic pre-deployed rebind.
 */
export function createAndShareBlockScholesStores(options: CreateAndShareBlockScholesStoresOptions) {
	const packageAddress = options.package ?? '@local-pkg/propbook';
	const argumentsTypes = [null, null, 'u32', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['registry', 'AdminCap', 'propbookUnderlyingId', 'blockScholesBaseAsset'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'registry',
			function: 'create_and_share_block_scholes_stores',
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
