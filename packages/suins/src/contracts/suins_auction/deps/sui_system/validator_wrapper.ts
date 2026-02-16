/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import * as versioned from '../sui/versioned.js';
const $moduleName = '0x3::validator_wrapper';
export const ValidatorWrapper = new MoveStruct({
	name: `${$moduleName}::ValidatorWrapper`,
	fields: {
		inner: versioned.Versioned,
	},
});
