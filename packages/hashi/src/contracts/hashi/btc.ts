/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The hBTC coin type — the Sui-side claim on BTC secured by the bridge. `create`
 * registers the currency (8 decimals, symbol hBTC) with the Sui coin registry
 * during system initialization and returns the treasury and metadata caps, which
 * `hashi::treasury` takes into custody so deposits can mint and withdrawals can
 * burn hBTC against Bitcoin UTXOs.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/hashi::btc';
export const BTC = new MoveStruct({
	name: `${$moduleName}::BTC`,
	fields: {
		id: bcs.Address,
	},
});
