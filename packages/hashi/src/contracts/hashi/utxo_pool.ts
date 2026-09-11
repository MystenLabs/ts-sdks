/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * On-chain bookkeeping for the bridge's Bitcoin UTXO set. Confirmed deposit
 * outputs and unconfirmed withdrawal change outputs live in `utxo_records` from
 * insertion until the withdrawal that spends them confirms on Bitcoin, after which
 * their IDs move to `spent_utxos` — kept permanently as replay protection so an
 * already-spent outpoint can never be re-inserted.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as bag from './deps/sui/bag.js';
import * as utxo from './utxo.js';
const $moduleName = '@local-pkg/hashi::utxo_pool';
export const UtxoPool = new MoveStruct({
	name: `${$moduleName}::UtxoPool`,
	fields: {
		utxo_records: bag.Bag,
		spent_utxos: bag.Bag,
	},
});
export const UtxoRecord = new MoveStruct({
	name: `${$moduleName}::UtxoRecord`,
	fields: {
		utxo: utxo.Utxo,
		produced_by: bcs.option(bcs.Address),
		spent_by: bcs.option(bcs.Address),
		spent_epoch: bcs.option(bcs.u64()),
	},
});
export const UtxoSpent = new MoveStruct({
	name: `${$moduleName}::UtxoSpent`,
	fields: {
		utxo_id: utxo.UtxoId,
		spent_epoch: bcs.u64(),
	},
});
