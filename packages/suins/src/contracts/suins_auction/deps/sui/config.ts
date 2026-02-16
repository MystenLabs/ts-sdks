/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
const $moduleName = '0x2::config';
export const Config = new MoveStruct({
	name: `${$moduleName}::Config<phantom WriteCap>`,
	fields: {
		id: bcs.Address,
	},
});
export function SettingData<Value extends BcsType<any>>(...typeParameters: [Value]) {
	return new MoveStruct({
		name: `${$moduleName}::SettingData<${typeParameters[0].name as Value['name']}>`,
		fields: {
			newer_value_epoch: bcs.u64(),
			newer_value: bcs.option(typeParameters[0]),
			older_value_opt: bcs.option(typeParameters[0]),
		},
	});
}
export function Setting<Value extends BcsType<any>>(...typeParameters: [Value]) {
	return new MoveStruct({
		name: `${$moduleName}::Setting<${typeParameters[0].name as Value['name']}>`,
		fields: {
			data: bcs.option(SettingData(typeParameters[0])),
		},
	});
}
