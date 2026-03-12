import { bcs, BcsType } from '@mysten/sui/bcs';

import { MoveStruct } from './contracts/utils/index.js';

/** dynamic Field representation */
export function Field<Name extends BcsType<any>, Value extends BcsType<any>>(
	...typeParameters: [Name, Value]
) {
	return new MoveStruct({
		name: `0x2::dynamic_field::Field<${typeParameters[0].name as Name['name']}, ${typeParameters[1].name as Value['name']}>`,
		fields: {
			/**
			 * Determined by the hash of the object ID, the field name value and it's type,
			 * i.e. hash(parent.id || name || Name)
			 */
			id: bcs.Address,
			/** The value for the name of this field */
			name: typeParameters[0],
			/** The value bound to this field */
			value: typeParameters[1],
		},
	});
}
