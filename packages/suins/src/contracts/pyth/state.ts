/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as data_source from './data_source.js';
import * as consumed_vaas from './deps/0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94/consumed_vaas.js';
import * as _package from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/package.js';
const $moduleName = '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::state';
export const State = new MoveStruct({
	name: `${$moduleName}::State`,
	fields: {
		id: bcs.Address,
		governance_data_source: data_source.DataSource,
		stale_price_threshold: bcs.u64(),
		base_update_fee: bcs.u64(),
		fee_recipient_address: bcs.Address,
		last_executed_governance_sequence: bcs.u64(),
		consumed_vaas: consumed_vaas.ConsumedVAAs,
		upgrade_cap: _package.UpgradeCap,
	},
});
