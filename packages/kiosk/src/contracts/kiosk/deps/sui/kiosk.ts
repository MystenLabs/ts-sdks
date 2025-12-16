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

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object from './object.js';
const $moduleName = '0x2::kiosk';
export const KioskOwnerCap = new MoveStruct({
	name: `${$moduleName}::KioskOwnerCap`,
	fields: {
		id: object.UID,
		for: bcs.Address,
	},
});
