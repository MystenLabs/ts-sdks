/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Builder-code lifecycle and attribution events for Predict. */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::builder_code_events';
export const BuilderCodeCreated = new MoveStruct({
	name: `${$moduleName}::BuilderCodeCreated`,
	fields: {
		builder_code_id: bcs.Address,
		owner: bcs.Address,
		builder_code_index: bcs.u64(),
	},
});
export const BuilderCodeSet = new MoveStruct({
	name: `${$moduleName}::BuilderCodeSet`,
	fields: {
		account_id: bcs.Address,
		owner: bcs.Address,
		builder_code_id: bcs.option(bcs.Address),
	},
});
export const BuilderFeesClaimed = new MoveStruct({
	name: `${$moduleName}::BuilderFeesClaimed`,
	fields: {
		builder_code_id: bcs.Address,
		owner: bcs.Address,
		amount: bcs.u64(),
	},
});
