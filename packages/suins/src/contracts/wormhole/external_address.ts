/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import * as bytes32 from './bytes32.js';
const $moduleName =
	'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::external_address';
export const ExternalAddress = new MoveStruct({
	name: `${$moduleName}::ExternalAddress`,
	fields: {
		value: bytes32.Bytes32,
	},
});
