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
export const Vault: MoveStruct<{
    "base_balance": typeof balance.Balance;
    "quote_balance": typeof balance.Balance;
    "deep_balance": typeof balance.Balance;
}> = new MoveStruct({ name: `${$moduleName}::Vault<phantom BaseAsset, phantom QuoteAsset>`, fields: {
        base_balance: balance.Balance,
        quote_balance: balance.Balance,
        deep_balance: balance.Balance
    } });
export const FlashLoan: MoveStruct<{
    "pool_id": typeof bcs.Address;
    "borrow_quantity": ReturnType<typeof bcs.u64>;
    "type_name": typeof type_name.TypeName;
}> = new MoveStruct({ name: `${$moduleName}::FlashLoan`, fields: {
        pool_id: bcs.Address,
        borrow_quantity: bcs.u64(),
        type_name: type_name.TypeName
    } });
export const FlashLoanBorrowed: MoveStruct<{
    "pool_id": typeof bcs.Address;
    "borrow_quantity": ReturnType<typeof bcs.u64>;
    "type_name": typeof type_name.TypeName;
}> = new MoveStruct({ name: `${$moduleName}::FlashLoanBorrowed`, fields: {
        pool_id: bcs.Address,
        borrow_quantity: bcs.u64(),
        type_name: type_name.TypeName
    } });