/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/walrus::epoch_parameters';
export const EpochParams: MoveStruct<{
	total_capacity_size: ReturnType<typeof bcs.u64>;
	storage_price_per_unit_size: ReturnType<typeof bcs.u64>;
	write_price_per_unit_size: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::EpochParams`,
	fields: {
		/** The storage capacity of the system. */
		total_capacity_size: bcs.u64(),
		/** The price per unit size of storage. */
		storage_price_per_unit_size: bcs.u64(),
		/** The write price per unit size. */
		write_price_per_unit_size: bcs.u64(),
	},
});
