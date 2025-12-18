/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveTuple } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = 'suins::pricing_config';
export const Range = new MoveTuple({
	name: `${$moduleName}::Range`,
	fields: [bcs.u64(), bcs.u64()],
});
