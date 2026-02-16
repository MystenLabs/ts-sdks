/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * This module implements the Kiosk Extensions functionality. It allows exposing
 * previously protected (only-owner) methods to third-party apps.
 *
 * A Kiosk Extension is a module that implements any functionality on top of the
 * `Kiosk` without discarding nor blocking the base. Given that `Kiosk` itself is a
 * trading primitive, most of the extensions are expected to be related to trading.
 * However, there's no limit to what can be built using the `kiosk_extension`
 * module, as it gives certain benefits such as using `Kiosk` as the storage for
 * any type of data / assets.
 *
 * ### Flow:
 *
 * - An extension can only be installed by the Kiosk Owner and requires an
 *   authorization via the `KioskOwnerCap`.
 * - When installed, the extension is given a permission bitmap that allows it to
 *   perform certain protected actions (eg `place`, `lock`). However, it is
 *   possible to install an extension that does not have any permissions.
 * - Kiosk Owner can `disable` the extension at any time, which prevents it from
 *   performing any protected actions. The storage is still available to the
 *   extension until it is completely removed.
 * - A disabled extension can be `enable`d at any time giving the permissions back
 *   to the extension.
 * - An extension permissions follow the all-or-nothing policy. Either all of the
 *   requested permissions are granted or none of them (can't install).
 *
 * ### Examples:
 *
 * - An Auction extension can utilize the storage to store Auction-related data
 *   while utilizing the same `Kiosk` object that the items are stored in.
 * - A Marketplace extension that implements custom events and fees for the default
 *   trading functionality.
 *
 * ### Notes:
 *
 * - Trading functionality can utilize the `PurchaseCap` to build a custom logic
 *   around the purchase flow. However, it should be carefully managed to prevent
 *   asset locking.
 * - `kiosk_extension` is a friend module to `kiosk` and has access to its internal
 *   functions (such as `place_internal` and `lock_internal` to implement custom
 *   authorization scheme for `place` and `lock` respectively).
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as bag from './bag.js';
const $moduleName = '0x2::kiosk_extension';
export const Extension = new MoveStruct({
	name: `${$moduleName}::Extension`,
	fields: {
		/**
		 * Storage for the extension, an isolated Bag. By putting the extension into a
		 * single dynamic field, we reduce the amount of fields on the top level (eg items
		 * / listings) while giving extension developers the ability to store any data they
		 * want.
		 */
		storage: bag.Bag,
		/**
		 * Bitmap of permissions that the extension has (can be revoked any moment). It's
		 * all or nothing policy - either the extension has the required permissions or no
		 * permissions at all.
		 *
		 * 1st bit - `place` - allows to place items for sale 2nd bit - `lock` and
		 * `place` - allows to lock items (and place)
		 *
		 * For example:
		 *
		 * - `10` - allows to place items and lock them.
		 * - `11` - allows to place items and lock them (`lock` includes `place`).
		 * - `01` - allows to place items, but not lock them.
		 * - `00` - no permissions.
		 */
		permissions: bcs.u128(),
		/**
		 * Whether the extension can call protected actions. By default, all extensions are
		 * enabled (on `add` call), however the Kiosk owner can disable them at any time.
		 *
		 * Disabling the extension does not limit its access to the storage.
		 */
		is_enabled: bcs.bool(),
	},
});
export const ExtensionKey = new MoveStruct({
	name: `${$moduleName}::ExtensionKey<phantom Ext>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface AddArguments<Ext extends BcsType<any>> {
	Ext: RawTransactionArgument<Ext>;
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	permissions: RawTransactionArgument<number | bigint>;
}
export interface AddOptions<Ext extends BcsType<any>> {
	package: string;
	arguments:
		| AddArguments<Ext>
		| [
				Ext: RawTransactionArgument<Ext>,
				self: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				permissions: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Add an extension to the Kiosk. Can only be performed by the owner. The extension
 * witness is required to allow extensions define their set of permissions in the
 * custom `add` call.
 */
export function add<Ext extends BcsType<any>>(options: AddOptions<Ext>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`, null, null, 'u128'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['Ext', 'self', 'cap', 'permissions'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DisableArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface DisableOptions {
	package: string;
	arguments:
		| DisableArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Revoke permissions from the extension. While it does not remove the extension
 * completely, it keeps it from performing any protected actions. The storage is
 * still available to the extension (until it's removed).
 */
export function disable(options: DisableOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'disable',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface EnableArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface EnableOptions {
	package: string;
	arguments:
		| EnableArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Re-enable the extension allowing it to call protected actions (eg `place`,
 * `lock`). By default, all added extensions are enabled. Kiosk owner can disable
 * them via `disable` call.
 */
export function enable(options: EnableOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'enable',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveArguments {
	self: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface RemoveOptions {
	package: string;
	arguments:
		| RemoveArguments
		| [self: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Remove an extension from the Kiosk. Can only be performed by the owner, the
 * extension storage must be empty for the transaction to succeed.
 */
export function remove(options: RemoveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface StorageArguments<Ext extends BcsType<any>> {
	Ext: RawTransactionArgument<Ext>;
	self: RawTransactionArgument<string>;
}
export interface StorageOptions<Ext extends BcsType<any>> {
	package: string;
	arguments:
		| StorageArguments<Ext>
		| [Ext: RawTransactionArgument<Ext>, self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Get immutable access to the extension storage. Can only be performed by the
 * extension as long as the extension is installed.
 */
export function storage<Ext extends BcsType<any>>(options: StorageOptions<Ext>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`, null] satisfies (string | null)[];
	const parameterNames = ['Ext', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'storage',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface StorageMutArguments<Ext extends BcsType<any>> {
	Ext: RawTransactionArgument<Ext>;
	self: RawTransactionArgument<string>;
}
export interface StorageMutOptions<Ext extends BcsType<any>> {
	package: string;
	arguments:
		| StorageMutArguments<Ext>
		| [Ext: RawTransactionArgument<Ext>, self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Get mutable access to the extension storage. Can only be performed by the
 * extension as long as the extension is installed. Disabling the extension does
 * not prevent it from accessing the storage.
 *
 * Potentially dangerous: extension developer can keep data in a Bag therefore
 * never really allowing the KioskOwner to remove the extension. However, it is the
 * case with any other solution (1) and this way we prevent intentional extension
 * freeze when the owner wants to ruin a trade (2) - eg locking extension while an
 * auction is in progress.
 *
 * Extensions should be crafted carefully, and the KioskOwner should be aware of
 * the risks.
 */
export function storageMut<Ext extends BcsType<any>>(options: StorageMutOptions<Ext>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`, null] satisfies (string | null)[];
	const parameterNames = ['Ext', 'self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'storage_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceArguments<Ext extends BcsType<any>, T extends BcsType<any>> {
	Ext: RawTransactionArgument<Ext>;
	self: RawTransactionArgument<string>;
	item: RawTransactionArgument<T>;
	Policy: RawTransactionArgument<string>;
}
export interface PlaceOptions<Ext extends BcsType<any>, T extends BcsType<any>> {
	package: string;
	arguments:
		| PlaceArguments<Ext, T>
		| [
				Ext: RawTransactionArgument<Ext>,
				self: RawTransactionArgument<string>,
				item: RawTransactionArgument<T>,
				Policy: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Protected action: place an item into the Kiosk. Can be performed by an
 * authorized extension. The extension must have the `place` permission or a `lock`
 * permission.
 *
 * To prevent non-tradable items from being placed into `Kiosk` the method requires
 * a `TransferPolicy` for the placed type to exist.
 */
export function place<Ext extends BcsType<any>, T extends BcsType<any>>(
	options: PlaceOptions<Ext, T>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		null,
		`${options.typeArguments[1]}`,
		null,
	] satisfies (string | null)[];
	const parameterNames = ['Ext', 'self', 'item', 'Policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'place',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LockArguments<Ext extends BcsType<any>, T extends BcsType<any>> {
	Ext: RawTransactionArgument<Ext>;
	self: RawTransactionArgument<string>;
	item: RawTransactionArgument<T>;
	Policy: RawTransactionArgument<string>;
}
export interface LockOptions<Ext extends BcsType<any>, T extends BcsType<any>> {
	package: string;
	arguments:
		| LockArguments<Ext, T>
		| [
				Ext: RawTransactionArgument<Ext>,
				self: RawTransactionArgument<string>,
				item: RawTransactionArgument<T>,
				Policy: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Protected action: lock an item in the Kiosk. Can be performed by an authorized
 * extension. The extension must have the `lock` permission.
 */
export function lock<Ext extends BcsType<any>, T extends BcsType<any>>(
	options: LockOptions<Ext, T>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`${options.typeArguments[0]}`,
		null,
		`${options.typeArguments[1]}`,
		null,
	] satisfies (string | null)[];
	const parameterNames = ['Ext', 'self', 'item', 'Policy'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'lock',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsInstalledArguments {
	self: RawTransactionArgument<string>;
}
export interface IsInstalledOptions {
	package: string;
	arguments: IsInstalledArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check whether an extension of type `Ext` is installed. */
export function isInstalled(options: IsInstalledOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'is_installed',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsEnabledArguments {
	self: RawTransactionArgument<string>;
}
export interface IsEnabledOptions {
	package: string;
	arguments: IsEnabledArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check whether an extension of type `Ext` is enabled. */
export function isEnabled(options: IsEnabledOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'is_enabled',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CanPlaceArguments {
	self: RawTransactionArgument<string>;
}
export interface CanPlaceOptions {
	package: string;
	arguments: CanPlaceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Check whether an extension of type `Ext` can `place` into Kiosk. */
export function canPlace(options: CanPlaceOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'can_place',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CanLockArguments {
	self: RawTransactionArgument<string>;
}
export interface CanLockOptions {
	package: string;
	arguments: CanLockArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Check whether an extension of type `Ext` can `lock` items in Kiosk. Locking also
 * enables `place`.
 */
export function canLock(options: CanLockOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_extension',
			function: 'can_lock',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
