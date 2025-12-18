/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::set_stale_price_threshold';
export const StalePriceThreshold = new MoveStruct({
	name: `${$moduleName}::StalePriceThreshold`,
	fields: {
		threshold: bcs.u64(),
	},
});
