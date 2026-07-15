/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Custody of the coin capabilities for bridge-issued assets. `Treasury` holds the
 * `TreasuryCap` and `MetadataCap` of each registered coin type in an `ObjectBag`
 * keyed by cap type, and exposes package-only mint/burn that emit
 * `Minted`/`Burned` events for off-chain watchers.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as object_bag from './deps/sui/object_bag.js';
const $moduleName = '@local-pkg/hashi::treasury';
export const Treasury = new MoveStruct({
	name: `${$moduleName}::Treasury`,
	fields: {
		objects: object_bag.ObjectBag,
	},
});
export const Key = new MoveStruct({
	name: `${$moduleName}::Key<phantom T>`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const Minted = new MoveStruct({
	name: `${$moduleName}::Minted<phantom T>`,
	fields: {
		amount: bcs.u64(),
	},
});
export const Burned = new MoveStruct({
	name: `${$moduleName}::Burned<phantom T>`,
	fields: {
		amount: bcs.u64(),
	},
});
