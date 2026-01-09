/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as price_feed from './price_feed.js';
const $moduleName = '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::event';
export const PythInitializationEvent = new MoveStruct({
	name: `${$moduleName}::PythInitializationEvent`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const PriceFeedUpdateEvent = new MoveStruct({
	name: `${$moduleName}::PriceFeedUpdateEvent`,
	fields: {
		price_feed: price_feed.PriceFeed,
		timestamp: bcs.u64(),
	},
});
