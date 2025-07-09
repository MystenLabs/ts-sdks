/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../utils/index.js';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/walrus::storage_accounting';
export const FutureAccounting = new MoveStruct(`${$moduleName}::FutureAccounting`, {
	epoch: bcs.u32(),
	/**
	 * This field stores `used_capacity` for the epoch. Currently, impossible to rename
	 * due to package upgrade limitations.
	 */
	used_capacity: bcs.u64(),
	rewards_to_distribute: balance.Balance(),
});
export const FutureAccountingRingBuffer = new MoveStruct(
	`${$moduleName}::FutureAccountingRingBuffer`,
	{
		current_index: bcs.u32(),
		length: bcs.u32(),
		ring_buffer: bcs.vector(FutureAccounting),
	},
);
