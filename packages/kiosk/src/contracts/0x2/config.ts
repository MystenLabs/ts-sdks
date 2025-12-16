/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { type BcsType, bcs } from '@mysten/sui/bcs';
import * as object from './object.js';
const $moduleName = '0x2::config';
export const Config = new MoveStruct({
	name: `${$moduleName}::Config`,
	fields: {
		id: object.UID,
	},
});
export function SettingData<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return new MoveStruct({
		name: `${$moduleName}::SettingData<${typeParameters[0].name as T0['name']}>`,
		fields: {
			newer_value_epoch: bcs.u64(),
			newer_value: bcs.option(typeParameters[0]),
			older_value_opt: bcs.option(typeParameters[0]),
		},
	});
}
export function Setting<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return new MoveStruct({
		name: `${$moduleName}::Setting<${typeParameters[0].name as T0['name']}>`,
		fields: {
			data: bcs.option(SettingData(typeParameters[0])),
		},
	});
}
