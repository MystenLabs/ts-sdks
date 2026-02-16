/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines the system object for managing coin data in a central registry. This
 * module provides a centralized way to store and manage metadata for all
 * currencies in the Sui ecosystem, including their supply information, regulatory
 * status, and metadata capabilities.
 */

import {
	MoveStruct,
	MoveTuple,
	MoveEnum,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as type_name from '../suins_auction/type_name.js';
import * as balance from './balance.js';
import * as vec_map from './vec_map.js';
import * as bag from './bag.js';
const $moduleName = '0x2::coin_registry';
export const CoinRegistry = new MoveStruct({
	name: `${$moduleName}::CoinRegistry`,
	fields: {
		id: bcs.Address,
	},
});
export const ExtraField = new MoveTuple({
	name: `${$moduleName}::ExtraField`,
	fields: [type_name.TypeName, bcs.vector(bcs.u8())],
});
export const CurrencyKey = new MoveTuple({
	name: `${$moduleName}::CurrencyKey<phantom T>`,
	fields: [bcs.bool()],
});
export const LegacyMetadataKey = new MoveTuple({
	name: `${$moduleName}::LegacyMetadataKey`,
	fields: [bcs.bool()],
});
export const MetadataCap = new MoveStruct({
	name: `${$moduleName}::MetadataCap<phantom T>`,
	fields: {
		id: bcs.Address,
	},
});
export const Borrow = new MoveStruct({
	name: `${$moduleName}::Borrow<phantom T>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
/**
 * Supply state marks the type of Currency Supply, which can be
 *
 * - Fixed: no minting or burning;
 * - BurnOnly: no minting, burning is allowed;
 * - Unknown: flexible (supply is controlled by its `TreasuryCap`);
 */
export const SupplyState = new MoveEnum({
	name: `${$moduleName}::SupplyState<phantom T>`,
	fields: {
		/** Coin has a fixed supply with the given Supply object. */
		Fixed: balance.Supply,
		/** Coin has a supply that can ONLY decrease. */
		BurnOnly: balance.Supply,
		/** Supply information is not yet known or registered. */
		Unknown: null,
	},
});
/**
 * Regulated state of a coin type.
 *
 * - Regulated: `DenyCap` exists or a `RegulatedCoinMetadata` used to mark currency
 *   as regulated;
 * - Unregulated: the currency was created without deny list;
 * - Unknown: the regulatory status is unknown.
 */
export const RegulatedState = new MoveEnum({
	name: `${$moduleName}::RegulatedState`,
	fields: {
		/**
		 * Coin is regulated with a deny cap for address restrictions. `allow_global_pause`
		 * is `None` if the information is unknown (has not been migrated from
		 * `DenyCapV2`).
		 */
		Regulated: new MoveStruct({
			name: `RegulatedState.Regulated`,
			fields: {
				cap: bcs.Address,
				allow_global_pause: bcs.option(bcs.bool()),
				variant: bcs.u8(),
			},
		}),
		/** The coin has been created without deny list. */
		Unregulated: null,
		/**
		 * Regulatory status is unknown. Result of a legacy migration for that coin (from
		 * `coin.move` constructors)
		 */
		Unknown: null,
	},
});
/** State of the `MetadataCap` for a single `Currency`. */
export const MetadataCapState = new MoveEnum({
	name: `${$moduleName}::MetadataCapState`,
	fields: {
		/** The metadata cap has been claimed. */
		Claimed: bcs.Address,
		/** The metadata cap has not been claimed. */
		Unclaimed: null,
		/** The metadata cap has been claimed and then deleted. */
		Deleted: null,
	},
});
export const Currency = new MoveStruct({
	name: `${$moduleName}::Currency<phantom T>`,
	fields: {
		id: bcs.Address,
		/** Number of decimal places the coin uses for display purposes. */
		decimals: bcs.u8(),
		/** Human-readable name for the coin. */
		name: bcs.string(),
		/** Short symbol/ticker for the coin. */
		symbol: bcs.string(),
		/** Detailed description of the coin. */
		description: bcs.string(),
		/** URL for the coin's icon/logo. */
		icon_url: bcs.string(),
		/**
		 * Current supply state of the coin (fixed supply or unknown) Note: We're using
		 * `Option` because `SupplyState` does not have drop, meaning we cannot swap out
		 * its value at a later state.
		 */
		supply: bcs.option(SupplyState),
		/** Regulatory status of the coin (regulated with deny cap or unknown) */
		regulated: RegulatedState,
		/** ID of the treasury cap for this coin type, if registered. */
		treasury_cap_id: bcs.option(bcs.Address),
		/** ID of the metadata capability for this coin type, if claimed. */
		metadata_cap_id: MetadataCapState,
		/** Additional fields for extensibility. */
		extra_fields: vec_map.VecMap(bcs.string(), ExtraField),
	},
});
export const CurrencyInitializer = new MoveStruct({
	name: `${$moduleName}::CurrencyInitializer<phantom T>`,
	fields: {
		currency: Currency,
		extra_fields: bag.Bag,
		is_otw: bcs.bool(),
	},
});
export interface NewCurrencyArguments {
	registry: RawTransactionArgument<string>;
	decimals: RawTransactionArgument<number>;
	symbol: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
	description: RawTransactionArgument<string>;
	iconUrl: RawTransactionArgument<string>;
}
export interface NewCurrencyOptions {
	package: string;
	arguments:
		| NewCurrencyArguments
		| [
				registry: RawTransactionArgument<string>,
				decimals: RawTransactionArgument<number>,
				symbol: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
				description: RawTransactionArgument<string>,
				iconUrl: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Creates a new currency.
 *
 * Note: This constructor has no long term difference from `new_currency_with_otw`.
 * This can be called from the module that defines `T` any time after it has been
 * published.
 */
export function newCurrency(options: NewCurrencyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [
		null,
		'u8',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
	] satisfies (string | null)[];
	const parameterNames = ['registry', 'decimals', 'symbol', 'name', 'description', 'iconUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'new_currency',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewCurrencyWithOtwArguments<T extends BcsType<any>> {
	otw: RawTransactionArgument<T>;
	decimals: RawTransactionArgument<number>;
	symbol: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
	description: RawTransactionArgument<string>;
	iconUrl: RawTransactionArgument<string>;
}
export interface NewCurrencyWithOtwOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| NewCurrencyWithOtwArguments<T>
		| [
				otw: RawTransactionArgument<T>,
				decimals: RawTransactionArgument<number>,
				symbol: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
				description: RawTransactionArgument<string>,
				iconUrl: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Creates a new currency with using an OTW as proof of uniqueness.
 *
 * This is a two-step operation:
 *
 * 1.  `Currency` is constructed in the `init` function and sent to the
 *     `CoinRegistry`;
 * 2.  `Currency` is promoted to a shared object in the `finalize_registration`
 *     call;
 */
export function newCurrencyWithOtw<T extends BcsType<any>>(options: NewCurrencyWithOtwOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		'u8',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
	] satisfies (string | null)[];
	const parameterNames = ['otw', 'decimals', 'symbol', 'name', 'description', 'iconUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'new_currency_with_otw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ClaimMetadataCapArguments {
	currency: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
}
export interface ClaimMetadataCapOptions {
	package: string;
	arguments:
		| ClaimMetadataCapArguments
		| [currency: RawTransactionArgument<string>, _: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Claim a `MetadataCap` for a coin type. Only allowed from the owner of
 * `TreasuryCap`, and only once.
 *
 * Aborts if the `MetadataCap` has already been claimed. Deleted `MetadataCap`
 * cannot be reclaimed.
 */
export function claimMetadataCap(options: ClaimMetadataCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', '_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'claim_metadata_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MakeRegulatedArguments {
	init: RawTransactionArgument<string>;
	allowGlobalPause: RawTransactionArgument<boolean>;
}
export interface MakeRegulatedOptions {
	package: string;
	arguments:
		| MakeRegulatedArguments
		| [init: RawTransactionArgument<string>, allowGlobalPause: RawTransactionArgument<boolean>];
	typeArguments: [string];
}
/**
 * Allows converting a currency, on init, to regulated, which creates a `DenyCapV2`
 * object, and a denylist entry. Sets regulated state to `Regulated`.
 *
 * This action is irreversible.
 */
export function makeRegulated(options: MakeRegulatedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['init', 'allowGlobalPause'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_regulated',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MakeSupplyFixedInitArguments {
	init: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface MakeSupplyFixedInitOptions {
	package: string;
	arguments:
		| MakeSupplyFixedInitArguments
		| [init: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Initializer function to make the supply fixed. Aborts if Supply is `0` to
 * enforce minting during initialization.
 */
export function makeSupplyFixedInit(options: MakeSupplyFixedInitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['init', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_supply_fixed_init',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MakeSupplyBurnOnlyInitArguments {
	init: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface MakeSupplyBurnOnlyInitOptions {
	package: string;
	arguments:
		| MakeSupplyBurnOnlyInitArguments
		| [init: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Initializer function to make the supply burn-only. Aborts if Supply is `0` to
 * enforce minting during initialization.
 */
export function makeSupplyBurnOnlyInit(options: MakeSupplyBurnOnlyInitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['init', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_supply_burn_only_init',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MakeSupplyFixedArguments {
	currency: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface MakeSupplyFixedOptions {
	package: string;
	arguments:
		| MakeSupplyFixedArguments
		| [currency: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Freeze the supply by destroying the `TreasuryCap` and storing it in the
 * `Currency`.
 */
export function makeSupplyFixed(options: MakeSupplyFixedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_supply_fixed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MakeSupplyBurnOnlyArguments {
	currency: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface MakeSupplyBurnOnlyOptions {
	package: string;
	arguments:
		| MakeSupplyBurnOnlyArguments
		| [currency: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Make the supply `BurnOnly` by giving up the `TreasuryCap`, and allowing burning
 * of Coins through the `Currency`.
 */
export function makeSupplyBurnOnly(options: MakeSupplyBurnOnlyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_supply_burn_only',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FinalizeArguments {
	builder: RawTransactionArgument<string>;
}
export interface FinalizeOptions {
	package: string;
	arguments: FinalizeArguments | [builder: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Finalize the coin initialization, returning `MetadataCap` */
export function finalize(options: FinalizeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['builder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'finalize',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FinalizeAndDeleteMetadataCapArguments {
	builder: RawTransactionArgument<string>;
}
export interface FinalizeAndDeleteMetadataCapOptions {
	package: string;
	arguments: FinalizeAndDeleteMetadataCapArguments | [builder: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Does the same as `finalize`, but also deletes the `MetadataCap` after
 * finalization.
 */
export function finalizeAndDeleteMetadataCap(options: FinalizeAndDeleteMetadataCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['builder'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'finalize_and_delete_metadata_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FinalizeRegistrationArguments {
	registry: RawTransactionArgument<string>;
	currency: RawTransactionArgument<string>;
}
export interface FinalizeRegistrationOptions {
	package: string;
	arguments:
		| FinalizeRegistrationArguments
		| [registry: RawTransactionArgument<string>, currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * The second step in the "otw" initialization of coin metadata, that takes in the
 * `Currency<T>` that was transferred from init, and transforms it in to a "derived
 * address" shared object.
 *
 * Can be performed by anyone.
 */
export function finalizeRegistration(options: FinalizeRegistrationOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'finalize_registration',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeleteMetadataCapArguments {
	currency: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface DeleteMetadataCapOptions {
	package: string;
	arguments:
		| DeleteMetadataCapArguments
		| [currency: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Delete the metadata cap making further updates of `Currency` metadata
 * impossible. This action is IRREVERSIBLE, and the `MetadataCap` can no longer be
 * claimed.
 */
export function deleteMetadataCap(options: DeleteMetadataCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'delete_metadata_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BurnArguments {
	currency: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface BurnOptions {
	package: string;
	arguments:
		| BurnArguments
		| [currency: RawTransactionArgument<string>, coin: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Burn the `Coin` if the `Currency` has a `BurnOnly` supply state. */
export function burn(options: BurnOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BurnBalanceArguments {
	currency: RawTransactionArgument<string>;
	balance: RawTransactionArgument<string>;
}
export interface BurnBalanceOptions {
	package: string;
	arguments:
		| BurnBalanceArguments
		| [currency: RawTransactionArgument<string>, balance: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Burn the `Balance` if the `Currency` has a `BurnOnly` supply state. */
export function burnBalance(options: BurnBalanceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'balance'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'burn_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetNameArguments {
	currency: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	name: RawTransactionArgument<string>;
}
export interface SetNameOptions {
	package: string;
	arguments:
		| SetNameArguments
		| [
				currency: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				name: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Update the name of the `Currency`. */
export function setName(options: SetNameOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['currency', '_', 'name'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'set_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetDescriptionArguments {
	currency: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	description: RawTransactionArgument<string>;
}
export interface SetDescriptionOptions {
	package: string;
	arguments:
		| SetDescriptionArguments
		| [
				currency: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				description: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Update the description of the `Currency`. */
export function setDescription(options: SetDescriptionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['currency', '_', 'description'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'set_description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetIconUrlArguments {
	currency: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	iconUrl: RawTransactionArgument<string>;
}
export interface SetIconUrlOptions {
	package: string;
	arguments:
		| SetIconUrlArguments
		| [
				currency: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				iconUrl: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/** Update the icon URL of the `Currency`. */
export function setIconUrl(options: SetIconUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['currency', '_', 'iconUrl'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'set_icon_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetTreasuryCapIdArguments {
	currency: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface SetTreasuryCapIdOptions {
	package: string;
	arguments:
		| SetTreasuryCapIdArguments
		| [currency: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Register the treasury cap ID for a migrated `Currency`. All currencies created
 * with `new_currency` or `new_currency_with_otw` have their treasury cap ID set
 * during initialization.
 */
export function setTreasuryCapId(options: SetTreasuryCapIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'set_treasury_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MigrateLegacyMetadataArguments {
	registry: RawTransactionArgument<string>;
	legacy: RawTransactionArgument<string>;
}
export interface MigrateLegacyMetadataOptions {
	package: string;
	arguments:
		| MigrateLegacyMetadataArguments
		| [registry: RawTransactionArgument<string>, legacy: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Register `CoinMetadata` in the `CoinRegistry`. This can happen only once, if the
 * `Currency` did not exist yet. Further updates are possible through
 * `update_from_legacy_metadata`.
 */
export function migrateLegacyMetadata(options: MigrateLegacyMetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['registry', 'legacy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'migrate_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateFromLegacyMetadataArguments {
	currency: RawTransactionArgument<string>;
	legacy: RawTransactionArgument<string>;
}
export interface UpdateFromLegacyMetadataOptions {
	package: string;
	arguments:
		| UpdateFromLegacyMetadataArguments
		| [currency: RawTransactionArgument<string>, legacy: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Update `Currency` from `CoinMetadata` if the `MetadataCap` is not claimed. After
 * the `MetadataCap` is claimed, updates can only be made through `set_*`
 * functions.
 */
export function updateFromLegacyMetadata(options: UpdateFromLegacyMetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'legacy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'update_from_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeleteMigratedLegacyMetadataOptions {
	package: string;
	arguments: [_: RawTransactionArgument<string>, _: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function deleteMigratedLegacyMetadata(options: DeleteMigratedLegacyMetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'delete_migrated_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MigrateRegulatedStateByMetadataArguments {
	currency: RawTransactionArgument<string>;
	metadata: RawTransactionArgument<string>;
}
export interface MigrateRegulatedStateByMetadataOptions {
	package: string;
	arguments:
		| MigrateRegulatedStateByMetadataArguments
		| [currency: RawTransactionArgument<string>, metadata: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Allow migrating the regulated state by access to `RegulatedCoinMetadata` frozen
 * object. This is a permissionless operation which can be performed only once.
 */
export function migrateRegulatedStateByMetadata(options: MigrateRegulatedStateByMetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'metadata'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'migrate_regulated_state_by_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MigrateRegulatedStateByCapArguments {
	currency: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface MigrateRegulatedStateByCapOptions {
	package: string;
	arguments:
		| MigrateRegulatedStateByCapArguments
		| [currency: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Mark regulated state by showing the `DenyCapV2` object for the `Currency`. */
export function migrateRegulatedStateByCap(options: MigrateRegulatedStateByCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'migrate_regulated_state_by_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowLegacyMetadataArguments {
	currency: RawTransactionArgument<string>;
}
export interface BorrowLegacyMetadataOptions {
	package: string;
	arguments: BorrowLegacyMetadataArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Borrow the legacy `CoinMetadata` from a new `Currency`. To preserve the `ID` of
 * the legacy `CoinMetadata`, we create it on request and then store it as a
 * dynamic field for future borrows.
 *
 * `Borrow<T>` ensures that the `CoinMetadata` is returned in the same transaction.
 */
export function borrowLegacyMetadata(options: BorrowLegacyMetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'borrow_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReturnBorrowedLegacyMetadataArguments {
	currency: RawTransactionArgument<string>;
	legacy: RawTransactionArgument<string>;
	borrow: RawTransactionArgument<string>;
}
export interface ReturnBorrowedLegacyMetadataOptions {
	package: string;
	arguments:
		| ReturnBorrowedLegacyMetadataArguments
		| [
				currency: RawTransactionArgument<string>,
				legacy: RawTransactionArgument<string>,
				borrow: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Return the borrowed `CoinMetadata` and the `Borrow` potato to the `Currency`.
 *
 * Note to self: Borrow requirement prevents deletion through this method.
 */
export function returnBorrowedLegacyMetadata(options: ReturnBorrowedLegacyMetadataOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['currency', 'legacy', 'borrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'return_borrowed_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DecimalsArguments {
	currency: RawTransactionArgument<string>;
}
export interface DecimalsOptions {
	package: string;
	arguments: DecimalsArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the number of decimal places for the coin type. */
export function decimals(options: DecimalsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'decimals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NameArguments {
	currency: RawTransactionArgument<string>;
}
export interface NameOptions {
	package: string;
	arguments: NameArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the human-readable name of the coin. */
export function name(options: NameOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SymbolArguments {
	currency: RawTransactionArgument<string>;
}
export interface SymbolOptions {
	package: string;
	arguments: SymbolArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the symbol/ticker of the coin. */
export function symbol(options: SymbolOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'symbol',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DescriptionArguments {
	currency: RawTransactionArgument<string>;
}
export interface DescriptionOptions {
	package: string;
	arguments: DescriptionArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the description of the coin. */
export function description(options: DescriptionOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IconUrlArguments {
	currency: RawTransactionArgument<string>;
}
export interface IconUrlOptions {
	package: string;
	arguments: IconUrlArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the icon URL for the coin. */
export function iconUrl(options: IconUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'icon_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsMetadataCapClaimedArguments {
	currency: RawTransactionArgument<string>;
}
export interface IsMetadataCapClaimedOptions {
	package: string;
	arguments: IsMetadataCapClaimedArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check if the metadata capability has been claimed for this `Currency` type. */
export function isMetadataCapClaimed(options: IsMetadataCapClaimedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_metadata_cap_claimed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsMetadataCapDeletedArguments {
	currency: RawTransactionArgument<string>;
}
export interface IsMetadataCapDeletedOptions {
	package: string;
	arguments: IsMetadataCapDeletedArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check if the metadata capability has been deleted for this `Currency` type. */
export function isMetadataCapDeleted(options: IsMetadataCapDeletedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_metadata_cap_deleted',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MetadataCapIdArguments {
	currency: RawTransactionArgument<string>;
}
export interface MetadataCapIdOptions {
	package: string;
	arguments: MetadataCapIdArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the metadata cap ID, or none if it has not been claimed. */
export function metadataCapId(options: MetadataCapIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'metadata_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TreasuryCapIdArguments {
	currency: RawTransactionArgument<string>;
}
export interface TreasuryCapIdOptions {
	package: string;
	arguments: TreasuryCapIdArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the treasury cap ID for this coin type, if registered. */
export function treasuryCapId(options: TreasuryCapIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'treasury_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DenyCapIdArguments {
	currency: RawTransactionArgument<string>;
}
export interface DenyCapIdOptions {
	package: string;
	arguments: DenyCapIdArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Get the deny cap ID for this coin type, if it's a regulated coin. Returns `None`
 * if:
 *
 * - The `Currency` is not regulated;
 * - The `Currency` is migrated from legacy, and its regulated state has not been
 *   set;
 */
export function denyCapId(options: DenyCapIdOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'deny_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsSupplyFixedArguments {
	currency: RawTransactionArgument<string>;
}
export interface IsSupplyFixedOptions {
	package: string;
	arguments: IsSupplyFixedArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check if the supply is fixed. */
export function isSupplyFixed(options: IsSupplyFixedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_supply_fixed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsSupplyBurnOnlyArguments {
	currency: RawTransactionArgument<string>;
}
export interface IsSupplyBurnOnlyOptions {
	package: string;
	arguments: IsSupplyBurnOnlyArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check if the supply is burn-only. */
export function isSupplyBurnOnly(options: IsSupplyBurnOnlyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_supply_burn_only',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsRegulatedArguments {
	currency: RawTransactionArgument<string>;
}
export interface IsRegulatedOptions {
	package: string;
	arguments: IsRegulatedArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check if the currency is regulated. */
export function isRegulated(options: IsRegulatedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_regulated',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TotalSupplyArguments {
	currency: RawTransactionArgument<string>;
}
export interface TotalSupplyOptions {
	package: string;
	arguments: TotalSupplyArguments | [currency: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Get the total supply for the `Currency<T>` if the Supply is in fixed or
 * burn-only state. Returns `None` if the SupplyState is Unknown.
 */
export function totalSupply(options: TotalSupplyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['currency'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'total_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExistsArguments {
	registry: RawTransactionArgument<string>;
}
export interface ExistsOptions {
	package: string;
	arguments: ExistsArguments | [registry: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check if coin data exists for the given type T in the registry. */
export function exists(options: ExistsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
