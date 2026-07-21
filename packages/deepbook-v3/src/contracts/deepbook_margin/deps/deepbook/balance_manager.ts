/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The BalanceManager is a shared object that holds all of the balances for
 * different assets. A combination of `BalanceManager` and `TradeProof` are passed
 * into a pool to perform trades. A `TradeProof` can be generated in two ways: by
 * the owner directly, or by any `TradeCap` owner. The owner can generate a
 * `TradeProof` without the risk of equivocation. The `TradeCap` owner, due to it
 * being an owned object, risks equivocation when generating a `TradeProof`.
 * Generally, a high frequency trading engine will trade as the default owner.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as bag from '../sui/bag.js';
import * as vec_set from '../sui/vec_set.js';
const $moduleName = 'deepbook::balance_manager';
export const BalanceManager = new MoveStruct({
	name: `${$moduleName}::BalanceManager`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
		balances: bag.Bag,
		allow_listed: vec_set.VecSet(bcs.Address),
	},
});
export const DepositCap = new MoveStruct({
	name: `${$moduleName}::DepositCap`,
	fields: {
		id: bcs.Address,
		balance_manager_id: bcs.Address,
	},
});
export const WithdrawCap = new MoveStruct({
	name: `${$moduleName}::WithdrawCap`,
	fields: {
		id: bcs.Address,
		balance_manager_id: bcs.Address,
	},
});
export const TradeCap = new MoveStruct({
	name: `${$moduleName}::TradeCap`,
	fields: {
		id: bcs.Address,
		balance_manager_id: bcs.Address,
	},
});
