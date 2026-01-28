/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	MoveEnum,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as type_name from './deps/0x0000000000000000000000000000000000000000000000000000000000000001/type_name.js';
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
export const ExtraField = new MoveStruct({
	name: `${$moduleName}::ExtraField`,
	fields: {
		pos0: type_name.TypeName,
		pos1: bcs.vector(bcs.u8()),
	},
});
export const CurrencyKey = new MoveStruct({
	name: `${$moduleName}::CurrencyKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const LegacyMetadataKey = new MoveStruct({
	name: `${$moduleName}::LegacyMetadataKey`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const MetadataCap = new MoveStruct({
	name: `${$moduleName}::MetadataCap`,
	fields: {
		id: bcs.Address,
	},
});
export const Borrow = new MoveStruct({
	name: `${$moduleName}::Borrow`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const SupplyState = new MoveEnum({
	name: `${$moduleName}::SupplyState`,
	fields: {
		Fixed: balance.Supply,
		BurnOnly: balance.Supply,
		Unknown: null,
	},
});
export const RegulatedState = new MoveEnum({
	name: `${$moduleName}::RegulatedState`,
	fields: {
		Regulated: new MoveStruct({
			name: `RegulatedState.Regulated`,
			fields: {
				cap: bcs.Address,
				allow_global_pause: bcs.option(bcs.bool()),
				variant: bcs.u8(),
			},
		}),
		Unregulated: null,
		Unknown: null,
	},
});
export const MetadataCapState = new MoveEnum({
	name: `${$moduleName}::MetadataCapState`,
	fields: {
		Claimed: bcs.Address,
		Unclaimed: null,
		Deleted: null,
	},
});
export const Currency = new MoveStruct({
	name: `${$moduleName}::Currency`,
	fields: {
		id: bcs.Address,
		decimals: bcs.u8(),
		name: bcs.string(),
		symbol: bcs.string(),
		description: bcs.string(),
		icon_url: bcs.string(),
		supply: bcs.option(SupplyState),
		regulated: RegulatedState,
		treasury_cap_id: bcs.option(bcs.Address),
		metadata_cap_id: MetadataCapState,
		extra_fields: vec_map.VecMap(bcs.string(), ExtraField),
	},
});
export const CurrencyInitializer = new MoveStruct({
	name: `${$moduleName}::CurrencyInitializer`,
	fields: {
		currency: Currency,
		extra_fields: bag.Bag,
		is_otw: bcs.bool(),
	},
});
export interface NewCurrencyOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function newCurrency(options: NewCurrencyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		null,
		'u8',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'new_currency',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface NewCurrencyWithOtwOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<T0>,
		RawTransactionArgument<number>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function newCurrencyWithOtw<T0 extends BcsType<any>>(
	options: NewCurrencyWithOtwOptions<T0>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		'u8',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
		'0x1::string::String',
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'new_currency_with_otw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ClaimMetadataCapOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function claimMetadataCap(options: ClaimMetadataCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'claim_metadata_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MakeRegulatedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<boolean>];
	typeArguments: [string];
}
export function makeRegulated(options: MakeRegulatedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, 'bool'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_regulated',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MakeSupplyFixedInitOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function makeSupplyFixedInit(options: MakeSupplyFixedInitOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_supply_fixed_init',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MakeSupplyBurnOnlyInitOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function makeSupplyBurnOnlyInit(options: MakeSupplyBurnOnlyInitOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_supply_burn_only_init',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MakeSupplyFixedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function makeSupplyFixed(options: MakeSupplyFixedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_supply_fixed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MakeSupplyBurnOnlyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function makeSupplyBurnOnly(options: MakeSupplyBurnOnlyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'make_supply_burn_only',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FinalizeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function finalize(options: FinalizeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'finalize',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FinalizeAndDeleteMetadataCapOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function finalizeAndDeleteMetadataCap(options: FinalizeAndDeleteMetadataCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'finalize_and_delete_metadata_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FinalizeRegistrationOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function finalizeRegistration(options: FinalizeRegistrationOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'finalize_registration',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DeleteMetadataCapOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function deleteMetadataCap(options: DeleteMetadataCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'delete_metadata_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BurnOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function burn(options: BurnOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'burn',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BurnBalanceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function burnBalance(options: BurnBalanceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'burn_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SetNameOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function setName(options: SetNameOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'set_name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SetDescriptionOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function setDescription(options: SetDescriptionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'set_description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SetIconUrlOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function setIconUrl(options: SetIconUrlOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x1::string::String'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'set_icon_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SetTreasuryCapIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function setTreasuryCapId(options: SetTreasuryCapIdOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'set_treasury_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MigrateLegacyMetadataOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function migrateLegacyMetadata(options: MigrateLegacyMetadataOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'migrate_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateFromLegacyMetadataOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function updateFromLegacyMetadata(options: UpdateFromLegacyMetadataOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'update_from_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DeleteMigratedLegacyMetadataOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function deleteMigratedLegacyMetadata(options: DeleteMigratedLegacyMetadataOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
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
export interface MigrateRegulatedStateByMetadataOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function migrateRegulatedStateByMetadata(options: MigrateRegulatedStateByMetadataOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'migrate_regulated_state_by_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MigrateRegulatedStateByCapOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function migrateRegulatedStateByCap(options: MigrateRegulatedStateByCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'migrate_regulated_state_by_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowLegacyMetadataOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function borrowLegacyMetadata(options: BorrowLegacyMetadataOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'borrow_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ReturnBorrowedLegacyMetadataOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function returnBorrowedLegacyMetadata(options: ReturnBorrowedLegacyMetadataOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'return_borrowed_legacy_metadata',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DecimalsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function decimals(options: DecimalsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'decimals',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface NameOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function name(options: NameOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'name',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SymbolOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function symbol(options: SymbolOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'symbol',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DescriptionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function description(options: DescriptionOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'description',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IconUrlOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function iconUrl(options: IconUrlOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'icon_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsMetadataCapClaimedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isMetadataCapClaimed(options: IsMetadataCapClaimedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_metadata_cap_claimed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsMetadataCapDeletedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isMetadataCapDeleted(options: IsMetadataCapDeletedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_metadata_cap_deleted',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface MetadataCapIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function metadataCapId(options: MetadataCapIdOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'metadata_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface TreasuryCapIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function treasuryCapId(options: TreasuryCapIdOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'treasury_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DenyCapIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function denyCapId(options: DenyCapIdOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'deny_cap_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsSupplyFixedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isSupplyFixed(options: IsSupplyFixedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_supply_fixed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsSupplyBurnOnlyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isSupplyBurnOnly(options: IsSupplyBurnOnlyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_supply_burn_only',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsRegulatedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isRegulated(options: IsRegulatedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'is_regulated',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface TotalSupplyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function totalSupply(options: TotalSupplyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'total_supply',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ExistsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function exists(options: ExistsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'coin_registry',
			function: 'exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
