/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as balance from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/balance.js';
const $moduleName =
	'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::fee_collector';
export const FeeCollector = new MoveStruct({
	name: `${$moduleName}::FeeCollector`,
	fields: {
		fee_amount: bcs.u64(),
		balance: balance.Balance,
	},
});
