/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Account-domain events: canonical-account lifecycle, app-whitelist governance,
 * and per-coin custody movement. Emitted by the modules that own each transition
 * (`account_registry` for lifecycle, `account` for custody). This is the package's
 * only event surface; indexing lives in follow-up account indexer work.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/account::account_events';
export const AccountCreated = new MoveStruct({
	name: `${$moduleName}::AccountCreated`,
	fields: {
		account_id: bcs.Address,
		wrapper_id: bcs.Address,
		owner: bcs.Address,
		self_owned: bcs.bool(),
	},
});
export const AppAuthorized = new MoveStruct({
	name: `${$moduleName}::AppAuthorized`,
	fields: {
		/** Fully-qualified `App` witness type name. */
		app: bcs.string(),
	},
});
export const AppDeauthorized = new MoveStruct({
	name: `${$moduleName}::AppDeauthorized`,
	fields: {
		app: bcs.string(),
	},
});
export const Deposited = new MoveStruct({
	name: `${$moduleName}::Deposited`,
	fields: {
		account_id: bcs.Address,
		coin_type: bcs.string(),
		amount: bcs.u64(),
		new_balance: bcs.u64(),
	},
});
export const Withdrawn = new MoveStruct({
	name: `${$moduleName}::Withdrawn`,
	fields: {
		account_id: bcs.Address,
		coin_type: bcs.string(),
		amount: bcs.u64(),
		new_balance: bcs.u64(),
	},
});
export const FundsSettled = new MoveStruct({
	name: `${$moduleName}::FundsSettled`,
	fields: {
		account_id: bcs.Address,
		coin_type: bcs.string(),
		amount: bcs.u64(),
		new_balance: bcs.u64(),
	},
});
