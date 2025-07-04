/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs } from '@mysten/sui/bcs';
export function EpochParams() {
	return bcs.struct('EpochParams', {
		/** The storage capacity of the system. */
		total_capacity_size: bcs.u64(),
		/** The price per unit size of storage. */
		storage_price_per_unit_size: bcs.u64(),
		/** The write price per unit size. */
		write_price_per_unit_size: bcs.u64(),
	});
}
