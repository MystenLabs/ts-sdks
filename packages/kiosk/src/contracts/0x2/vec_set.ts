/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../utils/index.js';
const $moduleName = '0x2::vec_set';
export function VecSet<T0 extends BcsType<any>>(
	...typeParameters: [T0]
): MoveStruct<
	{ contents: ReturnType<typeof bcs.vector<T0>> },
	`0x2::vec_set::VecSet<${T0['name']}>`
> {
	return new MoveStruct({
		name: `${$moduleName}::VecSet<${typeParameters[0].name as T0['name']}>`,
		fields: {
			contents: bcs.vector(typeParameters[0]),
		},
	});
}
