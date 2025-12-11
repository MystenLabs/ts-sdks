/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as data_source from './data_source.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::set_data_sources';
export const DataSources = new MoveStruct({
	name: `${$moduleName}::DataSources`,
	fields: {
		sources: bcs.vector(data_source.DataSource),
	},
});
