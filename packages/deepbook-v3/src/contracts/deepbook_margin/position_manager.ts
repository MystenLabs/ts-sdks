/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Position manager is responsible for managing users' positions. It is used to
 * track the supply and loan shares of the users.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as table from './deps/sui/table.js';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@deepbook/margin::position_manager';
export const PositionManager = new MoveStruct({
	name: `${$moduleName}::PositionManager`,
	fields: {
		positions: table.Table,
		extra_fields: vec_map.VecMap(bcs.string(), bcs.u64()),
	},
});
export const Position = new MoveStruct({
	name: `${$moduleName}::Position`,
	fields: {
		shares: bcs.u64(),
		referral: bcs.option(bcs.Address),
	},
});
