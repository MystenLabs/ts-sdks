/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x3::validator_cap';
export const UnverifiedValidatorOperationCap = new MoveStruct({
	name: `${$moduleName}::UnverifiedValidatorOperationCap`,
	fields: {
		id: bcs.Address,
		authorizer_validator_address: bcs.Address,
	},
});
export const ValidatorOperationCap = new MoveStruct({
	name: `${$moduleName}::ValidatorOperationCap`,
	fields: {
		authorizer_validator_address: bcs.Address,
	},
});
