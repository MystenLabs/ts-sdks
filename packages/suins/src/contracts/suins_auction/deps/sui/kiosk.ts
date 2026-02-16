/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Kiosk is a primitive for building safe, decentralized and trustless trading
 * experiences. It allows storing and trading any types of assets as long as the
 * creator of these assets implements a `TransferPolicy` for them.
 *
 * ### Principles and philosophy:
 *
 * - Kiosk provides guarantees of "true ownership"; - just like single owner
 *   objects, assets stored in the Kiosk can only be managed by the Kiosk owner.
 *   Only the owner can `place`, `take`, `list`, perform any other actions on
 *   assets in the Kiosk.
 *
 * - Kiosk aims to be generic - allowing for a small set of default behaviors and
 *   not imposing any restrictions on how the assets can be traded. The only
 *   default scenario is a `list` + `purchase` flow; any other trading logic can be
 *   implemented on top using the `list_with_purchase_cap` (and a matching
 *   `purchase_with_cap`) flow.
 *
 * - For every transaction happening with a third party a `TransferRequest` is
 *   created - this way creators are fully in control of the trading experience.
 *
 * ### Asset states in the Kiosk:
 *
 * - `placed` - An asset is `place`d into the Kiosk and can be `take`n out by the
 *   Kiosk owner; it's freely tradable and modifiable via the `borrow_mut` and
 *   `borrow_val` functions.
 *
 * - `locked` - Similar to `placed` except that `take` is disabled and the only way
 *   to move the asset out of the Kiosk is to `list` it or `list_with_purchase_cap`
 *   therefore performing a trade (issuing a `TransferRequest`). The check on the
 *   `lock` function makes sure that the `TransferPolicy` exists to not lock the
 *   item in a `Kiosk` forever.
 *
 * - `listed` - A `place`d or a `lock`ed item can be `list`ed for a fixed price
 *   allowing anyone to `purchase` it from the Kiosk. While listed, an item can not
 *   be taken or modified. However, an immutable borrow via `borrow` call is still
 *   available. The `delist` function returns the asset to the previous state.
 *
 * - `listed_exclusively` - An item is listed via the `list_with_purchase_cap`
 *   function (and a `PurchaseCap` is created). While listed this way, an item can
 *   not be `delist`-ed unless a `PurchaseCap` is returned. All actions available
 *   at this item state require a `PurchaseCap`:
 *
 * 1.  `purchase_with_cap` - to purchase the item for a price equal or higher than
 *     the `min_price` set in the `PurchaseCap`.
 * 2.  `return_purchase_cap` - to return the `PurchaseCap` and return the asset
 *     into the previous state.
 *
 * When an item is listed exclusively it cannot be modified nor taken and losing a
 * `PurchaseCap` would lock the item in the Kiosk forever. Therefore, it is
 * recommended to only use `PurchaseCap` functionality in trusted applications and
 * not use it for direct trading (eg sending to another account).
 *
 * ### Using multiple Transfer Policies for different "tracks":
 *
 * Every `purchase` or `purchase_with_purchase_cap` creates a `TransferRequest` hot
 * potato which must be resolved in a matching `TransferPolicy` for the transaction
 * to pass. While the default scenario implies that there should be a single
 * `TransferPolicy<T>` for `T`; it is possible to have multiple, each one having
 * its own set of rules.
 *
 * ### Examples:
 *
 * - I create one `TransferPolicy` with "Royalty Rule" for everyone
 * - I create a special `TransferPolicy` for bearers of a "Club Membership" object
 *   so they don't have to pay anything
 * - I create and wrap a `TransferPolicy` so that players of my game can transfer
 *   items between `Kiosk`s in game without any charge (and maybe not even paying
 *   the price with a 0 SUI PurchaseCap)
 *
 * ```
 * Kiosk -> (Item, TransferRequest)
 * ... TransferRequest ------> Common Transfer Policy
 * ... TransferRequest ------> In-game Wrapped Transfer Policy
 * ... TransferRequest ------> Club Membership Transfer Policy
 * ```
 *
 * See `transfer_policy` module for more details on how they function.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as balance from './balance.js';
const $moduleName = '0x2::kiosk';
export const Kiosk = new MoveStruct({
	name: `${$moduleName}::Kiosk`,
	fields: {
		id: bcs.Address,
		/** Balance of the Kiosk - all profits from sales go here. */
		profits: balance.Balance,
		/**
		 * Always point to `sender` of the transaction. Can be changed by calling
		 * `set_owner` with Cap.
		 */
		owner: bcs.Address,
		/**
		 * Number of items stored in a Kiosk. Used to allow unpacking an empty Kiosk if it
		 * was wrapped or has a single owner.
		 */
		item_count: bcs.u32(),
		/**
		 * [DEPRECATED] Please, don't use the `allow_extensions` and the matching
		 * `set_allow_extensions` function - it is a legacy feature that is being replaced
		 * by the `kiosk_extension` module and its Extensions API.
		 *
		 * Exposes `uid_mut` publicly when set to `true`, set to `false` by default.
		 */
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
	name: `${$moduleName}::PurchaseCap<phantom T>`,
	fields: {
		id: bcs.Address,
		/** ID of the `Kiosk` the cap belongs to. */
		kiosk_id: bcs.Address,
		/** ID of the listed item. */
		item_id: bcs.Address,
		/** Minimum price for which the item can be purchased. */
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
	name: `${$moduleName}::ItemListed<phantom T>`,
	fields: {
		kiosk: bcs.Address,
		id: bcs.Address,
		price: bcs.u64(),
	},
});
export const ItemPurchased = new MoveStruct({
	name: `${$moduleName}::ItemPurchased<phantom T>`,
	fields: {
		kiosk: bcs.Address,
		id: bcs.Address,
		price: bcs.u64(),
	},
});
export const ItemDelisted = new MoveStruct({
	name: `${$moduleName}::ItemDelisted<phantom T>`,
	fields: {
		kiosk: bcs.Address,
		id: bcs.Address,
	},
});
export interface DefaultOptions {
	package: string;
	arguments?: [];
}
/**
 * Creates a new Kiosk in a default configuration: sender receives the
 * `KioskOwnerCap` and becomes the Owner, the `Kiosk` is shared.
 */
export function _default(options: DefaultOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'default',
		});
}
export interface NewOptions {
	package: string;
	arguments?: [];
}
/** Creates a new `Kiosk` with a matching `KioskOwnerCap`. */
export function _new(options: NewOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'new',
		});
}
export interface CloseAndWithdrawArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface CloseAndWithdrawOptions {
	package: string;
	arguments:
		| CloseAndWithdrawArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/**
 * Unpacks and destroys a Kiosk returning the profits (even if "0"). Can only be
 * performed by the bearer of the `KioskOwnerCap` in the case where there's no
 * items inside and a `Kiosk` is not shared.
 */
export function closeAndWithdraw(options: CloseAndWithdrawOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'close_and_withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetOwnerArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface SetOwnerOptions {
	package: string;
	arguments:
		| SetOwnerArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/**
 * Change the `owner` field to the transaction sender. The change is purely
 * cosmetical and does not affect any of the basic kiosk functions unless some
 * logic for this is implemented in a third party module.
 */
export function setOwner(options: SetOwnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'set_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetOwnerCustomArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	owner: RawTransactionArgument<string>;
}
export interface SetOwnerCustomOptions {
	package: string;
	arguments:
		| SetOwnerCustomArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				owner: RawTransactionArgument<string>,
		  ];
}
/**
 * Update the `owner` field with a custom address. Can be used for implementing a
 * custom logic that relies on the `Kiosk` owner.
 */
export function setOwnerCustom(options: SetOwnerCustomOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, 'address'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'set_owner_custom',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PlaceArguments<T extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	item: RawTransactionArgument<T>;
}
export interface PlaceOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| PlaceArguments<T>
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				item: RawTransactionArgument<T>,
		  ];
	typeArguments: [string];
}
/**
 * Place any object into a Kiosk. Performs an authorization check to make sure only
 * owner can do that.
 */
export function place<T extends BcsType<any>>(options: PlaceOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'item'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'place',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LockArguments<T extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	Policy: RawTransactionArgument<string>;
	item: RawTransactionArgument<T>;
}
export interface LockOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| LockArguments<T>
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				Policy: RawTransactionArgument<string>,
				item: RawTransactionArgument<T>,
		  ];
	typeArguments: [string];
}
/**
 * Place an item to the `Kiosk` and issue a `Lock` for it. Once placed this way, an
 * item can only be listed either with a `list` function or with a
 * `list_with_purchase_cap`.
 *
 * Requires policy for `T` to make sure that there's an issued `TransferPolicy` and
 * the item can be sold, otherwise the asset might be locked forever.
 */
export function lock<T extends BcsType<any>>(options: LockOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, null, `${options.typeArguments[0]}`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'cap', 'Policy', 'item'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'lock',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TakeArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface TakeOptions {
	package: string;
	arguments:
		| TakeArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				id: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Take any object from the Kiosk. Performs an authorization check to make sure
 * only owner can do that.
 */
export function take(options: TakeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'take',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ListArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
	price: RawTransactionArgument<number | bigint>;
}
export interface ListOptions {
	package: string;
	arguments:
		| ListArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				id: RawTransactionArgument<string>,
				price: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * List the item by setting a price and making it available for purchase. Performs
 * an authorization check to make sure only owner can sell.
 */
export function list(options: ListOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::object::ID', 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'id', 'price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'list',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceAndListArguments<T extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	item: RawTransactionArgument<T>;
	price: RawTransactionArgument<number | bigint>;
}
export interface PlaceAndListOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| PlaceAndListArguments<T>
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				item: RawTransactionArgument<T>,
				price: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/** Calls `place` and `list` together - simplifies the flow. */
export function placeAndList<T extends BcsType<any>>(options: PlaceAndListOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, `${options.typeArguments[0]}`, 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'cap', 'item', 'price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'place_and_list',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DelistArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface DelistOptions {
	package: string;
	arguments:
		| DelistArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				id: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Remove an existing listing from the `Kiosk` and keep the item in the user Kiosk.
 * Can only be performed by the owner of the `Kiosk`.
 */
export function delist(options: DelistOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'delist',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PurchaseArguments {
	self: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface PurchaseOptions {
	package: string;
	arguments:
		| PurchaseArguments
		| [
				self: RawTransactionArgument<string>,
				id: RawTransactionArgument<string>,
				payment: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Make a trade: pay the owner of the item and request a Transfer to the `target`
 * kiosk (to prevent item being taken by the approving party).
 *
 * Received `TransferRequest` needs to be handled by the publisher of the T, if
 * they have a method implemented that allows a trade, it is possible to request
 * their approval (by calling some function) so that the trade can be finalized.
 */
export function purchase(options: PurchaseOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x2::object::ID', null] satisfies (string | null)[];
	const parameterNames = ['self', 'id', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ListWithPurchaseCapArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
	minPrice: RawTransactionArgument<number | bigint>;
}
export interface ListWithPurchaseCapOptions {
	package: string;
	arguments:
		| ListWithPurchaseCapArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				id: RawTransactionArgument<string>,
				minPrice: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Creates a `PurchaseCap` which gives the right to purchase an item for any price
 * equal or higher than the `min_price`.
 */
export function listWithPurchaseCap(options: ListWithPurchaseCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::object::ID', 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'id', 'minPrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'list_with_purchase_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PurchaseWithCapArguments {
	self: RawTransactionArgument<string>;
	purchaseCap: RawTransactionArgument<string>;
	payment: RawTransactionArgument<string>;
}
export interface PurchaseWithCapOptions {
	package: string;
	arguments:
		| PurchaseWithCapArguments
		| [
				self: RawTransactionArgument<string>,
				purchaseCap: RawTransactionArgument<string>,
				payment: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Unpack the `PurchaseCap` and call `purchase`. Sets the payment amount as the
 * price for the listing making sure it's no less than `min_amount`.
 */
export function purchaseWithCap(options: PurchaseWithCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'purchaseCap', 'payment'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase_with_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReturnPurchaseCapArguments {
	self: RawTransactionArgument<string>;
	purchaseCap: RawTransactionArgument<string>;
}
export interface ReturnPurchaseCapOptions {
	package: string;
	arguments:
		| ReturnPurchaseCapArguments
		| [self: RawTransactionArgument<string>, purchaseCap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Return the `PurchaseCap` without making a purchase; remove an active offer and
 * allow the item for taking. Can only be returned to its `Kiosk`, aborts
 * otherwise.
 */
export function returnPurchaseCap(options: ReturnPurchaseCapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'purchaseCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'return_purchase_cap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint | null>;
}
export interface WithdrawOptions {
	package: string;
	arguments:
		| WithdrawArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint | null>,
		  ];
}
/** Withdraw profits from the Kiosk. */
export function withdraw(options: WithdrawOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x1::option::Option<u64>'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasItemArguments {
	self: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface HasItemOptions {
	package: string;
	arguments:
		| HasItemArguments
		| [self: RawTransactionArgument<string>, id: RawTransactionArgument<string>];
}
/** Check whether the `item` is present in the `Kiosk`. */
export function hasItem(options: HasItemOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'has_item',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasItemWithTypeArguments {
	self: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface HasItemWithTypeOptions {
	package: string;
	arguments:
		| HasItemWithTypeArguments
		| [self: RawTransactionArgument<string>, id: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check whether the `item` is present in the `Kiosk` and has type T. */
export function hasItemWithType(options: HasItemWithTypeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'has_item_with_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsLockedArguments {
	self: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface IsLockedOptions {
	package: string;
	arguments:
		| IsLockedArguments
		| [self: RawTransactionArgument<string>, id: RawTransactionArgument<string>];
}
/**
 * Check whether an item with the `id` is locked in the `Kiosk`. Meaning that the
 * only two actions that can be performed on it are `list` and
 * `list_with_purchase_cap`, it cannot be `take`n out of the `Kiosk`.
 */
export function isLocked(options: IsLockedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'is_locked',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsListedArguments {
	self: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface IsListedOptions {
	package: string;
	arguments:
		| IsListedArguments
		| [self: RawTransactionArgument<string>, id: RawTransactionArgument<string>];
}
/** Check whether an `item` is listed (exclusively or non exclusively). */
export function isListed(options: IsListedOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'is_listed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsListedExclusivelyArguments {
	self: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface IsListedExclusivelyOptions {
	package: string;
	arguments:
		| IsListedExclusivelyArguments
		| [self: RawTransactionArgument<string>, id: RawTransactionArgument<string>];
}
/** Check whether there's a `PurchaseCap` issued for an item. */
export function isListedExclusively(options: IsListedExclusivelyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'is_listed_exclusively',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasAccessArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface HasAccessOptions {
	package: string;
	arguments:
		| HasAccessArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/** Check whether the `KioskOwnerCap` matches the `Kiosk`. */
export function hasAccess(options: HasAccessOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'has_access',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UidMutAsOwnerArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface UidMutAsOwnerOptions {
	package: string;
	arguments:
		| UidMutAsOwnerArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/** Access the `UID` using the `KioskOwnerCap`. */
export function uidMutAsOwner(options: UidMutAsOwnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'uid_mut_as_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetAllowExtensionsArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	allowExtensions: RawTransactionArgument<boolean>;
}
export interface SetAllowExtensionsOptions {
	package: string;
	arguments:
		| SetAllowExtensionsArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				allowExtensions: RawTransactionArgument<boolean>,
		  ];
}
/**
 * [DEPRECATED] Allow or disallow `uid` and `uid_mut` access via the
 * `allow_extensions` setting.
 */
export function setAllowExtensions(options: SetAllowExtensionsOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, 'bool'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'allowExtensions'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'set_allow_extensions',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UidArguments {
	self: RawTransactionArgument<string>;
}
export interface UidOptions {
	package: string;
	arguments: UidArguments | [self: RawTransactionArgument<string>];
}
/**
 * Get the immutable `UID` for dynamic field access. Always enabled.
 *
 * Given the &UID can be used for reading keys and authorization, its access
 */
export function uid(options: UidOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'uid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UidMutArguments {
	self: RawTransactionArgument<string>;
}
export interface UidMutOptions {
	package: string;
	arguments: UidMutArguments | [self: RawTransactionArgument<string>];
}
/**
 * Get the mutable `UID` for dynamic field access and extensions. Aborts if
 * `allow_extensions` set to `false`.
 */
export function uidMut(options: UidMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'uid_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OwnerArguments {
	self: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package: string;
	arguments: OwnerArguments | [self: RawTransactionArgument<string>];
}
/** Get the owner of the Kiosk. */
export function owner(options: OwnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ItemCountArguments {
	self: RawTransactionArgument<string>;
}
export interface ItemCountOptions {
	package: string;
	arguments: ItemCountArguments | [self: RawTransactionArgument<string>];
}
/** Get the number of items stored in a Kiosk. */
export function itemCount(options: ItemCountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'item_count',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProfitsAmountArguments {
	self: RawTransactionArgument<string>;
}
export interface ProfitsAmountOptions {
	package: string;
	arguments: ProfitsAmountArguments | [self: RawTransactionArgument<string>];
}
/** Get the amount of profits collected by selling items. */
export function profitsAmount(options: ProfitsAmountOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'profits_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProfitsMutArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface ProfitsMutOptions {
	package: string;
	arguments:
		| ProfitsMutArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
}
/** Get mutable access to `profits` - owner only action. */
export function profitsMut(options: ProfitsMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'profits_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BorrowArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface BorrowOptions {
	package: string;
	arguments:
		| BorrowArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				id: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Immutably borrow an item from the `Kiosk`. Any item can be `borrow`ed at any
 * time.
 */
export function borrow(options: BorrowOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface BorrowMutOptions {
	package: string;
	arguments:
		| BorrowMutArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				id: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Mutably borrow an item from the `Kiosk`. Item can be `borrow_mut`ed only if it's
 * not `is_listed`.
 */
export function borrowMut(options: BorrowMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowValArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	id: RawTransactionArgument<string>;
}
export interface BorrowValOptions {
	package: string;
	arguments:
		| BorrowValArguments
		| [
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				id: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Take the item from the `Kiosk` with a guarantee that it will be returned. Item
 * can be `borrow_val`-ed only if it's not `is_listed`.
 */
export function borrowVal(options: BorrowValOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'cap', 'id'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'borrow_val',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReturnValArguments<T extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	item: RawTransactionArgument<T>;
	borrow: RawTransactionArgument<string>;
}
export interface ReturnValOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| ReturnValArguments<T>
		| [
				self: RawTransactionArgument<string>,
				item: RawTransactionArgument<T>,
				borrow: RawTransactionArgument<string>,
		  ];
	typeArguments: [string];
}
/**
 * Return the borrowed item to the `Kiosk`. This method cannot be avoided if
 * `borrow_val` is used.
 */
export function returnVal<T extends BcsType<any>>(options: ReturnValOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`, null] satisfies (string | null)[];
	const parameterNames = ['self', 'item', 'borrow'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'return_val',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface KioskOwnerCapForArguments {
	cap: RawTransactionArgument<string>;
}
export interface KioskOwnerCapForOptions {
	package: string;
	arguments: KioskOwnerCapForArguments | [cap: RawTransactionArgument<string>];
}
/** Get the `for` field of the `KioskOwnerCap`. */
export function kioskOwnerCapFor(options: KioskOwnerCapForOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'kiosk_owner_cap_for',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PurchaseCapKioskArguments {
	self: RawTransactionArgument<string>;
}
export interface PurchaseCapKioskOptions {
	package: string;
	arguments: PurchaseCapKioskArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the `kiosk_id` from the `PurchaseCap`. */
export function purchaseCapKiosk(options: PurchaseCapKioskOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase_cap_kiosk',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PurchaseCapItemArguments {
	self: RawTransactionArgument<string>;
}
export interface PurchaseCapItemOptions {
	package: string;
	arguments: PurchaseCapItemArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the `Item_id` from the `PurchaseCap`. */
export function purchaseCapItem(options: PurchaseCapItemOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase_cap_item',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PurchaseCapMinPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface PurchaseCapMinPriceOptions {
	package: string;
	arguments: PurchaseCapMinPriceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Get the `min_price` from the `PurchaseCap`. */
export function purchaseCapMinPrice(options: PurchaseCapMinPriceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk',
			function: 'purchase_cap_min_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
