/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The vault holds all of the assets for this pool. At the end of all transaction
 * processing, the vault is used to settle the balances for the user.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as balance from './deps/sui/balance.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@deepbook/core::vault';
export const Vault = new MoveStruct({
	name: `${$moduleName}::Vault<phantom BaseAsset, phantom QuoteAsset>`,
	fields: {
		base_balance: balance.Balance,
		quote_balance: balance.Balance,
		deep_balance: balance.Balance,
	},
});
export const FlashLoan = new MoveStruct({
	name: `${$moduleName}::FlashLoan`,
	fields: {
		pool_id: bcs.Address,
		borrow_quantity: bcs.u64(),
		type_name: type_name.TypeName,
	},
});
export const FlashLoanBorrowed = new MoveStruct({
	name: `${$moduleName}::FlashLoanBorrowed`,
	fields: {
		pool_id: bcs.Address,
		borrow_quantity: bcs.u64(),
		type_name: type_name.TypeName,
	},
});
