/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveTuple } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as vec_map from './deps/sui/vec_map.js';
const $moduleName = '@local-pkg/walrus::pending_values';
const _PendingValuesFields = [vec_map.VecMap(bcs.u32(), bcs.u64())] as const;
export const PendingValues: MoveTuple<typeof _PendingValuesFields> = new MoveTuple({
	name: `${$moduleName}::PendingValues`,
	fields: _PendingValuesFields,
});
