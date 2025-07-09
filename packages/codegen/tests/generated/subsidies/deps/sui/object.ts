/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Sui object identifiers */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index.js';
const $moduleName = 'sui::object';
export const UID = new MoveStruct(`${$moduleName}::UID`, {
	id: bcs.Address,
});
