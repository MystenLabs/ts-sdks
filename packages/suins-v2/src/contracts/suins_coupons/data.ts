/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@suins/coupons::data';
export const Data = new MoveStruct({
	name: `${$moduleName}::Data`,
	fields: {
		coupons: bag.Bag,
	},
});
