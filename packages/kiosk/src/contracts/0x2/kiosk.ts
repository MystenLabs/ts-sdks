/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance from './balance.js';
const $moduleName = '0x2::kiosk';
export const Kiosk = new MoveStruct({
	name: `${$moduleName}::Kiosk`,
	fields: {
		id: bcs.Address,
		profits: balance.Balance,
		owner: bcs.Address,
		item_count: bcs.u32(),
		allow_extensions: bcs.bool(),
	},
});
export const KioskOwnerCap = new MoveStruct({
	name: `${$moduleName}::KioskOwnerCap`,
	fields: {
		id: bcs.Address,
		for: bcs.Address,
	},
});
export const PurchaseCap = new MoveStruct({
	name: `${$moduleName}::PurchaseCap<phantom T0>`,
	fields: {
		id: bcs.Address,
		kiosk_id: bcs.Address,
		item_id: bcs.Address,
		min_price: bcs.u64(),
	},
});
export const Borrow = new MoveStruct({
	name: `${$moduleName}::Borrow`,
	fields: {
		kiosk_id: bcs.Address,
		item_id: bcs.Address,
	},
});
export const Item = new MoveStruct({
	name: `${$moduleName}::Item`,
	fields: {
		id: bcs.Address,
	},
});
export const Listing = new MoveStruct({
	name: `${$moduleName}::Listing`,
	fields: {
		id: bcs.Address,
		is_exclusive: bcs.bool(),
	},
});
export const Lock = new MoveStruct({
	name: `${$moduleName}::Lock`,
	fields: {
		id: bcs.Address,
	},
});
export const ItemListed = new MoveStruct({
	name: `${$moduleName}::ItemListed<phantom T0>`,
	fields: {
		kiosk: bcs.Address,
		id: bcs.Address,
		price: bcs.u64(),
	},
});
export const ItemPurchased = new MoveStruct({
	name: `${$moduleName}::ItemPurchased<phantom T0>`,
	fields: {
		kiosk: bcs.Address,
		id: bcs.Address,
		price: bcs.u64(),
	},
});
export const ItemDelisted = new MoveStruct({
	name: `${$moduleName}::ItemDelisted<phantom T0>`,
	fields: {
		kiosk: bcs.Address,
		id: bcs.Address,
	},
});
export interface DefaultOptions {
	package?: string;
	arguments?: [];
}
export function _default(options: DefaultOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'default',
		});
}
export interface NewOptions {
	package?: string;
	arguments?: [];
}
export function _new(options: NewOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'new',
		});
}
export interface CloseAndWithdrawOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function closeAndWithdraw(options: CloseAndWithdrawOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'close_and_withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface SetOwnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function setOwner(options: SetOwnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'set_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface SetOwnerCustomOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
}
export function setOwnerCustom(options: SetOwnerCustomOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, 'address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'set_owner_custom',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PlaceOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<T0>,
	];
	typeArguments: [string];
}
export function place<T0 extends BcsType<any>>(options: PlaceOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'place',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface LockOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<T0>,
	];
	typeArguments: [string];
}
export function lock<T0 extends BcsType<any>>(options: LockOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, null, `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'lock',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface TakeOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function take(options: TakeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'take',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ListOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
	];
	typeArguments: [string];
}
export function list(options: ListOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x2::object::ID', 'u64'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'list',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceAndListOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<T0>,
		RawTransactionArgument<number | bigint>,
	];
	typeArguments: [string];
}
export function placeAndList<T0 extends BcsType<any>>(options: PlaceAndListOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, `${options.typeArguments[0]}`, 'u64'] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'place_and_list',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DelistOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function delist(options: DelistOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'delist',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PurchaseOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function purchase(options: PurchaseOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x2::object::ID', null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ListWithPurchaseCapOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
	];
	typeArguments: [string];
}
export function listWithPurchaseCap(options: ListWithPurchaseCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x2::object::ID', 'u64'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'list_with_purchase_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PurchaseWithCapOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function purchaseWithCap(options: PurchaseWithCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase_with_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ReturnPurchaseCapOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function returnPurchaseCap(options: ReturnPurchaseCapOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'return_purchase_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint | null>,
	];
}
export function withdraw(options: WithdrawOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x1::option::Option<u64>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface HasItemOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function hasItem(options: HasItemOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'has_item',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface HasItemWithTypeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	typeArguments: [string];
}
export function hasItemWithType(options: HasItemWithTypeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'has_item_with_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsLockedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function isLocked(options: IsLockedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'is_locked',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IsListedOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function isListed(options: IsListedOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'is_listed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IsListedExclusivelyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function isListedExclusively(options: IsListedExclusivelyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'is_listed_exclusively',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface HasAccessOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function hasAccess(options: HasAccessOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'has_access',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UidMutAsOwnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function uidMutAsOwner(options: UidMutAsOwnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'uid_mut_as_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface SetAllowExtensionsOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<boolean>,
	];
}
export function setAllowExtensions(options: SetAllowExtensionsOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'set_allow_extensions',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UidOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function uid(options: UidOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'uid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UidMutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function uidMut(options: UidMutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'uid_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface OwnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function owner(options: OwnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ItemCountOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function itemCount(options: ItemCountOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'item_count',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ProfitsAmountOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function profitsAmount(options: ProfitsAmountOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'profits_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ProfitsMutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function profitsMut(options: ProfitsMutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'profits_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface BorrowOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function borrow(options: BorrowOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function borrowMut(options: BorrowMutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowValOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function borrowVal(options: BorrowValOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'borrow_val',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ReturnValOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<T0>,
		RawTransactionArgument<string>,
	];
	typeArguments: [string];
}
export function returnVal<T0 extends BcsType<any>>(options: ReturnValOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'return_val',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface KioskOwnerCapForOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function kioskOwnerCapFor(options: KioskOwnerCapForOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'kiosk_owner_cap_for',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PurchaseCapKioskOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function purchaseCapKiosk(options: PurchaseCapKioskOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase_cap_kiosk',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PurchaseCapItemOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function purchaseCapItem(options: PurchaseCapItemOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase_cap_item',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PurchaseCapMinPriceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function purchaseCapMinPrice(options: PurchaseCapMinPriceOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase_cap_min_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
